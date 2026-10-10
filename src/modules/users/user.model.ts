import { model, models, Schema } from "mongoose";
import type { UserAttributes } from "@/modules/users/user.types";
import { userRoles } from "@/modules/users/user.types";

const userSchema = new Schema<UserAttributes>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: userRoles,
      required: true,
      default: "user"
    },
    interests: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

export const User = models.User || model<UserAttributes>("User", userSchema);
