import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { User } from "@/modules/users/user.model.js";

let mongoServer: MongoMemoryServer;

const normalUser = {
  name: "Regular User",
  email: "regular@example.com",
  password: "StrongPassword123",
  interests: ["reading"]
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

const registerAndLoginUser = async (): Promise<string> => {
  await request(app).post("/api/v1/auth/register").send(normalUser);

  const response = await request(app).post("/api/v1/auth/login").send({
    email: normalUser.email,
    password: normalUser.password
  });

  return response.body.data.accessToken as string;
};

const createAdminToken = (): string =>
  jwt.sign(
    {
      sub: new Types.ObjectId().toString(),
      role: "admin"
    },
    "test-jwt-secret",
    { expiresIn: "1d" }
  );

describe("GET /api/v1/users", () => {
  it("rejects unauthenticated requests", async () => {
    const response = await request(app).get("/api/v1/users");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects authenticated non-admin users", async () => {
    const accessToken = await registerAndLoginUser();

    const response = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("allows authenticated admin users to access the endpoint", async () => {
    const users = [
      {
        ...normalUser,
        email: "first@example.com"
      },
      {
        ...normalUser,
        name: "Second User",
        email: "second@example.com"
      },
      {
        ...normalUser,
        name: "Third User",
        email: "third@example.com"
      }
    ];

    for (const user of users) {
      const registrationResponse = await request(app)
        .post("/api/v1/auth/register")
        .send(user);

      expect(registrationResponse.status).toBe(201);
    }

    const response = await request(app)
      .get("/api/v1/users?page=1&limit=2")
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.users).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2
    });

    expect(response.body.data.users[0]).toMatchObject({
      email: "third@example.com"
    });
    expect(response.body.data.users[1]).toMatchObject({
      email: "second@example.com"
    });

    for (const user of response.body.data.users) {
      expect(user).not.toHaveProperty("password");
      expect(user).not.toHaveProperty("passwordHash");
    }
  });
});

describe("GET /api/v1/users/:id", () => {
  it("allows an admin to retrieve a user without password data", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;

    const response = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      id: userId,
      name: normalUser.name,
      email: normalUser.email,
      role: "user"
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("rejects a non-admin user", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: normalUser.email,
      password: normalUser.password
    });
    const accessToken = loginResponse.body.data.accessToken as string;

    const response = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("returns 404 when the user does not exist", async () => {
    const missingUserId = new Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/users/${missingUserId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "User not found"
    });
  });
});

describe("PATCH /api/v1/users/:id", () => {
  it("allows an admin to update permitted user fields", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;

    const response = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({
        name: "Updated User",
        interests: ["backend", "mongodb"]
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      id: userId,
      name: "Updated User",
      email: normalUser.email,
      role: "user",
      interests: ["backend", "mongodb"]
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("rejects a non-admin user", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: normalUser.email,
      password: normalUser.password
    });

    const response = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${loginResponse.body.data.accessToken}`)
      .send({ name: "Unauthorized Update" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("rejects an invalid role", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;

    const response = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({ role: "super-admin" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid role"
    });
  });

  it("returns 404 when the user does not exist", async () => {
    const missingUserId = new Types.ObjectId().toString();

    const response = await request(app)
      .patch(`/api/v1/users/${missingUserId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({ name: "Missing User" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "User not found"
    });
  });
});

describe("DELETE /api/v1/users/:id", () => {
  it("allows an admin to delete a user", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;

    const deleteResponse = await request(app)
      .delete(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.body).toEqual({});

    const getResponse = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(getResponse.status).toBe(404);
    expect(getResponse.body).toEqual({
      success: false,
      message: "User not found"
    });
  });

  it("rejects an unauthenticated request", async () => {
    const userId = new Types.ObjectId().toString();

    const response = await request(app).delete(`/api/v1/users/${userId}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects a non-admin user", async () => {
    const registrationResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(normalUser);

    const userId = registrationResponse.body.data.user.id as string;
    const loginResponse = await request(app).post("/api/v1/auth/login").send({
      email: normalUser.email,
      password: normalUser.password
    });

    const response = await request(app)
      .delete(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${loginResponse.body.data.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("returns 404 when the user does not exist", async () => {
    const missingUserId = new Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/users/${missingUserId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "User not found"
    });
  });
});

describe("POST /api/v1/users", () => {
  const adminUserPayload = {
    name: "Created Admin",
    email: "created-admin@example.com",
    password: "StrongPassword123",
    role: "admin",
    interests: ["technology"]
  };

  it("allows an admin to create a user", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send(adminUserPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("User created successfully");
    expect(response.body.data.user).toMatchObject({
      name: adminUserPayload.name,
      email: adminUserPayload.email,
      role: adminUserPayload.role,
      interests: adminUserPayload.interests
    });
    expect(response.body.data.user).not.toHaveProperty("password");
    expect(response.body.data.user).not.toHaveProperty("passwordHash");

    const createdUser = await User.findOne({
      email: adminUserPayload.email
    }).select("+passwordHash");

    expect(createdUser).not.toBeNull();
    expect(createdUser?.passwordHash).not.toBe(adminUserPayload.password);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .send(adminUserPayload);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects a non-admin user", async () => {
    const accessToken = await registerAndLoginUser();

    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(adminUserPayload);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("rejects duplicate email registration", async () => {
    const adminRequest = request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${createAdminToken()}`);

    await adminRequest.send(adminUserPayload);

    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send(adminUserPayload);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      message: "Email is already registered"
    });
  });

  it("rejects an invalid role", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({
        ...adminUserPayload,
        role: "super-admin"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid role"
    });
  });

  it("rejects a short password", async () => {
    const response = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({
        ...adminUserPayload,
        password: "short"
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Password must be at least 8 characters"
    });
  });
});
