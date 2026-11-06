import { migrate } from "drizzle-orm/node-postgres/migrator";
import { assertTestDatabase } from "../helpers/assertTestDatabase.ts";
import { env } from "../../src/env.ts";
import { db, pool } from "../../src/db/index.ts";

export default async function setup() {
  assertTestDatabase(env.DATABASE_URL);

  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
