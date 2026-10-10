import { model, models, Schema } from "mongoose";
import type { NoteAttributes } from "@/modules/notes/note.types";

const noteSchema = new Schema<NoteAttributes>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxLength: 200
    },
    content: {
      type: String,
      required: true,
      trim: true,
      minLength: 1,
      maxLength: 10_000
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

noteSchema.index({ author: 1, createdAt: -1 });
noteSchema.index({ createdAt: -1 });
export const Note = models.Note || model<NoteAttributes>("Note", noteSchema);
