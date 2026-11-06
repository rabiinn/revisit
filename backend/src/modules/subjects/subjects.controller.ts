import type { Request, Response } from "express";
import * as subjectsService from "./subjects.service.ts";

export async function listSubjects(req: Request, res: Response) {
  res.json({ subjects: await subjectsService.listSubjects(req.userId!) });
}
