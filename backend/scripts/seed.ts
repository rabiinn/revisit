import { sql } from "drizzle-orm";
import { db, pool } from "../src/db/index.ts";
import { reviews, subjects, tasks, topics, users } from "../src/db/schema.ts";
import { env, isProd } from "../src/env.ts";
import { hashPassword } from "../src/lib/password.ts";
import { daysFromToday, scheduleFirstReview, scheduleReview } from "../src/lib/scheduling.ts";
import type { Confidence, ReviewRating } from "../src/lib/scheduling.ts";

const DEMO_EMAIL = "demo@revisit.dev";
const DEMO_PASSWORD = "demo-password-123";

function assertLocalDatabase(url: string) {
  const { hostname } = new URL(url);
  if (isProd() || !["127.0.0.1", "localhost"].includes(hostname)) {
    throw new Error(`Refusing to seed "${hostname}". The seed only runs against a local database.`);
  }
}

// 10:00 UTC on the day that many days ago, a realistic time to study
function daysAgo(days: number) {
  return new Date(daysFromToday(-days).getTime() + 10 * 60 * 60 * 1000);
}

type SeedTopic = {
  name: string;
  note?: string;
  confidence: Confidence;
  reviews?: { daysAgo: number; rating: ReviewRating }[];
};

type SeedTask = {
  title: string;
  subject: string;
  minutes: number;
  completedDaysAgo?: number;
  topics?: SeedTopic[];
};

const SUBJECTS = ["Databases", "Algorithms", "Operating Systems"];

const TASKS: SeedTask[] = [
  // Open tasks: what's planned next
  { title: "Read DBMS chapter 8: Joins", subject: "Databases", minutes: 45 },
  { title: "Solve 3 shortest-path exercises", subject: "Algorithms", minutes: 30 },
  { title: "Watch OS lecture 10: File systems", subject: "Operating Systems", minutes: 60 },

  // Completed tasks, with the topics they produced and every review since
  {
    title: "Read DBMS chapter 5: Transactions",
    subject: "Databases",
    minutes: 45,
    completedDaysAgo: 20,
    topics: [
      {
        name: "Transaction isolation levels",
        note: "Learn one anomaly example per level",
        confidence: "okay",
        reviews: [{ daysAgo: 16, rating: "good" }],
      },
    ],
  },
  {
    title: "Read DBMS chapter 6: Indexes",
    subject: "Databases",
    minutes: 45,
    completedDaysAgo: 3,
    topics: [{ name: "B+ tree indexes", note: "Compare with plain B trees", confidence: "shaky" }],
  },
  {
    title: "Read DBMS chapter 7: Query processing",
    subject: "Databases",
    minutes: 45,
    completedDaysAgo: 4,
    topics: [
      { name: "Hash joins", note: "I keep mixing up build and probe phases", confidence: "okay" },
      { name: "Query optimizer", confidence: "okay" },
    ],
  },
  {
    title: "Graph algorithms problem set",
    subject: "Algorithms",
    minutes: 60,
    completedDaysAgo: 10,
    topics: [
      {
        name: "Dijkstra's algorithm",
        confidence: "okay",
        reviews: [{ daysAgo: 6, rating: "good" }],
      },
    ],
  },
  {
    title: "Dynamic programming exercises",
    subject: "Algorithms",
    minutes: 60,
    completedDaysAgo: 30,
    topics: [
      {
        name: "Memoization vs tabulation",
        confidence: "solid",
        reviews: [{ daysAgo: 23, rating: "easy" }],
      },
    ],
  },
  {
    title: "Rewrite lecture 8 notes",
    subject: "Operating Systems",
    minutes: 40,
    completedDaysAgo: 9,
    topics: [
      {
        name: "Deadlock conditions",
        note: "I always forget no preemption",
        confidence: "okay",
        reviews: [{ daysAgo: 5, rating: "again" }],
      },
    ],
  },
  {
    title: "Read OS chapter 9: Memory",
    subject: "Operating Systems",
    minutes: 50,
    completedDaysAgo: 2,
    topics: [{ name: "Virtual memory and paging", confidence: "solid" }],
  },
];

async function seed() {
  assertLocalDatabase(env.DATABASE_URL);

  const summary: { topic: string; reviews: number; lapses: number; dueOn: string }[] = [];

  await db.transaction(async (tx) => {
    // Start from empty, so the seed can run again at any time.
    // CASCADE also empties every table that links to users
    await tx.execute(sql`truncate table ${users} restart identity cascade`);

    const [user] = await tx
      .insert(users)
      .values({ email: DEMO_EMAIL, passwordHash: await hashPassword(DEMO_PASSWORD) })
      .returning();
    if (!user) throw new Error("Could not create the demo user");

    const subjectRows = await tx
      .insert(subjects)
      .values(SUBJECTS.map((name) => ({ userId: user.id, name })))
      .returning();
    const subjectIds = new Map(subjectRows.map((subject) => [subject.name, subject.id]));

    for (const seedTask of TASKS) {
      const completedAt = seedTask.completedDaysAgo === undefined ? null : daysAgo(seedTask.completedDaysAgo);

      const [task] = await tx
        .insert(tasks)
        .values({
          userId: user.id,
          subjectId: subjectIds.get(seedTask.subject),
          title: seedTask.title,
          estimatedMinutes: seedTask.minutes,
          completedAt,
          createdAt: completedAt ?? new Date(),
        })
        .returning();
      if (!task) throw new Error(`Could not create task "${seedTask.title}"`);

      for (const seedTopic of seedTask.topics ?? []) {
        if (!completedAt) throw new Error(`"${seedTask.title}" has topics, so it must be completed`);

        // Replay the topic's history through FSRS, oldest event first
        const first = scheduleFirstReview(seedTopic.confidence, completedAt);
        let memory = first.memory;
        const logs = [{ ...first.log, scheduledDays: memory.scheduledDays }];

        for (const review of seedTopic.reviews ?? []) {
          const next = scheduleReview(memory, review.rating, daysAgo(review.daysAgo));
          memory = next.memory;
          logs.push({ ...next.log, scheduledDays: memory.scheduledDays });
        }

        const [topic] = await tx
          .insert(topics)
          .values({
            userId: user.id,
            subjectId: task.subjectId,
            taskId: task.id,
            name: seedTopic.name,
            note: seedTopic.note ?? null,
            ...memory,
            createdAt: completedAt,
          })
          .returning();
        if (!topic) throw new Error(`Could not create topic "${seedTopic.name}"`);

        await tx.insert(reviews).values(logs.map((log) => ({ topicId: topic.id, ...log })));

        summary.push({
          topic: topic.name,
          reviews: logs.length,
          lapses: memory.lapses,
          dueOn: memory.dueAt.toISOString().slice(0, 10),
        });
      }
    }
  });

  console.log(`\nSeeded the demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
  console.table(summary.sort((a, b) => a.dueOn.localeCompare(b.dueOn)));
}

try {
  await seed();
} finally {
  await pool.end();
}
