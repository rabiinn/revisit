import { z } from "zod";
import { REVIEW_RATINGS } from "../../lib/scheduling.ts";

export const topicIdParamsSchema = z.object({ id: z.uuid() });

export const listTopicsQuerySchema = z.object({
  subjectId: z.uuid().optional(),
  dueOnly: z.stringbool().default(false),
});

export const updateTopicSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    note: z.string().trim().max(1000).nullable().optional(),
    subjectName: z.string().trim().min(1).max(60).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update",
  });

export const createReviewSchema = z.object({
  rating: z.enum(REVIEW_RATINGS),
  questionId: z.uuid().optional(),
});

export type TopicParams = z.infer<typeof topicIdParamsSchema>;
export type ListTopicsQuery = z.infer<typeof listTopicsQuerySchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
