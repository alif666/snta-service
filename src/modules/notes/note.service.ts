import type {
  CreateNoteInput,
  CreateNotePayload,
  NoteDocument,
  PublicNote,
  UpdateNoteInput
} from "@/modules/notes/note.types";
import {
  createNote,
  findNoteById,
  findNoteByIdAndDelete,
  findNoteByIdAndUpdate,
  findNotes
} from "@/modules/notes/note.repository";
import { Types } from "mongoose";
import { AppError } from "@/shared/errors/app-error";
import { findUserById } from "@/modules/users/user.repository";
import type { UserRole } from "@/modules/users/user.types";

export const createUserNote = async (
  authorId: string,
  input: CreateNotePayload
): Promise<PublicNote> => {
  if (!Types.ObjectId.isValid(authorId)) {
    throw new AppError(401, "Invalid authenticated user");
  }

  const author = await findUserById(authorId);
  if (!author) {
    throw new AppError(401, "Invalid authenticated user");
  }

  const noteInput: CreateNoteInput = {
    title: input.title,
    content: input.content,
    author: author._id
  };

  const createdNote = await createNote(noteInput);
  return toPublicNote(createdNote);
};

export const listNotes = async (
  page: number,
  limit: number,
  authorId?: string
): Promise<{
  notes: PublicNote[];
  total: number;
}> => {
  const author = toAuthorObjectId(authorId);
  const result = await findNotes({
    page,
    limit,
    author
  });

  return {
    notes: result.notes.map(toPublicNote),
    total: result.total
  };
};
export const findUserNoteByIdAndDelete = async (
  noteId: string,
  userId: string
): Promise<NoteDocument | null> => {
  if (!Types.ObjectId.isValid(noteId)) {
    throw new AppError(400, "Invalid note ID");
  }
  const note = await findNoteByIdAndDelete(noteId, userId);
  if (!note) {
    throw new AppError(404, "Note not found");
  }

  return note;
};
export const findUserNoteByIdAndUpdate = async (
  noteId: string,
  userId: string,
  input: UpdateNoteInput
): Promise<PublicNote> => {
  if (!Types.ObjectId.isValid(noteId)) {
    throw new AppError(400, "Invalid note ID");
  }
  const note = await findNoteByIdAndUpdate(noteId, userId, input);
  if (!note) {
    throw new AppError(404, "Note not found");
  }
  return toPublicNote(note);
};
export const findUserNoteById = async (
  noteId: string,
  userId: string,
  role: UserRole
): Promise<PublicNote> => {
  if (!Types.ObjectId.isValid(noteId)) {
    throw new AppError(400, "Invalid note ID");
  }
  const note = await findNoteById(noteId);
  if (!note) {
    throw new AppError(404, "Note not found");
  }
  if (note.author.toString() !== userId && role === "user") {
    throw new AppError(404, "Note not found");
  }

  return toPublicNote(note);
};

const toAuthorObjectId = (authorId?: string): Types.ObjectId | undefined => {
  if (authorId === undefined) {
    return undefined;
  }

  if (!Types.ObjectId.isValid(authorId)) {
    throw new AppError(401, "Invalid authenticated user");
  }

  return new Types.ObjectId(authorId);
};

export const toPublicNote = (note: NoteDocument): PublicNote => ({
  id: note._id.toString(),
  title: note.title,
  content: note.content,
  author: note.author.toString(),
  createdAt: note.createdAt,
  updatedAt: note.updatedAt
});
