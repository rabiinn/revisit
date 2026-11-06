import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.ts";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validation.ts";
import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  reopenTask,
  updateTask,
} from "./tasks.controller.ts";
import {
  completeTaskSchema,
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from "./tasks.schemas.ts";

const tasksRouter = Router();
const validateTaskId = validateParams(taskIdParamsSchema);

tasksRouter.use(authMiddleware);

tasksRouter.get("/", validateQuery(listTasksQuerySchema), listTasks);
tasksRouter.post("/", validateBody(createTaskSchema), createTask);
tasksRouter.get("/:id", validateTaskId, getTask);
tasksRouter.patch(
  "/:id",
  validateTaskId,
  validateBody(updateTaskSchema),
  updateTask,
);
tasksRouter.delete("/:id", validateTaskId, deleteTask);
tasksRouter.post(
  "/:id/complete",
  validateTaskId,
  validateBody(completeTaskSchema),
  completeTask,
);
tasksRouter.post("/:id/reopen", validateTaskId, reopenTask);

export default tasksRouter;
