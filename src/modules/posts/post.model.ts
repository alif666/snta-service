import { model, models, Schema } from "mongoose";
import type { PostAttributes } from "@/modules/posts/post.types";

const postSchema = new Schema<PostAttributes>(
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

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
export const Post = models.Post || model<PostAttributes>("Post", postSchema);
