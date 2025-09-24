import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { uploadFeedbackAttachment } from "../services/fileService";
import { createFeedback } from "../controllers/feedbackController";

const router = Router();

router.use(protect);

router.post("/", uploadFeedbackAttachment, createFeedback);

export default router;
