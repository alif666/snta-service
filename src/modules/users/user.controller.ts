import type { RequestHandler } from "express";
import {
  findUserById,
  findUsers,
  findUserByIdAndUpdate,
  findUserByIdAndDelete
} from "@/modules/users/user.repository";
import {
  aggregateUsersByInterestForAdmin,
  createAdminUser as createAdminUserService,
  toPublicUser
} from "@/modules/users/user.service";
import { AppError } from "@/shared/errors/app-error";
import {
  validateAdminCreateUserInput,
  validateUpdateUserInput
} from "@/modules/users/user.validation";
import type { AuthenticatedRequest } from "@/modules/auth/auth.types";

export const listUsers: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
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

    const result = await findUsers({
      page,
      limit
    });
    response.status(200).json({
      success: true,
      data: {
        users: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.total === 0 ? 0 : Math.ceil(result.total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const userId = request.params.id.toString();
    const user = await findUserById(userId);
    if (!user) {
      next(new AppError(404, "User not found"));
      return;
    }

    response.status(200).json({
      success: true,
      data: {
        user: toPublicUser(user)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const input = validateUpdateUserInput(request.body);
    const userId = request.params.id.toString();
    const result = await findUserByIdAndUpdate(userId, input);
    if (!result) throw new AppError(404, "User not found");

    response.status(200).json({
      success: true,
      message: "Updated successfully",
      data: {
        user: toPublicUser(result)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const userId = request.params.id.toString();
    const result = await findUserByIdAndDelete(userId);
    if (!result) {
      next(new AppError(404, "User not found"));
      return;
    }
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const createAdminUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const input = validateAdminCreateUserInput(request.body);
    const adminUser = await createAdminUserService(input);
    response.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: adminUser
      }
    });
  } catch (error) {
    next(error);
  }
};

export const findAggregateUsersByInterestForAdmin: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const role = authenticatedRequest.user.role;
    const result = await aggregateUsersByInterestForAdmin(role);

    response.status(200).json({
      success: true,
      data: {
        interests: result
      }
    });
  } catch (error) {
    next(error);
  }
};
