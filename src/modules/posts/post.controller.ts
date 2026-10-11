import type { RequestHandler } from "express";

import type { AuthenticatedRequest } from "@/modules/auth/auth.types";
import {
  createUserPost,
  deleteUserPost,
  getPublicPost,
  listAllPosts,
  listPosts,
  updateUserPost
} from "@/modules/posts/post.service";
import {
  validateCreatePostInput,
  validateUpdatePostInput
} from "@/modules/posts/post.validation";
import { AppError } from "@/shared/errors/app-error";

export const listPostsPublicly: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const { page, limit } = getPagination(request.query);
    const result = await listAllPosts(page, limit);
    sendPostList(response, page, limit, result);
  } catch (error) {
    next(error);
  }
};

export const listPostsForUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const { page, limit } = getPagination(request.query);
    const result = await listPosts(page, limit, request.params.id.toString());
    sendPostList(response, page, limit, result);
  } catch (error) {
    next(error);
  }
};

export const createPostForUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const input = validateCreatePostInput(request.body);
    const post = await createUserPost(authenticatedRequest.user.userId, input);

    response.status(201).json({
      success: true,
      message: "Post created successfully",
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

export const getPost: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const post = await getPublicPost(request.params.id.toString());
    response.status(200).json({
      success: true,
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

export const updatePost: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const input = validateUpdatePostInput(request.body);
    const post = await updateUserPost(
      request.params.id.toString(),
      authenticatedRequest.user.userId,
      authenticatedRequest.user.role,
      input
    );

    response.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: { post }
    });
  } catch (error) {
    next(error);
  }
};

export const deletePost: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    await deleteUserPost(
      request.params.id.toString(),
      authenticatedRequest.user.userId,
      authenticatedRequest.user.role
    );
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

const getPagination = (
  query: Record<string, unknown>
): { page: number; limit: number } => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new AppError(400, "Invalid pagination parameters");
  }

  return { page, limit };
};

const sendPostList = (
  response: Parameters<RequestHandler>[1],
  page: number,
  limit: number,
  result: { posts: unknown[]; total: number }
): void => {
  response.status(200).json({
    success: true,
    data: {
      posts: result.posts,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    }
  });
};
