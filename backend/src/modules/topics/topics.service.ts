import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { questions, reviews, topics } from "../../db/schema.ts";
import { AppError } from "../../lib/errors.ts";
import { recallProbability, reviewOptions, scheduleReview, type MemoryState } from "../../lib/scheduling.ts";
import { findOrCreateSubject } from "../subjects/subjects.service.ts";
import type { CreateReviewInput, ListTopicsQuery, UpdateTopicInput } from "./topics.schemas.ts";

const withLinks = {
  subject: { columns: { id: true, name: true } },
  task: { columns: { id: true, title: true } },
} as const;

function ownedTopic(userId: string, topicId: string) {
  return and(eq(topics.id, topicId), eq(topics.userId, userId));
}

// Adds what the frontend shows for each topic: the memory bar and the rating buttons
function withMemoryInfo<T extends MemoryState>(topic: T, now: Date) {
  return {
    ...topic,
    recallProbability: recallProbability(topic, now),
    reviewOptions: reviewOptions(topic, now),
  };
}

export async function listTopics(userId: string, query: ListTopicsQuery) {
  const now = new Date();
  const rows = await db.query.topics.findMany({
    where: and(
      eq(topics.userId, userId),
      query.subjectId ? eq(topics.subjectId, query.subjectId) : undefined,
      query.dueOnly ? lte(topics.dueAt, new Date()) : undefined,
    ),
    with: withLinks,
    orderBy: [asc(topics.dueAt), asc(topics.name)],
  });

  return rows.map((topic) => withMemoryInfo(topic, now));
}

export async function getTopic(userId: string, topicId: string) {
  const topic = await db.query.topics.findFirst({
    where: ownedTopic(userId, topicId),
    with: {
      ...withLinks,
      questions: { orderBy: [asc(questions.createdAt)] },
      reviews: { orderBy: [desc(reviews.reviewedAt)], limit: 10 },
    },
  });

  if (!topic) throw new AppError(404, "Topic not found");
  return withMemoryInfo(topic, new Date());
}

export async function updateTopic(userId: string, topicId: string, input: UpdateTopicInput) {
  await db.transaction(async (tx) => {
    let subjectId: string | null | undefined;
    if (input.subjectName === null) {
      subjectId = null;
    } else if (input.subjectName) {
      subjectId = (await findOrCreateSubject(tx, userId, input.subjectName)).id;
    }

    const [updated] = await tx
      .update(topics)
      .set({
        name: input.name,
        note: input.note === undefined ? undefined : input.note || null,
        subjectId,
      })
      .where(ownedTopic(userId, topicId))
      .returning({ id: topics.id });

    if (!updated) throw new AppError(404, "Topic not found");
  });

  return getTopic(userId, topicId);
}

export async function deleteTopic(userId: string, topicId: string) {
  const [deleted] = await db.delete(topics).where(ownedTopic(userId, topicId)).returning({ id: topics.id });

  if (!deleted) throw new AppError(404, "Topic not found");
}

export async function reviewTopic(userId: string, topicId: string, input: CreateReviewInput) {
  return db.transaction(async (tx) => {
    const now = new Date();
    // Lock the row so simultaneous reviews can't overwrite each other
    const [topic] = await tx.select().from(topics).where(ownedTopic(userId, topicId)).for("update");

    if (!topic) throw new AppError(404, "Topic not found");

    if (input.questionId) {
      const question = await tx.query.questions.findFirst({
        where: and(eq(questions.id, input.questionId), eq(questions.topicId, topic.id)),
        columns: { id: true },
      });
      if (!question) throw new AppError(400, "Question does not belong to this topic");
    }

    const { memory, log } = scheduleReview(topic, input.rating, now);

    const [updated] = await tx.update(topics).set(memory).where(eq(topics.id, topic.id)).returning();

    const [review] = await tx
      .insert(reviews)
      .values({
        topicId: topic.id,
        questionId: input.questionId,
        ...log,
        scheduledDays: memory.scheduledDays,
      })
      .returning();

    if (!updated || !review) throw new Error("Review could not be saved");
    return { topic: withMemoryInfo(updated, now), review };
  });
}
