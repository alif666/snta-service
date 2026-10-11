import { Router } from "express";
import { authenticate } from "@/modules/auth/auth.middleware";
import { authorizeRoles } from "@/modules/auth/authorize.middleware";
import {
  createAdminUser,
  deleteUser,
  findAggregateUsersByInterestForAdmin,
  getUser,
  listUsers,
  updateUser
} from "@/modules/users/user.controller";
import { listPostsForUser } from "@/modules/posts/post.controller";

const userRouter = Router();

userRouter.get("/", authenticate, authorizeRoles("admin"), listUsers);
userRouter.get(
  "/analytics/interests",
  authenticate,
  authorizeRoles("admin"),
  findAggregateUsersByInterestForAdmin
);
userRouter.get("/:id/posts", listPostsForUser);
userRouter.get("/:id", authenticate, authorizeRoles("admin"), getUser);
userRouter.patch("/:id", authenticate, authorizeRoles("admin"), updateUser);
userRouter.delete("/:id", authenticate, authorizeRoles("admin"), deleteUser);
userRouter.post("/", authenticate, authorizeRoles("admin"), createAdminUser);

export { userRouter };
