import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { readTradeLimit, saveTradeLimit } from "./tradeLimit.controller";

const router = Router();

router.post("/", requireAuth, asyncHandler(saveTradeLimit));
router.get("/", requireAuth, asyncHandler(readTradeLimit));

export default router;
