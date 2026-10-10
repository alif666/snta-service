import { AppError } from "@/shared/errors/app-error";
import type { LoginInput, RegisterInput } from "@/modules/auth/auth.types";

export const validateRegisterInput = (value: unknown): RegisterInput => {
  if (typeof value !== "object" || value === null) {
    throw new AppError(400, "Invalid registration data");
  }

  const body = value as Record<string, unknown>;

  if (
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    throw new AppError(400, "Invalid registration data");
  }

  if (body.password.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters");
  }

  if (
    body.interests !== undefined &&
    (!Array.isArray(body.interests) ||
      !body.interests.every((interest) => typeof interest === "string"))
  ) {
    throw new AppError(400, "Interests must be an array of strings");
  }

  return {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    password: body.password,
    interests: body.interests as string[] | undefined
  };
};

export const validateLoginInput = (value: unknown): LoginInput => {
  if (typeof value !== "object" || value === null) {
    throw new AppError(400, "Invalid login data");
  }

  const body = value as Record<string, unknown>;

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    throw new AppError(400, "Invalid login data");
  }

  return {
    email: body.email.trim().toLowerCase(),
    password: body.password
  };
};
