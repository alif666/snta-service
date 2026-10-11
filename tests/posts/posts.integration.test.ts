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

const createPostDocument = async (userId: string, title = "Stored post") => {
  return Post.create({
    title,
    content: "Stored post content",
    author: new Types.ObjectId(userId)
  });
};

describe("POST /api/v1/posts", () => {
  it("creates a post for the authenticated user", async () => {
    const user = await registerUser(firstUserCredentials);

    const response = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({
        title: "My post",
        content: "Post content",
        author: new Types.ObjectId().toString()
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      message: "Post created successfully",
      data: {
        post: {
          title: "My post",
          content: "Post content",
          author: {
            id: user.userId,
            name: firstUserCredentials.name,
            email: firstUserCredentials.email
          }
        }
      }
    });
  });

  it("rejects unauthenticated creation", async () => {
    const response = await request(app).post("/api/v1/posts").send({
      title: "My post",
      content: "Post content"
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects invalid post data", async () => {
    const user = await registerUser(firstUserCredentials);

    const response = await request(app)
      .post("/api/v1/posts")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ title: "", content: "Post content" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Title is required"
    });
  });
});

describe("GET /api/v1/posts", () => {
  it("lists posts publicly with pagination", async () => {
    const firstUser = await registerUser(firstUserCredentials);
    const secondUser = await registerUser(secondUserCredentials);

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
        author: new Types.ObjectId(secondUser.userId),
        createdAt: new Date("2026-01-03T00:00:00.000Z")
      }
    ]);

    const response = await request(app).get("/api/v1/posts?page=1&limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2
    });
    expect(response.body.data.posts[0]).toMatchObject({
      title: "New post",
      author: {
        id: secondUser.userId,
        name: secondUserCredentials.name
      }
    });
  });

  it("rejects invalid pagination", async () => {
    const response = await request(app).get("/api/v1/posts?page=0");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid pagination parameters"
    });
  });
});

describe("GET /api/v1/posts/:id", () => {
  it("returns a post publicly", async () => {
    const user = await registerUser(firstUserCredentials);
    const post = await createPostDocument(user.userId);

    const response = await request(app).get(
      `/api/v1/posts/${post._id.toString()}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data.post).toMatchObject({
      id: post._id.toString(),
      title: "Stored post",
      author: { id: user.userId }
    });
  });

  it("rejects an invalid post ID", async () => {
    const response = await request(app).get("/api/v1/posts/not-an-id");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid post ID"
    });
  });

  it("returns 404 when the post does not exist", async () => {
    const response = await request(app).get(
      `/api/v1/posts/${new Types.ObjectId().toString()}`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Post not found"
    });
  });
});

describe("GET /api/v1/users/:id/posts", () => {
  it("is publicly accessible", async () => {
    const user = await registerUser(firstUserCredentials);
    await createPostDocument(user.userId);

    const response = await request(app).get(
      `/api/v1/users/${user.userId}/posts`
    );

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toHaveLength(1);
  });

  it("returns the target user's posts with joined author data", async () => {
    const firstUser = await registerUser(firstUserCredentials);
    const secondUser = await registerUser(secondUserCredentials);
    const firstPost = await createPostDocument(
      firstUser.userId,
      "First user's post"
    );
    await createPostDocument(secondUser.userId, "Second user's post");

    const response = await request(app).get(
      `/api/v1/users/${firstUser.userId}/posts?page=1&limit=20`
    );

    expect(response.status).toBe(200);
    expect(response.body.data.posts).toHaveLength(1);
    expect(response.body.data.posts[0]).toMatchObject({
      id: firstPost._id.toString(),
      title: "First user's post",
      author: {
        id: firstUser.userId,
        name: firstUserCredentials.name,
        email: firstUserCredentials.email
      }
    });
  });

  it("rejects an invalid user ID", async () => {
    const response = await request(app).get(
      "/api/v1/users/not-an-object-id/posts"
    );

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid user ID"
    });
  });

  it("returns 404 when the target user does not exist", async () => {
    const response = await request(app).get(
      `/api/v1/users/${new Types.ObjectId().toString()}/posts`
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "User not found"
    });
  });
});

describe("PATCH /api/v1/posts/:id", () => {
  it("allows the owner to update a post", async () => {
    const user = await registerUser(firstUserCredentials);
    const post = await createPostDocument(user.userId);

    const response = await request(app)
      .patch(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${user.accessToken}`)
      .send({ title: "Updated post" });

    expect(response.status).toBe(200);
    expect(response.body.data.post).toMatchObject({
      id: post._id.toString(),
      title: "Updated post"
    });
  });

  it("rejects another user from updating a post", async () => {
    const owner = await registerUser(firstUserCredentials);
    const anotherUser = await registerUser(secondUserCredentials);
    const post = await createPostDocument(owner.userId);

    const response = await request(app)
      .patch(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${anotherUser.accessToken}`)
      .send({ title: "Unauthorized update" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Post not found"
    });
  });

  it("allows an admin to update any post", async () => {
    const owner = await registerUser(firstUserCredentials);
    const post = await createPostDocument(owner.userId);

    const response = await request(app)
      .patch(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${createAdminToken()}`)
      .send({ content: "Admin updated content" });

    expect(response.status).toBe(200);
    expect(response.body.data.post.content).toBe("Admin updated content");
  });
});

describe("DELETE /api/v1/posts/:id", () => {
  it("allows the owner to delete a post", async () => {
    const user = await registerUser(firstUserCredentials);
    const post = await createPostDocument(user.userId);

    const response = await request(app)
      .delete(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(204);
    expect(await Post.findById(post._id)).toBeNull();
  });

  it("rejects another user from deleting a post", async () => {
    const owner = await registerUser(firstUserCredentials);
    const anotherUser = await registerUser(secondUserCredentials);
    const post = await createPostDocument(owner.userId);

    const response = await request(app)
      .delete(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${anotherUser.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Post not found"
    });
  });

  it("allows an admin to delete any post", async () => {
    const owner = await registerUser(firstUserCredentials);
    const post = await createPostDocument(owner.userId);

    const response = await request(app)
      .delete(`/api/v1/posts/${post._id.toString()}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(204);
    expect(await Post.findById(post._id)).toBeNull();
  });
});
