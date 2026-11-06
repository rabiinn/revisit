import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.ts";
import { listSubjects } from "./subjects.controller.ts";

const subjectsRouter = Router();

subjectsRouter.use(authMiddleware);
subjectsRouter.get("/", listSubjects);

export default subjectsRouter;
