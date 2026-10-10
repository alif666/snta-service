import type { ErrorRequestHandler } from "express";

import { AppError } from "@/shared/errors/app-error";

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next
): void => {
  console.error(error);

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message
    });

    return;
  }

  response.status(500).json({
    success: false,
    message: "Internal server error"
  });
};
