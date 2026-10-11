import type { HydratedDocument, Types } from "mongoose";

export interface ListPostOptions {
  page: number;
  limit: number;
  author?: Types.ObjectId;
}

export interface ListPostResult {
  posts: PublicPost[];
  total: number;
}

export interface PostAttributes {
  title: string;
  content: string;
  author: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type PostDocument = HydratedDocument<PostAttributes>;
export type CreatePostInput = Omit<PostAttributes, "createdAt" | "updatedAt">;
export interface CreatePostPayload {
  title: string;
  content: string;
}
export interface UpdatePostInput {
  title?: string;
  content?: string;
}
export interface PublicPost {
  id: string;
  title: string;
  content: string;
  author: PublicPostAuthor;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicPostAuthor {
  id: string;
  name: string;
  email: string;
}
