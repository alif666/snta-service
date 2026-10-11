import type {
  CreatePostPayload,
  UpdatePostInput
} from "@/modules/posts/post.types";
import { AppError } from "@/shared/errors/app-error";

export const validateCreatePostInput = (input: unknown): CreatePostPayload => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError(400, "Invalid post data");
  }

  const body = input as Record<string, unknown>;

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    throw new AppError(400, "Title is required");
  }

  if (body.title.trim().length > 200) {
    throw new AppError(400, "Title must be 200 characters or fewer");
  }

  if (typeof body.content !== "string" || body.content.trim().length === 0) {
    throw new AppError(400, "Content is required");
  }

  if (body.content.trim().length > 10_000) {
    throw new AppError(400, "Content must be 10000 characters or fewer");
  }

  return {
    title: body.title.trim(),
    content: body.content.trim()
  };
};

export const validateUpdatePostInput = (input: unknown): UpdatePostInput => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new AppError(400, "Invalid post data");
  }

  const body = input as Record<string, unknown>;
  const hasTitle = Object.prototype.hasOwnProperty.call(body, "title");
  const hasContent = Object.prototype.hasOwnProperty.call(body, "content");

  if (!hasTitle && !hasContent) {
    throw new AppError(400, "At least one field is required for an update");
  }

  if (hasTitle) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      throw new AppError(400, "Title cannot be empty");
    }

    if (body.title.trim().length > 200) {
      throw new AppError(400, "Title must be 200 characters or fewer");
    }
  }

  if (hasContent) {
    if (typeof body.content !== "string" || body.content.trim().length === 0) {
      throw new AppError(400, "Content cannot be empty");
    }

    if (body.content.trim().length > 10_000) {
      throw new AppError(400, "Content must be 10000 characters or fewer");
    }
  }

  return {
    ...(hasTitle ? { title: (body.title as string).trim() } : {}),
    ...(hasContent ? { content: (body.content as string).trim() } : {})
  };
};
