import type { HydratedDocument } from "mongoose";
import type { RegisterInput } from "@/modules/auth/auth.types";

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export interface ListUsersOptions {
  page: number;
  limit: number;
}

export interface ListUsersResult {
  users: UserDocument[];
  total: number;
}

export interface UserAttributes {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  interests: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserAttributes>;
export type CreateUserInput = Omit<UserAttributes, "createdAt" | "updatedAt">;

export interface AdminCreateUserInput extends RegisterInput {
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  interests?: string[];
}

export interface InterestAggregation {
  interest: string;
  userCount: number;
}
