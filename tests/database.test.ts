import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

let mongoServer: MongoMemoryServer;
let database: {
  connectDatabase: () => Promise<typeof mongoose>;
  disconnectDatabase: () => Promise<void>;
};

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      launchTimeout: 120_000
    }
  });
  process.env.MONGODB_URI = mongoServer.getUri();

  database = await import("../src/config/database.js");

  await database.connectDatabase();
}, 120_000);

afterAll(async () => {
  if (database) {
    await database.disconnectDatabase();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("MongoDB connection", () => {
  it("connects to the configured database", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
}, 120_000);
