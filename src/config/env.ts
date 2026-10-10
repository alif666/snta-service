import dotenv from "dotenv";

dotenv.config();
export const env = {
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },

  get port() {
    const port = Number.parseInt(process.env.PORT ?? "5000", 10);

    if (Number.isNaN(port)) {
      throw new Error("PORT must be a valid number");
    }

    return port;
  },

  get mongodbUri() {
    return process.env.MONGODB_URI;
  }
} as const;
