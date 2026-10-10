import type { UserRole } from "@/modules/users/user.types";
import type { Request } from "express";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  interests?: string[];
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  interests: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};
