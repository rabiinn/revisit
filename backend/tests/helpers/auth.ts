import request from "supertest";
import type { Response } from "supertest";
import app from "../../src/app.ts";
import { SESSION_COOKIE } from "../../src/lib/session.ts";

export const api = () => request(app);

// An agent keeps cookies between requests, like a browser
export async function loginAs(user: { email: string; password: string }) {
  const agent = request.agent(app);
  await agent
    .post("/api/auth/login")
    .send({ email: user.email, password: user.password })
    .expect(200);
  return agent;
}

export function getSessionCookie(res: Response) {
  const cookies = res.get("Set-Cookie") ?? [];
  return cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE}=`));
}
