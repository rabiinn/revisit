import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { tasks, topics, reviews } from "../../db/schema.ts";
import { AppError } from "../../lib/errors.ts";
import { scheduleFirstReview } from "../../lib/scheduling.ts";
import { findOrCreateSubject } from "../subjects/subjects.service.ts";
import type { CompleteTaskInput, CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./tasks.schemas.ts";

const withSubject = { subject: { columns: { id: true, name: true } } } as const;

// Every query includes the user ID, so users can only reach their own tasks
function ownedTask(userId: string, taskId: string) {
  return and(eq(tasks.id, taskId), eq(tasks.userId, userId));
}

export function listTasks(userId: string, status: ListTasksQuery["status"]) {
  // If status == all, returned all tasks(undefined here means drizzle will discard the condition)
  const statusFilter =
    status === "open" ? isNull(tasks.completedAt) : status === "completed" ? isNotNull(tasks.completedAt) : undefined;

  return db.query.tasks.findMany({
    where: and(eq(tasks.userId, userId), statusFilter),
    with: withSubject,
    // Open tasks first, then newest first
    orderBy: [sql`${tasks.completedAt} is not null`, desc(tasks.createdAt)],
  });
}

export async function getTask(userId: string, taskId: string) {
  const task = await db.query.tasks.findFirst({
    where: ownedTask(userId, taskId),
    with: withSubject,
  });

  if (!task) throw new AppError(404, "Task not found");
  return task;
}

export async function createTask(userId: string, input: CreateTaskInput) {
  const taskId = await db.transaction(async (tx) => {
    const subject = input.subjectName ? await findOrCreateSubject(tx, userId, input.subjectName) : undefined;

    const [task] = await tx
      .insert(tasks)
      .values({
        userId,
        title: input.title,
        estimatedMinutes: input.estimatedMinutes,
        subjectId: subject?.id,
      })
      .returning({ id: tasks.id });

    if (!task) throw new Error("Task insert returned no row");
    return task.id;
  });

  return getTask(userId, taskId);
}
export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput) {
  await db.transaction(async (tx) => {
    let subjectId: string | null | undefined;
    if (input.subjectName === null) {
      subjectId = null;
    } else if (input.subjectName) {
      subjectId = (await findOrCreateSubject(tx, userId, input.subjectName)).id;
    }

    // Drizzle skips undefined values, so missing fields stay unchanged
    const [updated] = await tx
      .update(tasks)
      .set({
        title: input.title,
        estimatedMinutes: input.estimatedMinutes,
        subjectId,
      })
      .where(ownedTask(userId, taskId))
      .returning({ id: tasks.id });

    // Throwing here also rolls back a subject created above
    if (!updated) throw new AppError(404, "Task not found");
  });

  return getTask(userId, taskId);
}

export async function deleteTask(userId: string, taskId: string) {
  const [deleted] = await db.delete(tasks).where(ownedTask(userId, taskId)).returning({ id: tasks.id });

  if (!deleted) throw new AppError(404, "Task not found");
}

export async function completeTask(userId: string, taskId: string, input: CompleteTaskInput) {
  const createdTopics = await db.transaction(async (tx) => {
    // One timestamp for the whole action, so the task and it's topics match exactly
    const now = new Date();

    // The completedAt check makes two simultaneous requests safe
    const [task] = await tx
      .update(tasks)
      .set({
        completedAt: now,
      })
      .where(and(ownedTask(userId, taskId), isNull(tasks.completedAt)))
      .returning();

    if (!task) {
      const exists = await tx.query.tasks.findFirst({
        where: ownedTask(userId, taskId),
        columns: { id: true },
      });

      throw exists ? new AppError(409, "Task is already completed") : new AppError(404, "Task not found");
    }

    if (input.topics.length === 0) return [];

    // Every topic from this task gets the same confidence, so schedule once

    const { memory, log } = scheduleFirstReview(input.confidence, now, input.reviewInDays);
    const created = await tx
      .insert(topics)
      .values(
        input.topics.map((name) => ({
          userId,
          taskId,
          subjectId: task.subjectId,
          name,
          note: input.note || null,
          ...memory,
        })),
      )
      .returning();

    // Your confidence was a real first rating, so log it like any other review
    await tx.insert(reviews).values(
      created.map((topic) => ({
        topicId: topic.id,
        ...log,
        scheduledDays: memory.scheduledDays,
      })),
    );

    return created;
  });

  return { task: await getTask(userId, taskId), topics: createdTopics };
}

export async function reopenTask(userId: string, taskId: string) {
  const [task] = await db
    .update(tasks)
    .set({ completedAt: null })
    .where(ownedTask(userId, taskId))
    .returning({ id: tasks.id });

  if (!task) throw new AppError(404, "Task not found");
  return getTask(userId, taskId);
}
