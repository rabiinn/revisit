import { z } from "zod";

export const CONFIDENCE_LEVELS = ["shaky", "okay", "solid"] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

// An empty optional field means "not set", so turn "" into undefined
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || undefined);

export const createTaskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter what you will study")
    .max(200, "Keep the title under 200 characters"),

  subjectName: optionalText(60, "Keep the subject under 60 characters"),

  // Form fields are always text, so convert "45" to 45 and "" to undefined
  estimatedMinutes: z
    .string()
    .trim()
    .transform((value) => (value === "" ? undefined : Number(value)))
    .pipe(
      z
        .number({ error: "Enter the minutes as a number" })
        .int("Enter whole minutes")
        .min(1, "Enter at least 1 minute")
        .max(600, "Keep it under 600 minutes")
        .optional(),
    ),
});

export const topicNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a topic")
  .max(120, "Keep the topic under 120 characters");

export const completeTaskFormSchema = z.object({
  topics: z
    .array(topicNameSchema)
    .max(10, "Add at most 10 topics")
    .refine(
      (names) => new Set(names.map((name) => name.toLowerCase())).size === names.length,
      "Each topic can only be added once",
    ),
  confidence: z.enum(CONFIDENCE_LEVELS),
  note: optionalText(1000, "Keep the note under 1000 characters"),
  reviewInDays: z.number().int().min(1).max(60),
});

export type TaskStatus = "open" | "completed" | "all";

export type Task = {
  id: string;
  title: string;
  estimatedMinutes: number | null;
  completedAt: string | null;
  createdAt: string;
  subjectId: string | null;
  subject: { id: string; name: string } | null;
};

export type UpdateTaskInput = {
  id: string;
  title?: string;
  subjectName?: string | null;
  estimatedMinutes?: number | null;
};

export type CompleteTaskFormInput = z.input<typeof completeTaskFormSchema>;
export type CreateTaskInput = z.output<typeof createTaskFormSchema>;
export type CompleteTaskValues = z.output<typeof completeTaskFormSchema>;

export type CompleteTaskInput = CompleteTaskValues & { id: string };

export type TaskResponse = { task: Task };
export type TasksResponse = { tasks: Task[] };

export type CompleteTaskResponse = {
  task: Task;
  topics: { id: string; name: string; dueAt: string }[];
};
