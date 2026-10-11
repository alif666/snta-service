import bcrypt from "bcryptjs";

import { connectDatabase, disconnectDatabase } from "@/config/database";
import { env } from "@/config/env";
import { Note } from "@/modules/notes/note.model";
import { Post } from "@/modules/posts/post.model";
import { User } from "@/modules/users/user.model";

const seedConfig = {
  adminName: process.env.SEED_ADMIN_NAME ?? "Luma Demo Admin",
  adminEmail: requiredEnv("SEED_ADMIN_EMAIL"),
  adminPassword: requiredEnv("SEED_ADMIN_PASSWORD"),
  userName: process.env.SEED_USER_NAME ?? "Luma Demo Writer",
  userEmail: requiredEnv("SEED_USER_EMAIL"),
  userPassword: requiredEnv("SEED_USER_PASSWORD")
};

async function seedDemoData(): Promise<void> {
  if (process.env.SEED_CONFIRM !== "seed-demo") {
    throw new Error(
      'Refusing to seed data. Set SEED_CONFIRM="seed-demo" to continue.'
    );
  }

  if (!env.mongodbUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  await connectDatabase();

  const [adminPasswordHash, userPasswordHash] = await Promise.all([
    bcrypt.hash(seedConfig.adminPassword, 12),
    bcrypt.hash(seedConfig.userPassword, 12)
  ]);

  const admin = await User.findOneAndUpdate(
    { email: seedConfig.adminEmail.toLowerCase() },
    {
      $set: {
        name: seedConfig.adminName,
        email: seedConfig.adminEmail.toLowerCase(),
        passwordHash: adminPasswordHash,
        role: "admin",
        interests: ["leadership", "product", "security"]
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();

  const user = await User.findOneAndUpdate(
    { email: seedConfig.userEmail.toLowerCase() },
    {
      $set: {
        name: seedConfig.userName,
        email: seedConfig.userEmail.toLowerCase(),
        passwordHash: userPasswordHash,
        role: "user",
        interests: ["writing", "design", "technology"]
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).exec();

  await Promise.all([
    upsertNote(
      user._id,
      "A place to begin",
      "Good tools make space for better thinking. This is a private demo note."
    ),
    upsertNote(
      user._id,
      "Ideas to explore",
      "What would I make if I cared less about perfect and more about useful?"
    ),
    upsertNote(
      admin._id,
      "Team reflection",
      "Small, consistent improvements compound into a workspace people trust."
    ),
    upsertPost(
      user._id,
      "The value of a blank page",
      "A blank page is not asking for a masterpiece. It is simply making room."
    ),
    upsertPost(
      user._id,
      "Build for the next thought",
      "The best interface is often the one that gets out of the way at exactly the right moment."
    ),
    upsertPost(
      admin._id,
      "A thoughtful workspace",
      "Privacy and openness are not opposites. Good product boundaries make both possible."
    )
  ]);

  console.log("Demo data seeded successfully.");
  console.log(`Admin login: ${seedConfig.adminEmail}`);
  console.log(`User login: ${seedConfig.userEmail}`);
}

async function upsertNote(
  author: typeof User.prototype._id,
  title: string,
  content: string
): Promise<void> {
  await Note.findOneAndUpdate(
    { author, title },
    { $set: { content } },
    { upsert: true, setDefaultsOnInsert: true }
  ).exec();
}

async function upsertPost(
  author: typeof User.prototype._id,
  title: string,
  content: string
): Promise<void> {
  await Post.findOneAndUpdate(
    { author, title },
    { $set: { content } },
    { upsert: true, setDefaultsOnInsert: true }
  ).exec();
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required when running the demo seed`);
  }

  return value;
}

seedDemoData()
  .catch((error: unknown) => {
    console.error("Demo seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
