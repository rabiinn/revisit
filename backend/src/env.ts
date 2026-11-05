import { z, ZodError } from "zod";
import dotenv from "dotenv";

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv !== "production") {
  dotenv.config({ path: `.env.${nodeEnv}` });
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().startsWith("postgresql://"),
  DATABASE_POOL_MIN: z.coerce.number().min(0).default(2),
  DATABASE_POOL_MAX: z.coerce.number().positive().default(10),

  JWT_SECRET: z.string().min(32, "JWT secret must be 32 character long"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  CORS_ORIGIN: z.url(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error(
    "Invalid environment variables:\n" + z.prettifyError(result.error),
  );
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;

export const isProd = () => env.NODE_ENV === "production";
export const isDev = () => env.NODE_ENV === "development";
export const isTestEnv = () => env.NODE_ENV === "test";
