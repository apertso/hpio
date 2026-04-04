import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as ctrl from "../controllers/cryptoController";

const router = Router();
router.use(protect);

router.get("/top", ctrl.getTop);
router.get("/search", ctrl.search);

router.get("/balances", ctrl.getBalances);
router.post("/balances", ctrl.addBalance);
router.put("/balances/:id", ctrl.updateBalance);
router.delete("/balances/:id", ctrl.deleteBalance);

export default router;
