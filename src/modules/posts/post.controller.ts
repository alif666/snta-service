import type { RequestHandler } from "express";
import { AppError } from "@/shared/errors/app-error";
import { listPosts } from "@/modules/posts/post.service";

export const listPostForUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const targetUserId = request.params.id.toString();
    const page = Number(request.query.page ?? 1);
    const limit = Number(request.query.limit ?? 20);

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      next(new AppError(400, "Invalid pagination parameters"));
      return;
    }

    const result = await listPosts(page, limit, targetUserId);

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
  } catch (error) {
    next(error);
  }
};
