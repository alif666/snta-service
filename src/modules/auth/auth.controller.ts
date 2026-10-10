import type { NextFunction, Request, Response } from "express";
import {
  validateLoginInput,
  validateRegisterInput
} from "@/modules/auth/auth.validation";
import {
  loginUser,
  registerUser,
  toPublicUser
} from "@/modules/auth/auth.service";
import type { AuthenticatedRequest } from "@/modules/auth/auth.types";
import { findUserById } from "@/modules/users/user.repository";
import { AppError } from "@/shared/errors/app-error";

export const login = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateLoginInput(request.body);
    const result = await loginUser(input);
    response.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    next(error);
  }
};
export const register = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input = validateRegisterInput(request.body);
    const user = await registerUser(input);

    response.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const user = await findUserById(authenticatedRequest.user.userId);

    if (!user) {
      next(new AppError(401, "User is no longer available"));
      return;
    }

    response.status(200).json({
      success: true,
      message: "Authenticated user retrieved",
      data: {
        user: toPublicUser(user)
      }
    });
  } catch (error) {
    next(error);
  }
};
