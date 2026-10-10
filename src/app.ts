import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./shared/middleware/error.middleware";
import { notFoundHandler } from "./shared/middleware/not-found.middleware";
import { healthRouter } from "./modules/health/health.routes";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/v1/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
