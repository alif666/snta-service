import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { User } from "@/modules/users/user.model.js";
import { connectDatabase, disconnectDatabase } from "@/config/database.js";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000
    }
  });

  process.env.MONGODB_URI = mongoServer.getUri();

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

describe("User model", () => {
  it("persists a valid user", async () => {
    const user = await User.create({
      name: "Ahnaf Rahman",
      email: "ahnaf@example.com",
      passwordHash: "hashed-password",
      role: "user",
      interests: ["reading", "chess"]
    });

    expect(user.name).toBe("Ahnaf Rahman");
    expect(user.email).toBe("ahnaf@example.com");
    expect(user.passwordHash).toBe("hashed-password");
    expect(user.role).toBe("user");
    expect(user.interests).toEqual(["reading", "chess"]);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate email addresses", async () => {
    const user = {
      name: "Ahnaf Rahman",
      email: "duplicate@example.com",
      passwordHash: "hashed-password",
      role: "user",
      interests: []
    };

    await User.create(user);

    await expect(User.create(user)).rejects.toThrow();
  });

  it("rejects an invalid role", async () => {
    await expect(
      User.create({
        name: "Ahnaf Rahman",
        email: "admin@example.com",
        passwordHash: "hashed-password",
        role: "super-admin",
        interests: []
      })
    ).rejects.toThrow();
  });

  it("does not persist a plain-text password field", async () => {
    const user = await User.create({
      name: "Ahnaf Rahman",
      email: "password@example.com",
      password: "plain-text-password",
      passwordHash: "hashed-password",
      role: "user",
      interests: []
    });

    const storedUser = await User.findById(user._id).lean();

    expect(storedUser).not.toHaveProperty("password");
    expect(storedUser).toHaveProperty("passwordHash", "hashed-password");
  });
});

it("normalizes email addresses to lowercase", async () => {
  const user = await User.create({
    name: "Ahnaf Rahman",
    email: "AHNAF@EXAMPLE.COM",
    passwordHash: "hashed-password",
    role: "user",
    interests: []
  });

  expect(user.email).toBe("ahnaf@example.com");
});
