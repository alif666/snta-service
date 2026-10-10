import bcrypt from "bcryptjs";

import type { PublicUser } from "@/modules/auth/auth.types";
import {
  aggregateUsersByInterest,
  createUser,
  findUserByEmail
} from "@/modules/users/user.repository";
import type {
  AdminCreateUserInput,
  InterestAggregation,
  UserDocument,
  UserRole
} from "@/modules/users/user.types";
import { AppError } from "@/shared/errors/app-error";

export const toPublicUser = (user: UserDocument): PublicUser => ({
  email: user.email,
  id: user._id.toString(),
  interests: user.interests,
  name: user.name,
  role: user.role
});

export const createAdminUser = async (
  input: AdminCreateUserInput
): Promise<PublicUser> => {
  const email = input.email.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await createUser({
    name: input.name.trim(),
    email,
    passwordHash,
    role: input.role,
    interests: input.interests ?? []
  });

  return toPublicUser(user);
};

export const aggregateUsersByInterestForAdmin = async (
  role: UserRole
): Promise<InterestAggregation[]> => {
  if (role !== "admin") {
    throw new AppError(403, "User not authorized");
  }

  const result = await aggregateUsersByInterest();
  return result;
};
