import { userRoles, type UserRole } from "@/modules/users/user.types";

export const isUserRole = (value: unknown): value is UserRole => {
  return typeof value === "string" && userRoles.includes(value as UserRole);
};
