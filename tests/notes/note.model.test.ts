import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { Note } from "@/modules/notes/note.model.js";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000
    }
  });

  process.env.MONGODB_URI = mongoServer.getUri();

  await connectDatabase();
  await Note.init();
}, 120_000);

beforeEach(async () => {
  await Note.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

describe("Note model", () => {
  it("persists a valid note", async () => {
    const author = new Types.ObjectId();

    const note = await Note.create({
      title: "My first note",
      content: "This is the content of my first note.",
      author
    });

    expect(note.title).toBe("My first note");
    expect(note.content).toBe("This is the content of my first note.");
    expect(note.author.toString()).toBe(author.toString());
    expect(note.createdAt).toBeInstanceOf(Date);
    expect(note.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects a note without a title", async () => {
    await expect(
      Note.create({
        content: "A note without a title",
        author: new Types.ObjectId()
      })
    ).rejects.toThrow();
  });

  it("rejects a note without content", async () => {
    await expect(
      Note.create({
        title: "A title without content",
        author: new Types.ObjectId()
      })
    ).rejects.toThrow();
  });

  it("rejects a note without an author", async () => {
    await expect(
      Note.create({
        title: "An orphan note",
        content: "This note has no author."
      })
    ).rejects.toThrow();
  });

  it("rejects an invalid author ID", async () => {
    await expect(
      Note.create({
        title: "Invalid author",
        content: "This note has an invalid author.",
        author: "not-a-valid-object-id"
      })
    ).rejects.toThrow();
  });

  it("defines the ownership and newest-first index", () => {
    const hasRequiredIndex = Note.schema.indexes().some(([fields]) => {
      return fields.author === 1 && fields.createdAt === -1;
    });

    expect(hasRequiredIndex).toBe(true);
  });

  it("defines a newest-first index for the admin note list", () => {
    const hasAdminListIndex = Note.schema.indexes().some(([fields]) => {
      return fields.createdAt === -1 && Object.keys(fields).length === 1;
    });

    expect(hasAdminListIndex).toBe(true);
  });
});
