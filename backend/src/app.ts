import express from "express";
import helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { env, isTestEnv } from "./env.ts";
import { db } from "./db/index.ts";
import { sql } from "drizzle-orm";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("dev", {
    skip: () => isTestEnv(),
  }),
);

app.get("/api/health", async (_req: Request, res: Response) => {
  await db.execute(sql`select 1`);
  res.json({ status: "ok", database: "connected" });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
