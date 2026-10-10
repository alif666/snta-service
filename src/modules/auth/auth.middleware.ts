import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "@/config/env";
import type { AuthenticatedRequest } from "@/modules/auth/auth.types";
import { AppError } from "@/shared/errors/app-error";

export const authenticate = (
  request: Request,
  _response: Response,
  next: NextFunction
): void => {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    next(new AppError(401, "Authentication required"));
    return;
  }

  if (!env.jwtSecret) {
    next(new Error("JWT_SECRET is not configured"));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      (payload.role !== "user" && payload.role !== "admin")
    ) {
      next(new AppError(401, "Invalid or expired token"));
      return;
    }

    (request as AuthenticatedRequest).user = {
      userId: payload.sub,
      role: payload.role
    };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired token"));
  }
};
