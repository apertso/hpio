import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as ctrl from "../controllers/incomeController";

const router = Router();
router.use(protect);

router.get("/", ctrl.getIncomes);
router.post("/", ctrl.createIncome);
router.put("/:id", ctrl.updateIncome);
router.delete("/:id", ctrl.deleteIncome);

export default router;

