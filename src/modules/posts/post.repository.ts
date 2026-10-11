import { Types } from "mongoose";

import { Post } from "@/modules/posts/post.model";
import type {
  CreatePostInput,
  ListPostOptions,
  ListPostResult,
  PostDocument,
  PublicPost,
  UpdatePostInput
} from "@/modules/posts/post.types";

const publicPostProjection = {
  _id: 0,
  id: { $toString: "$_id" },
  title: 1,
  content: 1,
  author: {
    id: { $toString: "$author._id" },
    name: "$author.name",
    email: "$author.email"
  },
  createdAt: 1,
  updatedAt: 1
};

export const createPost = async (
  input: CreatePostInput
): Promise<PostDocument> => {
  return Post.create(input);
};

export const findPosts = async ({
  page,
  limit,
  author
}: ListPostOptions): Promise<ListPostResult> => {
  const skip = (page - 1) * limit;
  const match = author ? { author } : {};

  const [result] = await Post.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author"
      }
    },
    { $unwind: "$author" },
    {
      $facet: {
        posts: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: publicPostProjection }
        ],
        metadata: [{ $count: "total" }]
      }
    }
  ]);

  return {
    posts: result?.posts ?? [],
    total: result?.metadata[0]?.total ?? 0
  };
};

export const findPostById = async (
  postId: string
): Promise<PublicPost | null> => {
  const [post] = await Post.aggregate([
    { $match: { _id: new Types.ObjectId(postId) } },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author"
      }
    },
    { $unwind: "$author" },
    { $project: publicPostProjection }
  ]);

  return post ?? null;
};

export const findPostByIdAndUpdate = async (
  postId: string,
  author: Types.ObjectId | undefined,
  input: UpdatePostInput
): Promise<PostDocument | null> => {
  return Post.findOneAndUpdate(
    author ? { _id: postId, author } : { _id: postId },
    input,
    { returnDocument: "after", runValidators: true }
  ).exec();
};

export const findPostByIdAndDelete = async (
  postId: string,
  author: Types.ObjectId | undefined
): Promise<PostDocument | null> => {
  return Post.findOneAndDelete(
    author ? { _id: postId, author } : { _id: postId }
  ).exec();
};
