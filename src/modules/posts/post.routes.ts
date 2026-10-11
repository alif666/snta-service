import { Router } from "express";

import { authenticate } from "@/modules/auth/auth.middleware";
import {
  createPostForUser,
  deletePost,
  getPost,
  listPostsPublicly,
  updatePost
} from "@/modules/posts/post.controller";
import { authorizeRoles } from "@/modules/auth/authorize.middleware";

const postRouter = Router();

postRouter.get("/", listPostsPublicly);
postRouter.get("/:id", getPost);
postRouter.post(
  "/",
  authenticate,
  authorizeRoles("user", "admin"),
  createPostForUser
);
postRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("user", "admin"),
  updatePost
);
postRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("user", "admin"),
  deletePost
);

export { postRouter };
