import { beforeEach, describe, expect, it } from "vitest";
import { MAX_FIRST_INTERVAL_DAYS } from "../../src/lib/scheduling.ts";
import { api, loginAs } from "../helpers/auth.ts";
import { createTask, seedUsers } from "../helpers/factories.ts";
import type { TestUser } from "../helpers/factories.ts";

type Agent = Awaited<ReturnType<typeof loginAs>>;

const PATH = "/api/scheduling/first-review-options";

let alice: TestUser;
let agent: Agent;

beforeEach(async () => {
  ({ alice } = await seedUsers());
  agent = await loginAs(alice);
});

describe("GET /api/scheduling/first-review-options", () => {
  it("requires authentication", async () => {
    await api().get(PATH).expect(401);
  });

  it("suggests later first reviews for more confident topics, within a week", async () => {
    const res = await agent.get(PATH);

    expect(res.status).toBe(200);
    const { shaky, okay, solid } = res.body.options;

    expect(shaky).toBeGreaterThanOrEqual(1);
    expect(shaky).toBeLessThanOrEqual(okay);
    expect(okay).toBeLessThanOrEqual(solid);
    expect(solid).toBeLessThanOrEqual(MAX_FIRST_INTERVAL_DAYS);
  });

  it.each(["shaky", "okay", "solid"] as const)(
    "matches what finishing a task with %s confidence schedules",
    async (confidence) => {
      const { options } = (await agent.get(PATH)).body;
      const task = await createTask(alice.id);

      const res = await agent.post(`/api/tasks/${task.id}/complete`).send({ topics: ["Hash joins"], confidence });

      expect(res.body.topics[0].scheduledDays).toBe(options[confidence]);
    },
  );
});
