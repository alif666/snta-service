import dotenv from "dotenv";

dotenv.config();

const port = Number.parseInt(process.env.PORT ?? "5000", 10);

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number");
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port,
  mongodbUri: process.env.MONGODB_URI
} as const;
