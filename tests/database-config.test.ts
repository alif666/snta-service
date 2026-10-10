import { afterEach, describe, expect, it, vi } from "vitest";

describe("MongoDB configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("rejects a connection when MONGODB_URI is missing", async () => {
    vi.stubEnv("MONGODB_URI", "");

    const { connectDatabase } = await import("../src/config/database.js");

    await expect(connectDatabase()).rejects.toThrow(
      "MONGODB_URI is not configured"
    );
  });
});
