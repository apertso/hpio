import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as ctrl from "../controllers/cashController";

const router = Router();
router.use(protect);

router.get("/balances", ctrl.getBalances);
router.put("/balances", ctrl.setBalances);

export default router;
