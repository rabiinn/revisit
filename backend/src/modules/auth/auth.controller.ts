import type { Request, Response } from "express";
import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  sessionMaxAge,
} from "../../lib/session.ts";
import { getUserById, loginUser, registerUser } from "./auth.service.ts";
import type { LoginInput, RegisterInput } from "./auth.schemas.ts";

async function setAuthCookie(res: Response, userId: string) {
  const token = await createSessionToken(userId);
  res.cookie(SESSION_COOKIE, token, {
    ...sessionCookieOptions,
    maxAge: sessionMaxAge,
  });
}

export async function register(
  req: Request<object, unknown, RegisterInput>,
  res: Response,
) {
  const user = await registerUser(req.body);
  await setAuthCookie(res, user.id);
  res.status(201).json({ user });
}

export async function login(
  req: Request<object, unknown, LoginInput>,
  res: Response,
) {
  const user = await loginUser(req.body);
  await setAuthCookie(res, user.id);
  res.json({ user });
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(SESSION_COOKIE, sessionCookieOptions);
  res.status(204).send();
}

export async function me(req: Request, res: Response) {
  const user = await getUserById(req.userId!);
  res.json({ user });
}
