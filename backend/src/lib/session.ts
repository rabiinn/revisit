import type { CookieOptions } from "express";
import { jwtVerify, SignJWT } from "jose";
import { env, isProd } from "../env.ts";

const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days
const secret = new TextEncoder().encode(env.JWT_SECRET);

export const SESSION_COOKIE = "session";

export const sessionCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd(),
  sameSite: "lax",
  path: "/",
};

export const sessionMaxAge = SESSION_SECONDS * 1000;

export function createSessionToken(userId: string) {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });
  return payload.sub;
}
