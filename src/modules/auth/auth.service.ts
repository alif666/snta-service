import type {
  LoginInput,
  PublicUser,
  RegisterInput
} from "@/modules/auth/auth.types";
import { createUser, findUserByEmail } from "@/modules/users/user.repository";
import { toPublicUser } from "@/modules/users/user.service";
import { AppError } from "@/shared/errors/app-error";
import bcrypt from "bcryptjs";
import { env } from "@/config/env";
import jwt, { type SignOptions } from "jsonwebtoken";

export const loginUser = async (
  input: LoginInput
): Promise<{ accessToken: string; user: PublicUser }> => {
  const email = input.email.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }
  const passwordMatches = await bcrypt.compare(
    input.password,
    user.passwordHash
  );
  if (!passwordMatches) {
    throw new AppError(401, "Invalid email or password");
  }
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  const accessToken = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"]
    }
  );

  return {
    accessToken,
    user: toPublicUser(user)
  };
};

export const registerUser = async (
  input: RegisterInput
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
    role: "user",
    interests: input.interests ?? []
  });

  return toPublicUser(user);
};
