import type {
  CreateUserInput,
  InterestAggregation,
  ListUsersOptions,
  ListUsersResult,
  UpdateUserInput,
  UserDocument
} from "@/modules/users/user.types";
import { User } from "@/modules/users/user.model";

export const createUser = async (
  input: CreateUserInput
): Promise<UserDocument> => {
  return User.create(input);
};

export const findUserByIdAndUpdate = async (
  userId: string,
  input: UpdateUserInput
): Promise<UserDocument | null> => {
  return User.findByIdAndUpdate(userId, input, {
    returnDocument: "after",
    runValidators: true
  })
    .select("-passwordHash")
    .exec();
};

export const findUserByIdAndDelete = async (
  userId: string
): Promise<UserDocument | null> => {
  return User.findByIdAndDelete(userId).exec();
};

export const findUserByEmail = async (
  email: string
): Promise<UserDocument | null> => {
  return User.findOne({
    email: email.toLowerCase()
  }).exec();
};

export const findUserById = async (
  userId: string
): Promise<UserDocument | null> => {
  return User.findById(userId).select("-passwordHash").exec();
};

export const findUsers = async ({
  page,
  limit
}: ListUsersOptions): Promise<ListUsersResult> => {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec(),
    User.countDocuments().exec()
  ]);
  return {
    users,
    total
  };
};

export const aggregateUsersByInterest = async (): Promise<
  InterestAggregation[]
> => {
  return User.aggregate([
    {
      $unwind: "$interests"
    },
    {
      $group: {
        _id: {
          interest: "$interests",
          userId: "$_id"
        }
      }
    },
    {
      $group: {
        _id: "$_id.interest",
        userCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        interest: "$_id",
        userCount: 1
      }
    },
    {
      $sort: {
        userCount: -1,
        interest: 1
      }
    }
  ]);
};
