import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { Post } from "@/modules/posts/post.model.js";
import { User } from "@/modules/users/user.model.js";

let mongoServer: MongoMemoryServer;

const firstUserCredentials = {
  name: "First Post User",
  email: "first-post-user@example.com",
  password: "StrongPassword123",
  interests: ["writing"]
};

const secondUserCredentials = {
  name: "Second Post User",
  email: "second-post-user@example.com",
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
  await Post.init();
}, 120_000);

beforeEach(async () => {
  await Post.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

const registerUser = async (
  credentials: typeof firstUserCredentials
): Promise<{ userId: string; accessToken: string }> => {
  const registrationResponse = await request(app)
    .post("/api/v1/auth/register")
    .send(credentials);

  expect(registrationResponse.status).toBe(201);

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: credentials.email,
    password: credentials.password
  });

  expect(loginResponse.status).toBe(200);

  return {
    userId: loginResponse.body.data.user.id as string,
    accessToken: loginResponse.body.data.accessToken as string
  };
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

describe("GET /api/v1/users/:id/posts", () => {
  it("rejects an unauthenticated request", async () => {
    const response = await request(app).get(
      `/api/v1/users/${new Types.ObjectId().toString()}/posts`
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects an authenticated non-admin user", async () => {
    const currentUser = await registerUser(firstUserCredentials);

    const response = await request(app)
      .get(`/api/v1/users/${currentUser.userId}/posts`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: "Forbidden"
    });
  });

  it("returns the target user's posts with joined author data", async () => {
    const firstUser = await registerUser(firstUserCredentials);
    const secondUser = await registerUser(secondUserCredentials);

    const firstPost = await Post.create({
      title: "First user's post",
      content: "First user's content",
      author: new Types.ObjectId(firstUser.userId),
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    });

    await Post.create({
      title: "Second user's post",
      content: "Second user's content",
      author: new Types.ObjectId(secondUser.userId),
      createdAt: new Date("2026-01-02T00:00:00.000Z")
    });

    const response = await request(app)
      .get(`/api/v1/users/${firstUser.userId}/posts?page=1&limit=20`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.posts).toHaveLength(1);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1
    });
    expect(response.body.data.posts[0]).toMatchObject({
      id: firstPost._id.toString(),
      title: "First user's post",
      content: "First user's content",
      author: {
        id: firstUser.userId,
        name: firstUserCredentials.name,
        email: firstUserCredentials.email
      }
    });
    expect(response.body.data.posts[0].author).not.toHaveProperty(
      "passwordHash"
    );
  });

  it("paginates posts and sorts them newest first", async () => {
    const firstUser = await registerUser(firstUserCredentials);

    await Post.create([
      {
        title: "Old post",
        content: "Old content",
        author: new Types.ObjectId(firstUser.userId),
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      },
      {
        title: "New post",
        content: "New content",
        author: new Types.ObjectId(firstUser.userId),
        createdAt: new Date("2026-01-03T00:00:00.000Z")
      },
      {
        title: "Middle post",
        content: "Middle content",
        author: new Types.ObjectId(firstUser.userId),
        createdAt: new Date("2026-01-02T00:00:00.000Z")
      }
    ]);

    const response = await request(app)
      .get(`/api/v1/users/${firstUser.userId}/posts?page=1&limit=2`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2
    });
    expect(response.body.data.posts[0].title).toBe("New post");
    expect(response.body.data.posts[1].title).toBe("Middle post");
  });

  it("rejects an invalid user ID", async () => {
    const response = await request(app)
      .get("/api/v1/users/not-an-object-id/posts")
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid user ID"
    });
  });

  it("returns 404 when the target user does not exist", async () => {
    const response = await request(app)
      .get(`/api/v1/users/${new Types.ObjectId().toString()}/posts`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "User not found"
    });
  });
});
