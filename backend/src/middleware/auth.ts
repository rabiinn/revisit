import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifySessionToken } from "../lib/session.ts";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    const userId = token ? await verifySessionToken(token) : undefined;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    req.userId = userId;
    next();
  } catch (error) {
    res.status(401).json({ error: "Not authenticated" });
  }
}
