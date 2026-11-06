import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { db } from "../../src/db/index.ts";
import { users } from "../../src/db/schema.ts";
import { SESSION_COOKIE } from "../../src/lib/session.ts";
import { api, getSessionCookie, loginAs } from "../helpers/auth.ts";
import { createUser, seedUsers } from "../helpers/factories.ts";

const REGISTER = "/api/auth/register";
const LOGIN = "/api/auth/login";
const LOGOUT = "/api/auth/logout";
const ME = "/api/auth/me";

describe("POST /api/auth/register", () => {
  it("creates a user and starts a session", async () => {
    const res = await api()
      .post(REGISTER)
      .send({ email: "new@example.com", password: "password-123" });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: "new@example.com" });
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(getSessionCookie(res)).toContain("HttpOnly");
  });

  it("stores an Argon2id hash instead of the password", async () => {
    await api()
      .post(REGISTER)
      .send({ email: "new@example.com", password: "password-123" })
      .expect(201);

    const user = await db.query.users.findFirst({
      where: eq(users.email, "new@example.com"),
    });

    expect(user?.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(user?.passwordHash).not.toContain("password-123");
  });

  it("trims and lowercases the email", async () => {
    const res = await api()
      .post(REGISTER)
      .send({ email: "  New@Example.COM ", password: "password-123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("new@example.com");
  });

  it("rejects an email that is already registered", async () => {
    const { alice } = await seedUsers();

    const res = await api()
      .post(REGISTER)
      .send({ email: alice.email, password: "another-password" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email is already registered");
  });

  it.each([
    ["an invalid email", { email: "not-an-email", password: "password-123" }],
    ["a short password", { email: "new@example.com", password: "short" }],
    ["a missing password", { email: "new@example.com" }],
  ])("rejects %s", async (_label, body) => {
    const res = await api().post(REGISTER).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});

describe("POST /api/auth/login", () => {
  it("logs in a seeded user and starts a session", async () => {
    const { alice } = await seedUsers();

    const res = await api()
      .post(LOGIN)
      .send({ email: alice.email, password: alice.password });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: alice.id, email: alice.email });
    expect(getSessionCookie(res)).toContain("HttpOnly");
  });

  it("accepts the email in any letter case", async () => {
    const { alice } = await seedUsers();

    await api()
      .post(LOGIN)
      .send({ email: alice.email.toUpperCase(), password: alice.password })
      .expect(200);
  });

  it("returns the same error for a wrong password and an unknown email", async () => {
    const { alice } = await seedUsers();

    const wrongPassword = await api()
      .post(LOGIN)
      .send({ email: alice.email, password: "wrong-password" });
    const unknownEmail = await api()
      .post(LOGIN)
      .send({ email: "nobody@example.com", password: "wrong-password" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(getSessionCookie(wrongPassword)).toBeUndefined();
  });

  it("upgrades a hash with outdated settings after login", async () => {
    const password = "legacy-password-123";
    const legacyHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 7168,
      timeCost: 5,
      parallelism: 1,
    });
    const [user] = await db
      .insert(users)
      .values({ email: "legacy@example.com", passwordHash: legacyHash })
      .returning();

    await api()
      .post(LOGIN)
      .send({ email: "legacy@example.com", password })
      .expect(200);

    const updated = await db.query.users.findFirst({
      where: eq(users.id, user!.id),
    });
    expect(updated?.passwordHash).toContain("m=19456,t=2,p=1");
  });
});

describe("GET /api/auth/me", () => {
  it("returns the logged-in user", async () => {
    const { alice } = await seedUsers();
    const agent = await loginAs(alice);

    const res = await agent.get(ME);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: alice.id, email: alice.email });
  });

  it("rejects a request without a session cookie", async () => {
    await api().get(ME).expect(401);
  });

  it("rejects an invalid token", async () => {
    await api()
      .get(ME)
      .set("Cookie", `${SESSION_COOKIE}=not-a-real-token`)
      .expect(401);
  });

  it("rejects a token signed with a different secret", async () => {
    const user = await createUser();
    const forgedToken = await new SignJWT()
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setExpirationTime("1h")
      .sign(
        new TextEncoder().encode("an-attacker-secret-that-is-32-chars-long"),
      );

    await api()
      .get(ME)
      .set("Cookie", `${SESSION_COOKIE}=${forgedToken}`)
      .expect(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("ends the session", async () => {
    const { alice } = await seedUsers();
    const agent = await loginAs(alice);

    await agent.post(LOGOUT).expect(204);
    await agent.get(ME).expect(401);
  });
});
