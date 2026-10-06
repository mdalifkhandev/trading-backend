import { Router } from "express";
import { asyncHandler } from "../../middleware/error.middleware";
import { requireAuth } from "../../middleware/auth.middleware";
import { deleteAccount, overview, resetRestrictions, updateRestrictions, updateAccount, getDevices, revokeDevice } from "./settings.controller";

const router = Router();

router.get("/", requireAuth, asyncHandler(overview));
router.patch("/restrictions", requireAuth, asyncHandler(updateRestrictions));
router.post("/reset-restrictions", requireAuth, asyncHandler(resetRestrictions));
router.delete("/account", requireAuth, asyncHandler(deleteAccount));
router.patch("/account", requireAuth, asyncHandler(updateAccount));
router.get("/devices", requireAuth, asyncHandler(getDevices));
router.delete("/devices/:sessionId", requireAuth, asyncHandler(revokeDevice));

export default router;
