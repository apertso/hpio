import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { uploadUserPhoto } from "../services/fileService";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfilePhoto,
  deleteAccount,
  getMe,
} from "../controllers/userController";

const router = Router();

// Все маршруты пользователя должны быть защищены
router.use(protect);

// Легкий эндпоинт с ETag/Last-Modified для условной выборки
router.get("/me", getMe);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/profile/photo", getProfilePhoto);
router.post("/profile/photo", uploadUserPhoto, uploadProfilePhoto);
router.delete("/account", deleteAccount);

export default router;
