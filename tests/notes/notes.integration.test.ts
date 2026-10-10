import jwt from "jsonwebtoken";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "@/app";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { Note } from "@/modules/notes/note.model.js";
import { User } from "@/modules/users/user.model.js";

let mongoServer: MongoMemoryServer;

const userCredentials = {
  name: "Note Owner",
  email: "note-owner@example.com",
  password: "StrongPassword123",
  interests: ["writing"]
};

const anotherUserCredentials = {
  name: "Another Note Owner",
  email: "another-note-owner@example.com",
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
  await Note.init();
}, 120_000);

beforeEach(async () => {
  await Note.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

const registerAndLoginUser = async (
  credentials = userCredentials
): Promise<{
  accessToken: string;
  userId: string;
}> => {
  await request(app).post("/api/v1/auth/register").send(credentials);

  const loginResponse = await request(app).post("/api/v1/auth/login").send({
    email: credentials.email,
    password: credentials.password
  });

  return {
    accessToken: loginResponse.body.data.accessToken as string,
    userId: loginResponse.body.data.user.id as string
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

const createToken = (userId: string, role: "user" | "admin"): string =>
  jwt.sign(
    {
      sub: userId,
      role
    },
    "test-jwt-secret",
    { expiresIn: "1d" }
  );

const createNote = async (
  accessToken: string,
  title: string,
  content = "Note content"
): Promise<string> => {
  const response = await request(app)
    .post("/api/v1/notes")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ title, content });

  expect(response.status).toBe(201);
  return response.body.data.note.id as string;
};

describe("POST /api/v1/notes", () => {
  it("creates a note for the authenticated user", async () => {
    const { accessToken, userId } = await registerAndLoginUser();

    const response = await request(app)
      .post("/api/v1/notes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "My first note",
        content: "Important note content"
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Note created successfully");
    expect(response.body.data.note).toMatchObject({
      title: "My first note",
      content: "Important note content",
      author: userId
    });
    expect(response.body.data.note).toHaveProperty("id");
    expect(response.body.data.note).toHaveProperty("createdAt");
    expect(response.body.data.note).toHaveProperty("updatedAt");

    const storedNote = await Note.findOne({ title: "My first note" }).lean();

    expect(storedNote).not.toBeNull();
    expect(storedNote?.author.toString()).toBe(userId);
  });

  it("does not allow the client to choose the note author", async () => {
    const { accessToken, userId } = await registerAndLoginUser();
    const anotherUserId = new Types.ObjectId().toString();

    const response = await request(app)
      .post("/api/v1/notes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "Protected ownership",
        content: "The JWT must determine the author.",
        author: anotherUserId
      });

    expect(response.status).toBe(201);
    expect(response.body.data.note.author).toBe(userId);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app).post("/api/v1/notes").send({
      title: "Unauthenticated note",
      content: "This should not be created."
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects a note without a title", async () => {
    const { accessToken } = await registerAndLoginUser();

    const response = await request(app)
      .post("/api/v1/notes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        content: "This note has no title."
      });

    expect(response.status).toBe(400);
  });

  it("rejects a note without content", async () => {
    const { accessToken } = await registerAndLoginUser();

    const response = await request(app)
      .post("/api/v1/notes")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        title: "This note has no content."
      });

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/notes", () => {
  it("returns only the authenticated user's notes", async () => {
    const currentUser = await registerAndLoginUser();
    const anotherUser = await registerAndLoginUser(anotherUserCredentials);

    await createNote(currentUser.accessToken, "Current user's first note");
    await createNote(currentUser.accessToken, "Current user's second note");
    await createNote(anotherUser.accessToken, "Another user's note");

    const response = await request(app)
      .get("/api/v1/notes?page=1&limit=20")
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notes).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1
    });

    for (const note of response.body.data.notes) {
      expect(note.author).toBe(currentUser.userId);
      expect(note).toHaveProperty("id");
      expect(note).not.toHaveProperty("_id");
    }
  });

  it("allows an admin to view notes from all users", async () => {
    const firstUser = await registerAndLoginUser();
    const secondUser = await registerAndLoginUser(anotherUserCredentials);

    await createNote(firstUser.accessToken, "First user's note");
    await createNote(secondUser.accessToken, "Second user's note");

    const response = await request(app)
      .get("/api/v1/notes?page=1&limit=20")
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.notes).toHaveLength(2);
    expect(response.body.data.pagination.total).toBe(2);
    expect(
      response.body.data.notes.map((note: { author: string }) => note.author)
    ).toEqual(expect.arrayContaining([firstUser.userId, secondUser.userId]));
  });

  it("paginates the authenticated user's notes and sorts newest first", async () => {
    const currentUser = await registerAndLoginUser();

    await createNote(currentUser.accessToken, "First note");
    await createNote(currentUser.accessToken, "Second note");
    await createNote(currentUser.accessToken, "Third note");

    const response = await request(app)
      .get("/api/v1/notes?page=1&limit=2")
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.notes).toHaveLength(2);
    expect(response.body.data.pagination).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2
    });

    const [firstNote, secondNote] = response.body.data.notes;
    expect(new Date(firstNote.createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(secondNote.createdAt).getTime()
    );
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app).get("/api/v1/notes");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });

  it("rejects invalid pagination parameters", async () => {
    const currentUser = await registerAndLoginUser();

    const response = await request(app)
      .get("/api/v1/notes?page=0&limit=101")
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(400);
  });
});

