import { db } from "../../src/db/index.ts";
import { users, questions, topics } from "../../src/db/schema.ts";
import { hashPassword } from "../../src/lib/password.ts";
import { SEED_USERS, type SeedUserKey } from "../fixtures/users.ts";
import { tasks } from "../../src/db/schema.ts";

export type TestUser = { id: string; email: string; password: string };
type TaskOverrides = Partial<Omit<typeof tasks.$inferInsert, "userId">>;

// Argon2 is deliberately slow, so hash each password only once per test file
const hashCache = new Map<string, Promise<string>>();

function cachedHash(password: string) {
  let hash = hashCache.get(password);
  if (!hash) {
    hash = hashPassword(password);
    hashCache.set(password, hash);
  }
  return hash;
}

let userCount = 0;

export async function createUser(
  overrides: { email?: string; password?: string } = {},
): Promise<TestUser> {
  userCount += 1;
  const email = overrides.email ?? `user${userCount}@example.com`;
  const password = overrides.password ?? "password-123";

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await cachedHash(password) })
    .returning({ id: users.id, email: users.email });

  if (!user) throw new Error("Failed to create test user");
  return { ...user, password };
}

export async function seedUsers() {
  const entries = await Promise.all(
    Object.entries(SEED_USERS).map(
      async ([key, data]) => [key, await createUser(data)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<SeedUserKey, TestUser>;
}

export async function createTask(
  userId: string,
  overrides: TaskOverrides = {},
) {
  const [task] = await db
    .insert(tasks)
    .values({ userId, title: "Read chapter 1", ...overrides })
    .returning();

  if (!task) throw new Error("Failed to create test task");
  return task;
}

type TopicOverrides = Partial<Omit<typeof topics.$inferInsert, "userId">>;

export async function createTopic(
  userId: string,
  overrides: TopicOverrides = {},
) {
  const [topic] = await db
    .insert(topics)
    .values({ userId, name: "Hash joins", dueAt: new Date(), ...overrides })
    .returning();

  if (!topic) throw new Error("Failed to create test topic");
  return topic;
}

type QuestionOverrides = Partial<
  Omit<typeof questions.$inferInsert, "topicId">
>;

export async function createQuestion(
  topicId: string,
  overrides: QuestionOverrides = {},
) {
  const [question] = await db
    .insert(questions)
    .values({
      topicId,
      question: "How does a hash join work?",
      answer:
        "It builds a hash table from one input, then probes it with the other.",
      ...overrides,
    })
    .returning();

  if (!question) throw new Error("Failed to create test question");
  return question;
}
