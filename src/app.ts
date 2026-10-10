import cors from "cors";
import express from "express";
import helmet from "helmet";

import { healthRouter } from "@/modules/health/health.routes";
import { errorHandler } from "@/shared/middleware/error.middleware";
import { notFoundHandler } from "@/shared/middleware/not-found.middleware";
import { authRouter } from "@/modules/auth/auth.routes";
import { userRouter } from "@/modules/users/user.routes";
import { noteRouter } from "@/modules/notes/note.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/notes", noteRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
