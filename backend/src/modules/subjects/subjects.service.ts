import { eq, asc, and, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { subjects } from "../../db/schema.ts";

export function listSubjects(userId: string) {
  return db.query.subjects.findMany({
    where: eq(subjects.userId, userId),
    columns: { id: true, name: true },
    orderBy: asc(subjects.name),
  });
}

export async function findOrCreateSubject(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  name: string,
) {
  // Insert first and handle conflict(safer than checking first and then inserting)

  const [created] = await tx
    .insert(subjects)
    .values({ userId, name })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const existing = await tx.query.subjects.findFirst({
    where: and(
      eq(subjects.userId, userId),
      sql`lower(${subjects.name}) = lower(${name})`,
    ),
  });

  if (!existing) {
    throw new Error(`Subject ${name} couldnot be found or created`);
  }

  return existing;
}
