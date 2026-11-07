import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../src/db/index.ts";
import { tasks, topics } from "../../src/db/schema.ts";
import { daysFromToday } from "../../src/lib/scheduling.ts";
import { api, loginAs } from "../helpers/auth.ts";
import { createTask, seedUsers } from "../helpers/factories.ts";
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
  await api().get("/api/tasks").expect(401);
});

describe("POST /api/tasks", () => {
  it("creates a task with a subject", async () => {
    const res = await agent.post("/api/tasks").send({
      title: "Read DBMS chapter 7",
      subjectName: "Databases",
      estimatedMinutes: 45,
    });

    expect(res.status).toBe(201);
    expect(res.body.task).toMatchObject({
      title: "Read DBMS chapter 7",
      estimatedMinutes: 45,
      completedAt: null,
      subject: { name: "Databases" },
    });
  });

  it("reuses a subject regardless of letter case", async () => {
    const first = await agent
      .post("/api/tasks")
      .send({ title: "Read chapter 7", subjectName: "Databases" });
    const second = await agent
      .post("/api/tasks")
      .send({ title: "Read chapter 8", subjectName: "  databases " });
    console.log(second.body);
    expect(second.body.task.subject.id).toBe(first.body.task.subject.id);

    const subjects = await agent.get("/api/subjects");
    expect(subjects.body.subjects).toHaveLength(1);
  });

  it("rejects an empty title", async () => {
    await agent.post("/api/tasks").send({ title: "   " }).expect(400);
  });
});

describe("GET /api/tasks", () => {
  it("filters by status", async () => {
    await createTask(alice.id, { title: "Open task" });
    await createTask(alice.id, { title: "Done task", completedAt: new Date() });

    const res = await agent.get("/api/tasks?status=open");

    expect(res.status).toBe(200);
    expect(res.body.tasks.map((task: { title: string }) => task.title)).toEqual(
      ["Open task"],
    );
  });

  it("rejects an unknown status", async () => {
    await agent.get("/api/tasks?status=unknown").expect(400);
  });

  it("only returns the user's own tasks", async () => {
    await createTask(bob.id, { title: "Bob's task" });

    const res = await agent.get("/api/tasks");
    expect(res.body.tasks).toEqual([]);
  });
});

describe("task ownership", () => {
  it("returns 404 for another user's task", async () => {
    const bobsTask = await createTask(bob.id);
    const path = `/api/tasks/${bobsTask.id}`;

    await agent.get(path).expect(404);
    await agent.patch(path).send({ title: "Changed" }).expect(404);
    await agent.delete(path).expect(404);
    await agent.post(`${path}/complete`).send({}).expect(404);

    const unchanged = await db.query.tasks.findFirst({
      where: eq(tasks.id, bobsTask.id),
    });
    expect(unchanged?.title).toBe(bobsTask.title);
  });

  it("returns 400 for an invalid task ID", async () => {
    await agent.get("/api/tasks/not-a-uuid").expect(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("updates fields and can remove the subject", async () => {
    const created = await agent
      .post("/api/tasks")
      .send({ title: "Old title", subjectName: "Databases" });

    const res = await agent
      .patch(`/api/tasks/${created.body.task.id}`)
      .send({ title: "New title", subjectName: null });

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({ title: "New title", subject: null });
  });

  it("rejects an empty update", async () => {
    const task = await createTask(alice.id);
    await agent.patch(`/api/tasks/${task.id}`).send({}).expect(400);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes the task", async () => {
    const task = await createTask(alice.id);

    await agent.delete(`/api/tasks/${task.id}`).expect(204);
    await agent.get(`/api/tasks/${task.id}`).expect(404);
  });

  it("keeps the topics learned from the task", async () => {
    const task = await createTask(alice.id);
    await agent
      .post(`/api/tasks/${task.id}/complete`)
      .send({ topics: ["Hash joins"] })
      .expect(200);

    await agent.delete(`/api/tasks/${task.id}`).expect(204);

    const remaining = await db
      .select()
      .from(topics)
      .where(eq(topics.userId, alice.id));
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.taskId).toBeNull();
  });
});

describe("POST /api/tasks/:id/complete", () => {
  it("completes the task and schedules its topics", async () => {
    const task = await createTask(alice.id);

    const res = await agent.post(`/api/tasks/${task.id}/complete`).send({
      topics: ["Hash joins", "Query optimizer"],
      confidence: "shaky",
      note: "I mix up build and probe",
    });

    expect(res.status).toBe(200);
    expect(res.body.task.completedAt).not.toBeNull();
    expect(res.body.topics).toHaveLength(2);

    for (const topic of res.body.topics) {
      expect(topic).toMatchObject({
        taskId: task.id,
        strength: 25,
        intervalDays: 1,
        note: "I mix up build and probe",
        dueAt: daysFromToday(1).toISOString(),
      });
    }
  });

  it("lets the user choose the first review date", async () => {
    const task = await createTask(alice.id);

    const res = await agent
      .post(`/api/tasks/${task.id}/complete`)
      .send({ topics: ["Hash joins"], reviewInDays: 5 });

    expect(res.body.topics[0]).toMatchObject({
      intervalDays: 5,
      dueAt: daysFromToday(5).toISOString(),
    });
  });

  it("completes a task without topics", async () => {
    const task = await createTask(alice.id);

    const res = await agent.post(`/api/tasks/${task.id}/complete`).send({});

    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([]);
  });

  it("rejects completing a task twice", async () => {
    const task = await createTask(alice.id);

    await agent.post(`/api/tasks/${task.id}/complete`).send({}).expect(200);
    await agent.post(`/api/tasks/${task.id}/complete`).send({}).expect(409);
  });

  it("rejects duplicate topic names", async () => {
    const task = await createTask(alice.id);

    await agent
      .post(`/api/tasks/${task.id}/complete`)
      .send({ topics: ["Joins", "joins"] })
      .expect(400);
  });
});

describe("POST /api/tasks/:id/reopen", () => {
  it("reopens the task and keeps its topics", async () => {
    const task = await createTask(alice.id);
    await agent
      .post(`/api/tasks/${task.id}/complete`)
      .send({ topics: ["Hash joins"] })
      .expect(200);

    const res = await agent.post(`/api/tasks/${task.id}/reopen`);

    expect(res.status).toBe(200);
    expect(res.body.task.completedAt).toBeNull();

    const kept = await db
      .select()
      .from(topics)
      .where(eq(topics.taskId, task.id));
    expect(kept).toHaveLength(1);
  });
});
