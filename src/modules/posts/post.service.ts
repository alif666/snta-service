import { Types } from "mongoose";

import { findUserById } from "@/modules/users/user.repository";
import {
  createPost,
  findPostById,
  findPostByIdAndDelete,
  findPostByIdAndUpdate,
  findPosts
} from "@/modules/posts/post.repository";
import type {
  CreatePostPayload,
  PublicPost,
  UpdatePostInput
} from "@/modules/posts/post.types";
import { AppError } from "@/shared/errors/app-error";
import type { UserRole } from "@/modules/users/user.types";

export const createUserPost = async (
  authorId: string,
  input: CreatePostPayload
): Promise<PublicPost> => {
  const author = await getAuthor(authorId);
  const createdPost = await createPost({
    title: input.title,
    content: input.content,
    author: author._id
  });

  return getPostOrThrow(createdPost._id);
};

export const listAllPosts = async (
  page: number,
  limit: number
): Promise<{ posts: PublicPost[]; total: number }> => {
  return findPosts({ page, limit });
};

export const listPosts = async (
  page: number,
  limit: number,
  authorId: string
): Promise<{ posts: PublicPost[]; total: number }> => {
  const author = toUserObjectId(authorId);
  const targetUser = await findUserById(authorId);

  if (!targetUser) {
    throw new AppError(404, "User not found");
  }

  return findPosts({ page, limit, author });
};

export const getPublicPost = async (postId: string): Promise<PublicPost> => {
  const objectId = toPostObjectId(postId);
  return getPostOrThrow(objectId);
};

export const updateUserPost = async (
  postId: string,
  userId: string,
  role: UserRole,
  input: UpdatePostInput
): Promise<PublicPost> => {
  const objectId = toPostObjectId(postId);
  const author = role === "admin" ? undefined : await getAuthor(userId);
  const updatedPost = await findPostByIdAndUpdate(
    objectId.toString(),
    author?._id,
    input
  );

  if (!updatedPost) {
    throw new AppError(404, "Post not found");
  }

  return getPostOrThrow(updatedPost._id);
};

export const deleteUserPost = async (
  postId: string,
  userId: string,
  role: UserRole
): Promise<void> => {
  const objectId = toPostObjectId(postId);
  const author = role === "admin" ? undefined : await getAuthor(userId);
  const deletedPost = await findPostByIdAndDelete(
    objectId.toString(),
    author?._id
  );

  if (!deletedPost) {
    throw new AppError(404, "Post not found");
  }
};

const getAuthor = async (userId: string) => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(401, "Invalid authenticated user");
  }

  const author = await findUserById(userId);
  if (!author) {
    throw new AppError(401, "Invalid authenticated user");
  }

  return author;
};

const getPostOrThrow = async (postId: Types.ObjectId): Promise<PublicPost> => {
  const post = await findPostById(postId.toString());
  if (!post) {
    throw new AppError(404, "Post not found");
  }

  return post;
};

const toPostObjectId = (postId: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(postId)) {
    throw new AppError(400, "Invalid post ID");
  }

  return new Types.ObjectId(postId);
};

const toUserObjectId = (userId: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(userId)) {
    throw new AppError(400, "Invalid user ID");
  }

  return new Types.ObjectId(userId);
};
