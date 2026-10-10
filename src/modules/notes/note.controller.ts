import type { RequestHandler } from "express";
import {
  validateCreateNoteInput,
  validateUpdateNoteInput
} from "@/modules/notes/note.validation";
import {
  createUserNote,
  findUserNoteById,
  findUserNoteByIdAndDelete,
  findUserNoteByIdAndUpdate,
  listNotes
} from "@/modules/notes/note.service";
import type { AuthenticatedRequest } from "@/modules/auth/auth.types";
import { AppError } from "@/shared/errors/app-error";

export const listNoteForUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { userId, role } = authenticatedRequest.user;
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

    const result = await listNotes(
      page,
      limit,
      role === "admin" ? undefined : userId
    );

    response.status(200).json({
      success: true,
      data: {
        notes: result.notes,
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

export const createNoteForUser: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const authorId = authenticatedRequest.user.userId;
    const input = validateCreateNoteInput(request.body);
    const createdNote = await createUserNote(authorId, input);
    response.status(201).json({
      success: true,
      message: "Note created successfully",
      data: {
        note: createdNote
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getNote: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const { userId, role } = authenticatedRequest.user;
    const noteId = request.params.id.toString();
    const foundNote = await findUserNoteById(noteId, userId, role);
    response.status(200).json({
      success: true,
      data: {
        note: foundNote
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNote: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user.userId;
    const noteId = request.params.id.toString();
    await findUserNoteByIdAndDelete(noteId, userId);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateNote: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const authenticatedRequest = request as AuthenticatedRequest;
    const userId = authenticatedRequest.user.userId;
    const noteId = request.params.id.toString();
    const input = validateUpdateNoteInput(request.body);
    const foundNote = await findUserNoteByIdAndUpdate(noteId, userId, input);
    response.status(200).json({
      success: true,
      message: "Note updated successfully",
      data: {
        note: foundNote
      }
    });
  } catch (error) {
    next(error);
  }
};
