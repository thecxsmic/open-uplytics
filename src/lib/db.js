import pg from "pg";

const globalForDb = globalThis;

pg.types.setTypeParser(20, (value) => Number(value));

export function getPool() {
  if (!globalForDb.pool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.pool = new pg.Pool({ connectionString: url });
  }
  return globalForDb.pool;
}

export function toPg(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export async function tquery(sql, args = []) {
  const result = await getPool().query(toPg(sql), args);
  return result.rows;
}

export async function texecute(sql, args = []) {
  const result = await getPool().query(toPg(sql), args);
  return { rowsAffected: result.rowCount, rows: result.rows };
}

export async function tbatch(statements) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      const sql = typeof statement === "string" ? statement : statement.sql;
      const args = typeof statement === "string" ? [] : statement.args || [];
      await client.query(toPg(sql), args);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export function row(rows) {
  return rows[0] || null;
}

export function jsonCol(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function logActivity(workspaceId, userId, action, meta = {}) {
  const { id } = await import("@/lib/ids");
  await texecute(
    `INSERT INTO activity_log (id, workspace_id, user_id, action, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id("act"), workspaceId, userId || null, action, JSON.stringify(meta), Date.now()],
  );
}
