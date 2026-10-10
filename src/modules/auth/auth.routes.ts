import { Router } from "express";

import {
  getCurrentUser,
  login,
  register
} from "@/modules/auth/auth.controller";
import { authenticate } from "@/modules/auth/auth.middleware";

const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.get("/me", authenticate, getCurrentUser);

export { authRouter };
