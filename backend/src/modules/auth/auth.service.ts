import {
  hashPassword,
  verifyPassword,
  fakeVerifyPassword,
  passwordNeedsRehash,
} from "../../lib/password.ts";
import type { RegisterInput, LoginInput } from "./auth.schemas.ts";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.ts";
import { users } from "../../db/schema.ts";
import { AppError } from "../../lib/errors.ts";

export async function registerUser({ email, password }: RegisterInput) {
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id, email: users.email });

  if (!user) throw new AppError(409, "Email is already registered");

  return user;
}

export async function loginUser({ email, password }: LoginInput) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    await fakeVerifyPassword(password);
    throw new AppError(401, "Invalid email or password");
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new AppError(401, "Invalid email or password");
  }

  if (passwordNeedsRehash(user.passwordHash)) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(users.id, user.id));
  }

  return { id: user.id, email: user.email };
}

export async function getUserById(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, email: true },
  });

  if (!user) throw new AppError(401, "Not authenticated");
  return user;
}
