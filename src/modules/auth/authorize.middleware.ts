import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "@/modules/auth/auth.types";
import type { UserRole } from "@/modules/users/user.types";
import { AppError } from "@/shared/errors/app-error";

export const authorizeRoles = (...allowedRoles: UserRole[]): RequestHandler => {
  return (request, _response, next) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      next(new AppError(401, "Authentication required"));
      return;
    }

    if (!allowedRoles.includes(authenticatedRequest.user.role)) {
      next(new AppError(403, "Forbidden"));
      return;
    }

    next();
  };
};