describe("GET /api/v1/notes/:id", () => {
  it("allows a user to view their own note", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(
      currentUser.accessToken,
      "My private note",
      "Private note content"
    );

    const response = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        note: expect.objectContaining({
          id: noteId,
          title: "My private note",
          content: "Private note content",
          author: currentUser.userId
        })
      }
    });
  });

  it("does not allow a user to view another user's note", async () => {
    const noteOwner = await registerAndLoginUser();
    const anotherUser = await registerAndLoginUser(anotherUserCredentials);
    const noteId = await createNote(
      noteOwner.accessToken,
      "Private owner note"
    );

    const response = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${anotherUser.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });
  });

  it("allows an admin to view any user's note", async () => {
    const noteOwner = await registerAndLoginUser();
    const noteId = await createNote(
      noteOwner.accessToken,
      "Admin visible note"
    );

    const response = await request(app)
      .get(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${createAdminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body.data.note).toMatchObject({
      id: noteId,
      title: "Admin visible note",
      author: noteOwner.userId
    });
  });

  it("rejects an invalid note ID", async () => {
    const currentUser = await registerAndLoginUser();

    const response = await request(app)
      .get("/api/v1/notes/not-an-object-id")
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid note ID"
    });
  });

  it("returns 404 when the note does not exist", async () => {
    const currentUser = await registerAndLoginUser();
    const missingNoteId = new Types.ObjectId().toString();

    const response = await request(app)
      .get(`/api/v1/notes/${missingNoteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app).get(
      `/api/v1/notes/${new Types.ObjectId().toString()}`
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });
});

describe("PATCH /api/v1/notes/:id", () => {
  it("allows a user to update their own note", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(
      currentUser.accessToken,
      "Original title",
      "Original content"
    );

    const response = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "Note updated successfully",
      data: {
        note: expect.objectContaining({
          id: noteId,
          title: "Updated title",
          content: "Original content",
          author: currentUser.userId
        })
      }
    });
  });

  it("does not allow a user to update another user's note", async () => {
    const noteOwner = await registerAndLoginUser();
    const anotherUser = await registerAndLoginUser(anotherUserCredentials);
    const noteId = await createNote(noteOwner.accessToken, "Owner title");

    const response = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${anotherUser.accessToken}`)
      .send({ title: "Unauthorized update" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });

    const storedNote = await Note.findById(noteId).lean();

    expect(storedNote).not.toBeNull();
    expect(storedNote?.title).toBe("Owner title");
  });

  it("does not allow the client to change the note author", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(
      currentUser.accessToken,
      "Protected author"
    );
    const anotherUserId = new Types.ObjectId().toString();

    const response = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`)
      .send({
        content: "Updated content",
        author: anotherUserId
      });

    expect(response.status).toBe(200);
    expect(response.body.data.note.author).toBe(currentUser.userId);
  });

  it("rejects an invalid note ID", async () => {
    const currentUser = await registerAndLoginUser();

    const response = await request(app)
      .patch("/api/v1/notes/not-an-object-id")
      .set("Authorization", `Bearer ${currentUser.accessToken}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid note ID"
    });
  });

  it("returns 404 when the note does not exist", async () => {
    const currentUser = await registerAndLoginUser();
    const missingNoteId = new Types.ObjectId().toString();

    const response = await request(app)
      .patch(`/api/v1/notes/${missingNoteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`)
      .send({ title: "Updated title" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });
  });

  it("rejects an empty update payload", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(currentUser.accessToken, "Existing title");

    const response = await request(app)
      .patch(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`)
      .send({});

    expect(response.status).toBe(400);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app)
      .patch(`/api/v1/notes/${new Types.ObjectId().toString()}`)
      .send({ title: "Unauthorized update" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });
});

describe("DELETE /api/v1/notes/:id", () => {
  it("allows a user to delete their own note", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(currentUser.accessToken, "Note to delete");

    const response = await request(app)
      .delete(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(204);

    const deletedNote = await Note.findById(noteId);
    expect(deletedNote).toBeNull();
  });

  it("does not allow a user to delete another user's note", async () => {
    const noteOwner = await registerAndLoginUser();
    const anotherUser = await registerAndLoginUser(anotherUserCredentials);
    const noteId = await createNote(noteOwner.accessToken, "Protected note");

    const response = await request(app)
      .delete(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${anotherUser.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });

    const storedNote = await Note.findById(noteId);
    expect(storedNote).not.toBeNull();
  });

  it("allows an admin to delete their own note", async () => {
    const currentUser = await registerAndLoginUser();
    const noteId = await createNote(currentUser.accessToken, "Admin note");
    const adminToken = createToken(currentUser.userId, "admin");

    const response = await request(app)
      .delete(`/api/v1/notes/${noteId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(204);
    expect(await Note.findById(noteId)).toBeNull();
  });

  it("rejects an invalid note ID", async () => {
    const currentUser = await registerAndLoginUser();

    const response = await request(app)
      .delete("/api/v1/notes/not-an-object-id")
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Invalid note ID"
    });
  });

  it("returns 404 when the note does not exist", async () => {
    const currentUser = await registerAndLoginUser();
    const missingNoteId = new Types.ObjectId().toString();

    const response = await request(app)
      .delete(`/api/v1/notes/${missingNoteId}`)
      .set("Authorization", `Bearer ${currentUser.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      message: "Note not found"
    });
  });

  it("rejects an unauthenticated request", async () => {
    const response = await request(app).delete(
      `/api/v1/notes/${new Types.ObjectId().toString()}`
    );

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: "Authentication required"
    });
  });
});
