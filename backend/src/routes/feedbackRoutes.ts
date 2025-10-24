import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { handleMulterError } from "../middleware/errorMiddleware";
import { uploadFeedbackAttachment } from "../services/fileService";
import { createFeedback } from "../controllers/feedbackController";

const router = Router();

router.use(protect);

router.post("/", handleMulterError(uploadFeedbackAttachment), createFeedback);

export default router;
