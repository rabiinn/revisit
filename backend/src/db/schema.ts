import {
  doublePrecision,
  smallint,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

const id = () => uuid().primaryKey().defaultRandom();

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const reviewRating = pgEnum("review_rating", ["again", "hard", "good", "easy"]);

export const users = pgTable("users", {
  id: id(),
  email: text().notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
});

export const subjects = pgTable(
  "subjects",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("subject_user_id_name_lower_idx").on(table.userId, sql`lower(${table.name})`)],
);

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    title: text().notNull(),
    estimatedMinutes: integer("estimated_minutes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.userId, table.completedAt)],
);

export const topics = pgTable(
  "topics",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    name: text().notNull(),
    note: text(),

    // FSRS memory state. Only lib/scheduling.ts calculates these values
    stability: doublePrecision().notNull(),
    stabilityFast: doublePrecision().notNull(),
    difficulty: doublePrecision().notNull(),
    fsrsState: smallint().notNull(),
    scheduleStatus: text().notNull(),
    reps: integer().notNull(),
    lapses: integer().notNull(),
    scheduledDays: integer().notNull(),
    lastReviewAt: timestamp({ withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),

    createdAt: createdAt(),
  },
  (table) => [index().on(table.userId, table.dueAt)],
);

export const questions = pgTable(
  "questions",
  {
    id: id(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    question: text().notNull(),
    answer: text().notNull(),
    createdAt: createdAt(),
  },
  (table) => [index().on(table.topicId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").references(() => questions.id, {
      onDelete: "set null",
    }),
    rating: reviewRating().notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),

    // The memory state just before this review, so it can be undone or used to train FSRS
    stateBefore: smallint().notNull(),
    stabilityBefore: doublePrecision().notNull(),
    stabilityFastBefore: doublePrecision().notNull(),
    difficultyBefore: doublePrecision().notNull(),
    scheduledDaysBefore: integer().notNull(),
    dueAtBefore: timestamp({ withTimezone: true }).notNull(),
    lastReviewAtBefore: timestamp({ withTimezone: true }),

    // The interval this review chose
    scheduledDays: integer().notNull(),
  },
  (table) => [index().on(table.topicId, table.reviewedAt)],
);

export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
  tasks: many(tasks),
  topics: many(topics),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  tasks: many(tasks),
  topics: many(topics),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [tasks.subjectId],
    references: [subjects.id],
  }),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  user: one(users, {
    fields: [topics.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [topics.subjectId],
    references: [subjects.id],
  }),
  task: one(tasks, {
    fields: [topics.taskId],
    references: [tasks.id],
  }),
  questions: many(questions),
  reviews: many(reviews),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  topic: one(topics, {
    fields: [reviews.topicId],
    references: [topics.id],
  }),
  question: one(questions, {
    fields: [reviews.questionId],
    references: [questions.id],
  }),
}));
