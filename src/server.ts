import "./config/runtime-alias";

import { app } from "@/express-app";
import { connectDatabase, disconnectDatabase } from "@/config/database";
import { env } from "@/config/env";

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const server = app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
};

void startServer().catch((error: unknown) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
