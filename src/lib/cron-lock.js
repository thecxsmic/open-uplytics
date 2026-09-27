import { getPool, texecute, tquery } from "@/lib/db";

function lockKey(name) {
  let hash = 0;
  for (const char of name) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return hash;
}

async function markStart(name) {
  await texecute(
    `INSERT INTO cron_jobs (name, last_started_at, last_error)
     VALUES (?, ?, NULL)
     ON CONFLICT (name) DO UPDATE SET
       last_started_at = EXCLUDED.last_started_at,
       last_error = NULL`,
    [name, Date.now()],
  );
}

async function markFinish(name, result, error) {
  await texecute(
    `INSERT INTO cron_jobs (name, last_finished_at, last_ok, last_error, last_result)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (name) DO UPDATE SET
       last_finished_at = EXCLUDED.last_finished_at,
       last_ok = EXCLUDED.last_ok,
       last_error = EXCLUDED.last_error,
       last_result = EXCLUDED.last_result`,
    [
      name,
      Date.now(),
      error ? 0 : 1,
      error ? String(error.message || error).slice(0, 500) : null,
      result ? JSON.stringify(result).slice(0, 2000) : null,
    ],
  );
}

export async function withCronLock(name, fn) {
  const client = await getPool().connect();
  let locked = false;
  try {
    const attempt = await client.query("SELECT pg_try_advisory_lock($1) AS locked", [lockKey(name)]);
    locked = Boolean(attempt.rows[0]?.locked);
    if (!locked) return { skipped: true, reason: "already running" };
    await markStart(name);
    try {
      const result = await fn();
      await markFinish(name, result, null);
      return result;
    } catch (error) {
      await markFinish(name, null, error);
      throw error;
    }
  } finally {
    if (locked) {
      await client.query("SELECT pg_advisory_unlock($1)", [lockKey(name)]).catch(() => {});
    }
    client.release();
  }
}

export async function readCronJobs() {
  return tquery("SELECT * FROM cron_jobs ORDER BY name ASC");
}
