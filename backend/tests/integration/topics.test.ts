import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/index.ts";
import { reviews, subjects } from "../../src/db/schema.ts";
import { daysFromToday } from "../../src/lib/scheduling.ts";
import { api, loginAs } from "../helpers/auth.ts";
import { createQuestion, createTopic, seedUsers } from "../helpers/factories.ts";
import type { TestUser } from "../helpers/factories.ts";

type Agent = Awaited<ReturnType<typeof loginAs>>;

let alice: TestUser;
let bob: TestUser;
let agent: Agent;

beforeEach(async () => {
  ({ alice, bob } = await seedUsers());
  agent = await loginAs(alice);
});

it("requires authentication", async () => {
  await api().get("/api/topics").expect(401);
});

describe("GET /api/topics", () => {
  it("returns the user's own topics, soonest due first", async () => {
    await createTopic(alice.id, { name: "Later", dueAt: daysFromToday(5) });
    await createTopic(alice.id, { name: "Sooner", dueAt: daysFromToday(1) });
    await createTopic(bob.id, { name: "Bob's topic" });

    const res = await agent.get("/api/topics");

    expect(res.status).toBe(200);
    expect(res.body.topics.map((topic: { name: string }) => topic.name)).toEqual(["Sooner", "Later"]);
  });

  it("returns only due topics when asked", async () => {
    await createTopic(alice.id, { name: "Overdue", dueAt: daysFromToday(-1) });
    await createTopic(alice.id, { name: "Due today", dueAt: daysFromToday(0) });
    await createTopic(alice.id, { name: "Future", dueAt: daysFromToday(3) });

    const res = await agent.get("/api/topics?dueOnly=true");

    expect(res.body.topics.map((topic: { name: string }) => topic.name)).toEqual(["Overdue", "Due today"]);
  });

  it("filters by subject", async () => {
    const [databases] = await db.insert(subjects).values({ userId: alice.id, name: "Databases" }).returning();
    await createTopic(alice.id, {
      name: "Hash joins",
      subjectId: databases!.id,
    });
    await createTopic(alice.id, { name: "Deadlocks" });

    const res = await agent.get(`/api/topics?subjectId=${databases!.id}`);

    expect(res.body.topics).toHaveLength(1);
    expect(res.body.topics[0]).toMatchObject({
      name: "Hash joins",
      subject: { name: "Databases" },
    });
  });

  it("includes FSRS's rating options and the chance of remembering", async () => {
    await createTopic(alice.id);

    const res = await agent.get("/api/topics");
    const [topic] = res.body.topics;

    const { again, hard, good, easy } = topic.reviewOptions;
    expect(again).toBeGreaterThanOrEqual(1);
    expect(again).toBeLessThanOrEqual(hard);
    expect(hard).toBeLessThanOrEqual(good);
    expect(good).toBeLessThanOrEqual(easy);

    expect(topic.recallProbability).toBeGreaterThan(0);
    expect(topic.recallProbability).toBeLessThanOrEqual(1);
    expect(topic).not.toHaveProperty("strength");
  });

  it("shows a lower chance of remembering for topics studied longer ago", async () => {
    await createTopic(alice.id, { name: "Fresh" });
    await createTopic(alice.id, { name: "Older", lastReviewAt: daysFromToday(-10) });

    const res = await agent.get("/api/topics");
    const recall = Object.fromEntries(
      res.body.topics.map((topic: { name: string; recallProbability: number }) => [
        topic.name,
        topic.recallProbability,
      ]),
    );

    expect(recall.Older).toBeLessThan(recall.Fresh);
  });
});

describe("topic ownership", () => {
  it("returns 404 for another user's topic", async () => {
    const bobsTopic = await createTopic(bob.id);
    const path = `/api/topics/${bobsTopic.id}`;

    await agent.get(path).expect(404);
    await agent.patch(path).send({ name: "Changed" }).expect(404);
    await agent.delete(path).expect(404);
    await agent.post(`${path}/reviews`).send({ rating: "good" }).expect(404);
  });
});

describe("GET /api/topics/:id", () => {
  it("returns the topic with its questions", async () => {
    const topic = await createTopic(alice.id);
    await createQuestion(topic.id);

    const res = await agent.get(`/api/topics/${topic.id}`);

    expect(res.status).toBe(200);
    expect(res.body.topic.questions).toHaveLength(1);
    expect(res.body.topic.reviews).toEqual([]);
  });
});

describe("PATCH /api/topics/:id", () => {
  it("updates the name and note", async () => {
    const topic = await createTopic(alice.id);

    const res = await agent
      .patch(`/api/topics/${topic.id}`)
      .send({ name: "Sort-merge joins", note: "Compare with hash joins" });

    expect(res.status).toBe(200);
    expect(res.body.topic).toMatchObject({
      name: "Sort-merge joins",
      note: "Compare with hash joins",
    });
  });
});

describe("DELETE /api/topics/:id", () => {
  it("deletes the topic", async () => {
    const topic = await createTopic(alice.id);

    await agent.delete(`/api/topics/${topic.id}`).expect(204);
    await agent.get(`/api/topics/${topic.id}`).expect(404);
  });
});

describe("POST /api/topics/:id/reviews", () => {
  it("rates a recall with FSRS, matching what the button showed", async () => {
    const topic = await createTopic(alice.id);
    const { reviewOptions } = (await agent.get(`/api/topics/${topic.id}`)).body.topic;

    const res = await agent.post(`/api/topics/${topic.id}/reviews`).send({ rating: "good" });

    expect(res.status).toBe(201);
    expect(res.body.topic).toMatchObject({
      reps: topic.reps + 1,
      lapses: 0,
      scheduledDays: reviewOptions.good,
      dueAt: daysFromToday(reviewOptions.good).toISOString(),
    });

    // The log keeps the state from before the review, and the interval it chose
    expect(res.body.review).toMatchObject({
      rating: "good",
      stabilityBefore: topic.stability,
      scheduledDaysBefore: topic.scheduledDays,
      scheduledDays: reviewOptions.good,
    });
  });

  it("counts a forgotten topic as a lapse and brings it back tomorrow", async () => {
    const topic = await createTopic(alice.id);

    const res = await agent.post(`/api/topics/${topic.id}/reviews`).send({ rating: "again" });

    expect(res.body.topic).toMatchObject({
      lapses: 1,
      scheduledDays: 1,
      dueAt: daysFromToday(1).toISOString(),
    });
  });

  it("saves a review for every rating", async () => {
    const topic = await createTopic(alice.id);

    await agent.post(`/api/topics/${topic.id}/reviews`).send({ rating: "hard" });
    await agent.post(`/api/topics/${topic.id}/reviews`).send({ rating: "easy" });

    const saved = await db.select().from(reviews).where(eq(reviews.topicId, topic.id));
    expect(saved.map((review) => review.rating).sort()).toEqual(["easy", "hard"]);
  });

  it("rejects an unknown rating", async () => {
    const topic = await createTopic(alice.id);

    await agent.post(`/api/topics/${topic.id}/reviews`).send({ rating: "perfect" }).expect(400);
  });

  it("rejects a question from a different topic", async () => {
    const topic = await createTopic(alice.id);
    const otherTopic = await createTopic(alice.id, { name: "Deadlocks" });
    const otherQuestion = await createQuestion(otherTopic.id);

    await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "good", questionId: otherQuestion.id })
      .expect(400);
  });
});
