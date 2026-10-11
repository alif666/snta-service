import type { Types } from "mongoose";
import type { PublicPost } from "@/modules/posts/post.types";
import { Post } from "@/modules/posts/post.model";

export const findPostsByUser = async (
  userId: Types.ObjectId,
  page: number,
  limit: number
): Promise<{ posts: PublicPost[]; total: number }> => {
  const skip = (page - 1) * limit;

  const [result] = await Post.aggregate([
    {
      $match: {
        author: userId
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author"
      }
    },
    {
      $unwind: "$author"
    },
    {
      $facet: {
        posts: [
          {
            $sort: {
              createdAt: -1
            }
          },
          {
            $skip: skip
          },
          {
            $limit: limit
          },
          {
            $project: {
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
            }
          }
        ],
        metadata: [
          {
            $count: "total"
          }
        ]
      }
    }
  ]);

  return {
    posts: result?.posts ?? [],
    total: result?.metadata[0]?.total ?? 0
  };
};
