import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.ts";
import { getFirstReviewOptions } from "./scheduling.controller.ts";

const schedulingRouter = Router();

schedulingRouter.use(authMiddleware);
schedulingRouter.get("/first-review-options", getFirstReviewOptions);

export default schedulingRouter;
