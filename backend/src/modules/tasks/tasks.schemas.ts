import { z } from "zod";
import { CONFIDENCE_LEVELS } from "../../lib/scheduling.ts";

const title = z.string().trim().min(1, "Title is required").max(200);
const subjectName = z.string().trim().min(1).max(60);
const estimatedMinutes = z.number().int().min(1).max(600);

export const taskIdParamsSchema = z.object({ id: z.uuid() });

export const listTasksQuerySchema = z.object({
  status: z.enum(["open", "completed", "all"]).default("all"),
});

export const createTaskSchema = z.object({
  title,
  subjectName: subjectName.optional(),
  estimatedMinutes: estimatedMinutes.optional(),
});

export const updateTaskSchema = z
  .object({
    title: title.optional(),
    subjectName: subjectName.nullable().optional(),
    estimatedMinutes: estimatedMinutes.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const completeTaskSchema = z.object({
  topics: z
    .array(z.string().trim().min(1).max(120))
    .max(10)
    .default([])
    .refine(
      (names) =>
        new Set(names.map((name) => name.toLowerCase())).size === names.length,
      { message: "Topic names must be unique" },
    ),
  confidence: z.enum(CONFIDENCE_LEVELS).default("okay"),
  note: z.string().trim().max(1000).optional(),
  reviewInDays: z.number().int().min(1).max(60).optional(),
});

export type TaskIdType = z.infer<typeof taskIdParamsSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
