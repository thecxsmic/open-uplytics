#!/usr/bin/env node
/**
 * Idempotent demo workspace + 30 days of sample analytics/uptime.
 * Usage: npm run db:demo
 * Opening /demo and the hourly rollup also fill missing sample hours.
 */
import { loadProjectEnv } from "./load-env.mjs";
import { createDb, exec as run, toPg } from "./pg.mjs";

loadProjectEnv();

const { seedDemoWorkspace } = await import("../src/lib/demo-seed.js");
const pool = createDb();

try {
  await seedDemoWorkspace(
    {
      query: async (sql, args = []) => {
        const result = await run(pool, sql, args);
        return result.rows;
      },
      batch: async (statements) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          for (const statement of statements) {
            await client.query(toPg(statement.sql), statement.args || []);
          }
          await client.query("COMMIT");
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      },
    },
    { log: (line) => console.log(line) },
  );
} finally {
  await pool.end();
}
