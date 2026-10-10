import { Router } from "express";
import { authenticate } from "@/modules/auth/auth.middleware";
import {
  createNoteForUser,
  deleteNote,
  getNote,
  listNoteForUser,
  updateNote
} from "@/modules/notes/note.controller";
import { authorizeRoles } from "@/modules/auth/authorize.middleware";

const noteRouter = Router();

noteRouter.post(
  "/",
  authenticate,
  authorizeRoles("user", "admin"),
  createNoteForUser
);

noteRouter.get(
  "/",
  authenticate,
  authorizeRoles("user", "admin"),
  listNoteForUser
);

noteRouter.get("/:id", authenticate, authorizeRoles("user", "admin"), getNote);
noteRouter.patch(
  "/:id",
  authenticate,
  authorizeRoles("user", "admin"),
  updateNote
);

noteRouter.delete(
  "/:id",
  authenticate,
  authorizeRoles("user", "admin"),
  deleteNote
);

export { noteRouter };
