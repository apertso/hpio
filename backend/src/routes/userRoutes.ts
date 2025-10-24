import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { handleMulterError } from "../middleware/errorMiddleware";
import { uploadUserPhoto } from "../services/fileService";
import {
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getProfilePhoto,
  deleteAccount,
  getMe,
  registerFcmToken,
} from "../controllers/userController";

const router = Router();

// Все маршруты пользователя должны быть защищены
router.use(protect);

// Легкий эндпоинт с ETag/Last-Modified для условной выборки
router.get("/me", getMe);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.get("/profile/photo", getProfilePhoto);
router.post(
  "/profile/photo",
  handleMulterError(uploadUserPhoto),
  uploadProfilePhoto
);
router.post("/fcm-token", registerFcmToken);
router.delete("/account", deleteAccount);

export default router;
