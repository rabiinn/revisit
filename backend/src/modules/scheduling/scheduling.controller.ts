import type { Request, Response } from "express";
import { firstReviewOptions } from "../../lib/scheduling.ts";

export function getFirstReviewOptions(_req: Request, res: Response) {
  res.json({ options: firstReviewOptions() });
}
