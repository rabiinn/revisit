import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.ts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validation.ts";
import {
  deleteTopic,
  getTopic,
  listTopics,
  reviewTopic,
  updateTopic,
} from "./topics.controller.ts";
import {
  createReviewSchema,
  listTopicsQuerySchema,
  topicIdParamsSchema,
  updateTopicSchema,
} from "./topics.schemas.ts";

const topicsRouter = Router();
const validateTopicId = validateParams(topicIdParamsSchema);

topicsRouter.use(authMiddleware);

topicsRouter.get("/", validateQuery(listTopicsQuerySchema), listTopics);
topicsRouter.get("/:id", validateTopicId, getTopic);
topicsRouter.patch(
  "/:id",
  validateTopicId,
  validateBody(updateTopicSchema),
  updateTopic,
);
topicsRouter.delete("/:id", validateTopicId, deleteTopic);
topicsRouter.post(
  "/:id/reviews",
  validateTopicId,
  validateBody(createReviewSchema),
  reviewTopic,
);

export default topicsRouter;
