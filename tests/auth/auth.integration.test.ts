import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/express-app";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { User } from "@/modules/users/user.model.js";

let mongoServer: MongoMemoryServer;

const registrationPayload = {
  name: "Ahnaf Rahman",
  email: "ahnaf@example.com",
  password: "StrongPassword123",
  interests: ["reading", "chess"]
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000
    }
  });

  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-jwt-secret";
  process.env.JWT_EXPIRES_IN = "1d";

  await connectDatabase();
  await User.init();
}, 120_000);

beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a user without returning password data", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Registration successful");

    expect(response.body.data.user).toMatchObject({
      name: "Ahnaf Rahman",
      email: "ahnaf@example.com",
      role: "user",
      interests: ["reading", "chess"]
    });

    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email registration", async () => {
    await request(app).post("/api/v1/auth/register").send(registrationPayload);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(registrationPayload);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: "Email is already registered"
    });
  });

  it("rejects a registration with a short password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        ...registrationPayload,
        password: "short"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Password must be at least 8 characters"
    });
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in a registered user and returns an access token", async () => {
    await request(app).post("/api/v1/auth/register").send(registrationPayload);

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "AHNAF@EXAMPLE.COM",
      password: "StrongPassword123"
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid credentials with a generic error", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "unknown@example.com",
      password: "WrongPassword123"
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid email or password"
    });
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns the authenticated user with a valid token", async () => {
    await request(app).post("/api/v1/auth/register").send(registrationPayload);

    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: registrationPayload.email,
      password: registrationPayload.password
    });

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginResponse.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      email: registrationPayload.email,
      role: "user"
    });
  });

  it("rejects a request without a token", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects a malformed authorization header", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Token invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token"
    });
  });

  it("rejects an expired token", async () => {
    const expiredToken = jwt.sign(
      {
        sub: "expired-user-id",
        role: "user"
      },
      "test-jwt-secret",
      { expiresIn: -1 }
    );

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid or expired token"
    });
  });
});
