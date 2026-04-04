import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as ctrl from "../controllers/fundsController";

const router = Router();
router.use(protect);

router.get("/summary", ctrl.getSummary);
router.get("/history", ctrl.getHistory);

export default router;
