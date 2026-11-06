import argon2 from "argon2";

const DUMMY_HASH = await argon2.hash("not-a-real-password", {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

export function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export function verifyPassword(password: string, hash: string) {
  return argon2.verify(hash, password);
}

export async function fakeVerifyPassword(password: string) {
  await argon2.verify(DUMMY_HASH, password);
}

export function passwordNeedsRehash(hash: string) {
  return argon2.needsRehash(hash);
}
