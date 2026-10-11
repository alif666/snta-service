import request from "supertest";
import { describe, expect, it } from "vitest";

import { app } from "@/express-app";

describe("Unknown routes", () => {
  it("returns a consistent 404 response", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Route GET /api/v1/does-not-exist not found"
    });
  });
});
