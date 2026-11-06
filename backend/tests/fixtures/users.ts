export const SEED_USERS = {
  alice: { email: "alice@example.com", password: "alice-password-123" },
  bob: { email: "bob@example.com", password: "bob-password-123" },
} as const;

export type SeedUserKey = keyof typeof SEED_USERS;
