import pg from "pg";

pg.types.setTypeParser(20, (value) => Number(value));

export function toPg(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  return new pg.Pool({ connectionString: url });
}

export async function exec(pool, sql, args = []) {
  return pool.query(toPg(sql), args);
}
