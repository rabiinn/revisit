import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env.ts";
import * as schema from "./schema.ts";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  min: env.DATABASE_POOL_MIN,
  max: env.DATABASE_POOL_MAX,
});

export const db = drizzle({ client: pool, schema });

export type DbTansaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
