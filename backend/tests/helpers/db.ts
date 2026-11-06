import { sql } from "drizzle-orm";
import { db } from "../../src/db/index.ts";

// Empties every table, including tables added later
export async function resetDatabase() {
  const result = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );

  const tables = result.rows.map((row) => `"${row.tablename}"`).join(", ");
  if (tables) {
    await db.execute(
      sql.raw(`truncate table ${tables} restart identity cascade`),
    );
  }
}
