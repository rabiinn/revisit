export function assertTestDatabase(url: string | undefined) {
  if (!url) {
    throw new Error("DATABASE_URL is not defined.");
  }
  const databaseName = url ? new URL(url).pathname.slice(1) : "";

  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${databaseName}". ` +
        "DATABASE_URL must point to a database ending in _test.",
    );
  }
}
