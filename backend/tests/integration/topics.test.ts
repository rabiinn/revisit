import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/index.ts";
import { reviews, subjects } from "../../src/db/schema.ts";
import { daysFromToday } from "../../src/lib/scheduling.ts";
import { api, loginAs } from "../helpers/auth.ts";
import {
  createQuestion,
  createTopic,
  seedUsers,
} from "../helpers/factories.ts";
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
    expect(
      res.body.topics.map((topic: { name: string }) => topic.name),
    ).toEqual(["Sooner", "Later"]);
  });

  it("returns only due topics when asked", async () => {
    await createTopic(alice.id, { name: "Overdue", dueAt: daysFromToday(-1) });
    await createTopic(alice.id, { name: "Due today", dueAt: daysFromToday(0) });
    await createTopic(alice.id, { name: "Future", dueAt: daysFromToday(3) });

    const res = await agent.get("/api/topics?dueOnly=true");

    expect(
      res.body.topics.map((topic: { name: string }) => topic.name),
    ).toEqual(["Overdue", "Due today"]);
  });

  it("filters by subject", async () => {
    const [databases] = await db
      .insert(subjects)
      .values({ userId: alice.id, name: "Databases" })
      .returning();
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

  it("includes the interval for each rating button", async () => {
    await createTopic(alice.id, { intervalDays: 3 });

    const res = await agent.get("/api/topics");

    expect(res.body.topics[0].reviewOptions).toEqual({
      again: 1,
      hard: 4,
      good: 7,
      easy: 10,
    });
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
  it("schedules the next review from a good rating", async () => {
    const topic = await createTopic(alice.id, {
      intervalDays: 3,
      strength: 50,
    });

    const res = await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "good" });

    expect(res.status).toBe(201);
    expect(res.body.topic).toMatchObject({
      intervalDays: 7,
      strength: 62,
      dueAt: daysFromToday(7).toISOString(),
    });
    expect(res.body.review).toMatchObject({
      rating: "good",
      previousIntervalDays: 3,
      nextIntervalDays: 7,
    });
  });

  it("resets the interval when the topic was forgotten", async () => {
    const topic = await createTopic(alice.id, {
      intervalDays: 12,
      strength: 10,
    });

    const res = await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "again" });

    expect(res.body.topic).toMatchObject({ intervalDays: 1, strength: 5 });
  });

  it("saves a review for every rating", async () => {
    const topic = await createTopic(alice.id);

    await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "hard" });
    await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "easy" });

    const saved = await db
      .select()
      .from(reviews)
      .where(eq(reviews.topicId, topic.id));
    expect(saved.map((review) => review.rating).sort()).toEqual([
      "easy",
      "hard",
    ]);
  });

  it("rejects an unknown rating", async () => {
    const topic = await createTopic(alice.id);

    await agent
      .post(`/api/topics/${topic.id}/reviews`)
      .send({ rating: "perfect" })
      .expect(400);
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
