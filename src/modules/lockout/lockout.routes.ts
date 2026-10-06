import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { manual, status, unlock, weekly } from "./lockout.controller";

const router = Router();

router.get("/status", requireAuth, asyncHandler(status));
router.post("/manual", requireAuth, asyncHandler(manual));
router.post("/weekly", requireAuth, asyncHandler(weekly));
router.post("/unlock", requireAuth, asyncHandler(unlock));

export default router;
