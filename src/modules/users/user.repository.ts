import type { CreateUserInput, UserDocument } from "@/modules/users/user.types";
import { User } from "@/modules/users/user.model";

export const createUser = async (
  input: CreateUserInput
): Promise<UserDocument> => {
  return User.create(input);
};

export const findUserByEmail = async (
  email: string
): Promise<UserDocument | null> => {
  return User.findOne({
    email: email.toLowerCase()
  }).exec();
};

export const findUserById = async (
  userId: string
): Promise<UserDocument | null> => {
  return User.findById(userId).exec();
};
