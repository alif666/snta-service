import { afterEach, describe, expect, it, vi } from "vitest";

describe("MongoDB configuration", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("rejects a connection when MONGODB_URI is missing", async () => {
    const originalUri = process.env.MONGODB_URI;
    delete process.env.MONGODB_URI;

    const { connectDatabase } = await import("../src/config/database.js");

    await expect(connectDatabase()).rejects.toThrow(
      "MONGODB_URI is not configured"
    );

    if (originalUri === undefined) {
      delete process.env.MONGODB_URI;
    } else {
      process.env.MONGODB_URI = originalUri;
    }
  });
});
