import { MongoMemoryServer } from "mongodb-memory-server";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { connectDatabase, disconnectDatabase } from "@/config/database.js";
import { Post } from "@/modules/posts/post.model.js";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000
    }
  });

  process.env.MONGODB_URI = mongoServer.getUri();

  await connectDatabase();
  await Post.init();
}, 120_000);

beforeEach(async () => {
  await Post.deleteMany({});
});

afterAll(async () => {
  await disconnectDatabase();
  await mongoServer.stop();
});

describe("Post model", () => {
  it("persists a valid post", async () => {
    const author = new Types.ObjectId();

    const post = await Post.create({
      title: "My first post",
      content: "This is the content of my first post.",
      author
    });

    expect(post.title).toBe("My first post");
    expect(post.content).toBe("This is the content of my first post.");
    expect(post.author.toString()).toBe(author.toString());
    expect(post.createdAt).toBeInstanceOf(Date);
    expect(post.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects a post without a title", async () => {
    await expect(
      Post.create({
        content: "A post without a title",
        author: new Types.ObjectId()
      })
    ).rejects.toThrow();
  });

  it("rejects a post without content", async () => {
    await expect(
      Post.create({
        title: "A title without content",
        author: new Types.ObjectId()
      })
    ).rejects.toThrow();
  });

  it("rejects a post without an author", async () => {
    await expect(
      Post.create({
        title: "An orphan post",
        content: "This post has no author."
      })
    ).rejects.toThrow();
  });

  it("rejects an invalid author ID", async () => {
    await expect(
      Post.create({
        title: "Invalid author",
        content: "This post has an invalid author.",
        author: "not-a-valid-object-id"
      })
    ).rejects.toThrow();
  });

  it("defines the author and newest-first index", () => {
    const hasRequiredIndex = Post.schema.indexes().some(([fields]) => {
      return fields.author === 1 && fields.createdAt === -1;
    });

    expect(hasRequiredIndex).toBe(true);
  });
});
