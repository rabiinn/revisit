import express from "express";
import helmet from "helmet";
import type { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";
import { env, isTestEnv } from "./env.ts";
import { db } from "./db/index.ts";
import { sql } from "drizzle-orm";
import cookieParser from "cookie-parser";
import authRouter from "./modules/auth/auth.routes.ts";
import { notFound } from "./middleware/notFound.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  morgan("dev", {
    skip: () => isTestEnv(),
  }),
);

app.get("/api/health", async (_req: Request, res: Response) => {
  await db.execute(sql`select 1`);
  res.json({ status: "ok", database: "connected" });
});

app.use("/api/auth", authRouter);
app.use(notFound);
app.use(errorHandler);

export default app;
