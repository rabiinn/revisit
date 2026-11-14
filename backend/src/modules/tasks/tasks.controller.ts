import type { Request, Response } from "express";
import type {
  ListTasksQuery,
  TaskIdParams,
  CreateTaskInput,
  UpdateTaskInput,
  CompleteTaskInput,
} from "./tasks.schemas.ts";
import * as tasksService from "./tasks.service.ts";

export async function listTasks(req: Request, res: Response) {
  const { status } = req.query as unknown as ListTasksQuery;
  res.json({ tasks: await tasksService.listTasks(req.userId!, status) });
}

export async function getTask(req: Request<TaskIdParams>, res: Response) {
  res.json({ task: await tasksService.getTask(req.userId!, req.params.id) });
}

export async function createTask(req: Request<object, unknown, CreateTaskInput>, res: Response) {
  const task = await tasksService.createTask(req.userId!, req.body);
  res.status(201).json({ task });
}

export async function updateTask(req: Request<TaskIdParams, unknown, UpdateTaskInput>, res: Response) {
  const task = await tasksService.updateTask(req.userId!, req.params.id, req.body);
  res.json({ task });
}

export async function deleteTask(req: Request<TaskIdParams>, res: Response) {
  await tasksService.deleteTask(req.userId!, req.params.id);
  res.status(204).send();
}

export async function completeTask(req: Request<TaskIdParams, unknown, CompleteTaskInput>, res: Response) {
  res.json(await tasksService.completeTask(req.userId!, req.params.id, req.body));
}

export async function reopenTask(req: Request<TaskIdParams>, res: Response) {
  const task = await tasksService.reopenTask(req.userId!, req.params.id);
  res.json({ task });
}
