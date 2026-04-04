import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import * as ctrl from "../controllers/cardController";

const router = Router();
router.use(protect);

router.get("/", ctrl.getCards);
router.get("/:id/balances", ctrl.getBalances);
router.put("/:id/balances", ctrl.setBalances);
router.get("/:id", ctrl.getCard);
router.post("/", ctrl.createCard);
router.put("/:id", ctrl.updateCard);
router.delete("/:id", ctrl.deleteCard);
router.get("/bin/:bin", ctrl.lookupBin);

export default router;

