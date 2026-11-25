import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { isProd } from "../env.ts";
import { AppError } from "../lib/errors.ts";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: z.flattenError(err),
    });
    return;
  }

  // Express JSON parser errors
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "Invalid JSON in request body" });
    return;
  }

  // PostgreSQL errors (including errors wrapped by Drizzle)
  const pgCode =
    typeof err === "object" && err !== null && "code" in err
      ? err.code
      : typeof err === "object" && err !== null && "cause" in err
        ? (err.cause as { code?: string })?.code
        : undefined;

  if (pgCode === "23505") {
    res.status(409).json({ error: "This item already exists" });
    return;
  }

  if (pgCode === "23503") {
    res.status(400).json({ error: "A linked item does not exist" });
    return;
  }

  if (pgCode === "22P02") {
    res.status(400).json({ error: "Invalid value in request" });
    return;
  }

  // Unexpected errors
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
    ...(isProd() ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
