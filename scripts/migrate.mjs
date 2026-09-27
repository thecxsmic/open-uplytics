import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadProjectEnv } from "./load-env.mjs";
import { createDb } from "./pg.mjs";

loadProjectEnv();

const pool = createDb();
const sql = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "db", "schema.sql"),
  "utf8",
);

const statements = sql
  .split(";")
  .map((s) =>
    s
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("--"))
      .join("\n")
      .trim(),
  )
  .filter(Boolean);

for (const statement of statements) {
  await pool.query(statement);
  console.log("ok:", statement.slice(0, 72).replace(/\s+/g, " "));
}

await pool.end();
console.log("Postgres schema applied.");
