import type { HydratedDocument } from "mongoose";

export const userRoles = ["user", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

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
