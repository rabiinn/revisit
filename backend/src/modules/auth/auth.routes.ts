import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../../middleware/auth.ts";
import { register, login, logout, me } from "./auth.controller.ts";
import { validateBody } from "../../middleware/validation.ts";
import { loginSchema, registerSchema } from "./auth.schemas.ts";
import { isTestEnv } from "../../env.ts";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv(),
  message: { error: "Too many attempts. Please try again later." },
});

const authRouter = Router();

authRouter.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  register,
);
authRouter.post("/login", authLimiter, validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", authMiddleware, me);

export default authRouter;
