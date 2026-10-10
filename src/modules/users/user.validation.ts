import {
  userRoles,
  type UserRole,
  type UpdateUserInput,
  type AdminCreateUserInput
} from "@/modules/users/user.types";
import { AppError } from "@/shared/errors/app-error";
import { validateRegisterInput } from "@/modules/auth/auth.validation";

export const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === "string" && userRoles.includes(value as UserRole);
};

const allowedUpdateFields = ["name", "interests", "role"] as const;

export const validateUpdateUserInput = (input: unknown): UpdateUserInput => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError(400, "Invalid update data");
  }

  const body = input as Record<string, unknown>;
  const fields = Object.keys(body);

  if (fields.length === 0) {
    throw new AppError(400, "At least one field is required");
  }

  const hasUnknownField = fields.some(
    (field) =>
      !allowedUpdateFields.includes(
        field as (typeof allowedUpdateFields)[number]
      )
  );

  if (hasUnknownField) {
    throw new AppError(400, "Only name, interests, and role can be updated");
  }

  if (
    body.name !== undefined &&
    (typeof body.name !== "string" ||
      body.name.trim().length < 2 ||
      body.name.trim().length > 100)
  ) {
    throw new AppError(400, "Name must be between 2 and 100 characters");
  }

  if (
    body.interests !== undefined &&
    (!Array.isArray(body.interests) ||
      !body.interests.every((interest) => typeof interest === "string"))
  ) {
    throw new AppError(400, "Interests must be an array of strings");
  }

  if (body.role !== undefined && !isUserRole(body.role)) {
    throw new AppError(400, "Invalid role");
  }

  return {
    ...(body.name !== undefined && {
      name: body.name.trim()
    }),
    ...(body.interests !== undefined && {
      interests: body.interests
    }),
    ...(body.role !== undefined && {
      role: body.role
    })
  };
};

export const validateAdminCreateUserInput = (
  value: unknown
): AdminCreateUserInput => {
  const input = validateRegisterInput(value);
  const body = value as Record<string, unknown>;

  if (!isUserRole(body.role)) {
    throw new AppError(400, "Invalid role");
  }

  return {
    ...input,
    role: body.role
  };
};
