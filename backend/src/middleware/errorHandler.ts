import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { isProd } from "../env.ts";
import { AppError } from "../lib/errors.ts";

type PgError = { code: string; constraint?: string };

// Drizzle can wrap Postgres errors, so check the error and its cause
function getPgError(err: unknown): PgError | undefined {
  for (const candidate of [err, (err as { cause?: unknown })?.cause]) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "code" in candidate &&
      typeof candidate.code === "string" &&
      /^[0-9A-Z]{5}$/.test(candidate.code)
    ) {
      return candidate as PgError;
    }
  }
  return undefined;
}

// Errors from express.json() have a type property
function getBodyParserType(err: unknown) {
  if (typeof err === "object" && err !== null && "type" in err) {
    return err.type;
  }
  return undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      details: z.flattenError(err),
    });
    return;
  }

  const bodyType = getBodyParserType(err);
  if (bodyType === "entity.parse.failed") {
    res.status(400).json({ error: "Invalid JSON in request body" });
    return;
  }
  if (bodyType === "entity.too.large") {
    res.status(413).json({ error: "Request body is too large" });
    return;
  }

  const pgError = getPgError(err);
  if (pgError?.code === "23505") {
    res.status(409).json({ error: "This item already exists" });
    return;
  }
  if (pgError?.code === "23503") {
    res.status(400).json({ error: "A linked item does not exist" });
    return;
  }
  if (pgError?.code === "22P02") {
    res.status(400).json({ error: "Invalid value in request" });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "Internal server error",
    ...(isProd()
      ? {}
      : { stack: err instanceof Error ? err.stack : undefined }),
  });
}
