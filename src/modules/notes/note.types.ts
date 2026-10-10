import type { HydratedDocument, Types } from "mongoose";

export interface ListNoteOptions {
  page: number;
  limit: number;
  author?: Types.ObjectId;
}

export interface ListNoteResult {
  notes: NoteDocument[];
  total: number;
}

export interface NoteAttributes {
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<NoteAttributes>;
export type CreateNoteInput = Omit<NoteAttributes, "createdAt" | "updatedAt">;
export interface CreateNotePayload {
  title: string;
  content: string;
}
export interface UpdateNoteInput {
  title?: string;
  content?: string;
}
export interface PublicNote {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}
