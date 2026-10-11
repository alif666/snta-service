import { Note } from "@/modules/notes/note.model";
import type {
  CreateNoteInput,
  ListNoteOptions,
  ListNoteResult,
  NoteDocument,
  UpdateNoteInput
} from "@/modules/notes/note.types";

export const createNote = async (
  input: CreateNoteInput
): Promise<NoteDocument> => {
  return Note.create(input);
};

export const findNotes = async ({
  page,
  limit,
  author
}: ListNoteOptions): Promise<ListNoteResult> => {
  const filter = author ? { author } : {};
  const skip = (page - 1) * limit;
  const [notes, total] = await Promise.all([
    Note.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    Note.countDocuments(filter).exec()
  ]);
  return {
    notes,
    total
  };
};

export const findNoteById = async (
  noteId: string
): Promise<NoteDocument | null> => {
  return Note.findById(noteId).exec();
};

export const findNoteByIdAndUpdate = async (
  noteId: string,
  userId: string,
  input: UpdateNoteInput
): Promise<NoteDocument | null> => {
  return Note.findOneAndUpdate(
    {
      _id: noteId,
      author: userId
    },
    input,
    {
      returnDocument: "after",
      runValidators: true
    }
  ).exec();
};

export const findNoteByIdAndDelete = async (
  noteId: string,
  userId: string
): Promise<NoteDocument | null> => {
  return Note.findOneAndDelete(
    {
      _id: noteId,
      author: userId
    },
    {
      returnDocument: "after",
      runValidators: true
    }
  ).exec();
};
