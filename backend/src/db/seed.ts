import { randomUUID } from "node:crypto";
import { db, pool } from "./index.ts";
import { questions, reviews, subjects, tasks, topics, users } from "./schema.ts";
import { hashPassword } from "../lib/password.ts";

const SEED_PASSWORD = "password123";
const USER_COUNT = 5;
const RECORDS_PER_USER = 12;

const subjectNames = [
  "Mathematics",
  "Physics",
  "Computer Science",
  "History",
  "Biology",
  "Economics",
  "Psychology",
  "Literature",
  "Chemistry",
  "Statistics",
  "Philosophy",
  "Geography",
];

const topicNames = [
  "Core concepts",
  "Important definitions",
  "Common patterns",
  "Worked examples",
  "Key formulas",
  "Practical applications",
  "Historical context",
  "Frequently missed details",
  "Compare and contrast",
  "Exam preparation",
  "Further reading",
  "Review summary",
];

const ratings = ["again", "hard", "good", "easy"] as const;

async function seed() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  await db.transaction(async (tx) => {
    for (let userIndex = 0; userIndex < USER_COUNT; userIndex += 1) {
      const userId = randomUUID();

      await tx.insert(users).values({
        id: userId,
        email: `seed-user-${userIndex + 1}@example.com`,
        passwordHash,
      });

      const subjectRows = Array.from({ length: RECORDS_PER_USER }, (_, index) => ({
        id: randomUUID(),
        userId,
        name: subjectNames[index],
      }));
      await tx.insert(subjects).values(subjectRows);

      const taskRows = subjectRows.map((subject, index) => ({
        id: randomUUID(),
        userId,
        subjectId: subject.id,
        title: `Study ${subject.name} fundamentals`,
        estimatedMinutes: 30 + index * 5,
        completedAt: index % 3 === 0 ? new Date(Date.now() - (index + 1) * 86_400_000) : null,
      }));
      await tx.insert(tasks).values(taskRows);

      const topicRows = subjectRows.map((subject, index) => ({
        id: randomUUID(),
        userId,
        subjectId: subject.id,
        taskId: taskRows[index].id,
        name: `${subject.name}: ${topicNames[index]}`,
        note: `Seed notes for ${subject.name.toLowerCase()} and ${topicNames[index].toLowerCase()}.`,
        strength: 35 + (index % 6) * 10,
        intervalDays: 1 + (index % 6),
        dueAt: new Date(Date.now() + (index - 3) * 86_400_000),
      }));
      await tx.insert(topics).values(topicRows);

      const questionRows = topicRows.flatMap((topic) => [
        {
          id: randomUUID(),
          topicId: topic.id,
          question: `What is the main idea behind ${topic.name}?`,
          answer: `The main idea is to understand ${topic.name.toLowerCase()} and apply it in practice.`,
        },
        {
          id: randomUUID(),
          topicId: topic.id,
          question: `How can you apply ${topic.name} to a problem?`,
          answer: `Break the problem into smaller parts, identify the relevant principles, and verify the result.`,
        },
      ]);
      await tx.insert(questions).values(questionRows);

      const reviewRows = topicRows.flatMap((topic, index) => {
        const topicQuestions = questionRows.filter((question) => question.topicId === topic.id);
        const previousIntervalDays = 1 + (index % 6);
        const nextIntervalDays = previousIntervalDays * (index % 4 === 0 ? 1 : 2);

        return topicQuestions.map((question, questionIndex) => ({
          id: randomUUID(),
          topicId: topic.id,
          questionId: question.id,
          rating: ratings[(index + questionIndex) % ratings.length],
          previousIntervalDays,
          nextIntervalDays,
          reviewedAt: new Date(Date.now() - (index + questionIndex + 1) * 3_600_000),
        }));
      });
      await tx.insert(reviews).values(reviewRows);
    }
  });

  console.log(
    `Seeded ${USER_COUNT} users with ${RECORDS_PER_USER} subjects, tasks, topics, ` +
      `${RECORDS_PER_USER * 2} questions, and ${RECORDS_PER_USER * 2} reviews per user.`,
  );
}

try {
  await seed();
} catch (error) {
  console.error("Database seeding failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
