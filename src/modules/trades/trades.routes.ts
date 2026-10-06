import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { sync, today } from "./trades.controller";

const router = Router();

router.post("/sync", requireAuth, asyncHandler(sync));
router.get("/today", requireAuth, asyncHandler(today));

export default router;
