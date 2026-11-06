import { afterAll, beforeEach } from "vitest";
import { pool } from "../../src/db/index.ts";
import { env } from "../../src/env.ts";
import { assertTestDatabase } from "../helpers/assertTestDatabase.ts";
import { resetDatabase } from "../helpers/db.ts";

// Runs inside every test file, before its tests
assertTestDatabase(env.DATABASE_URL);

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await pool.end();
});
