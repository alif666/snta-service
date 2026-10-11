import type { PublicPost } from "@/modules/posts/post.types";
import { Types } from "mongoose";
import { AppError } from "@/shared/errors/app-error";
import { findPostsByUser } from "@/modules/posts/post.repository";
import { findUserById } from "@/modules/users/user.repository";

export const listPosts = async (
  page: number,
  limit: number,
  authorId: string
): Promise<{
  posts: PublicPost[];
  total: number;
}> => {
  const author = toAuthorObjectId(authorId);

  const targetUser = await findUserById(authorId);

  if (!targetUser) {
    throw new AppError(404, "User not found");
  }
  const result = await findPostsByUser(author, page, limit);

  return {
    posts: result.posts,
    total: result.total
  };
};
const toAuthorObjectId = (authorId: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(authorId)) {
    throw new AppError(400, "Invalid user ID");
  }

  return new Types.ObjectId(authorId);
};
