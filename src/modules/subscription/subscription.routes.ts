import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { cancel, changePlan, overview } from "./subscription.controller";

const router = Router();

router.get("/", requireAuth, asyncHandler(overview));
router.post("/change", requireAuth, asyncHandler(changePlan));
router.post("/cancel", requireAuth, asyncHandler(cancel));

export default router;
