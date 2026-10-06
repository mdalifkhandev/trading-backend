import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { account, callback, connect, connectUrl, refreshToken, status } from "./schwab.controller";

const router = Router();

router.get("/connect", requireAuth, asyncHandler(connect));
router.get("/connect-url", requireAuth, asyncHandler(connectUrl));
router.get("/callback", asyncHandler(callback));
router.post("/refresh-token", requireAuth, asyncHandler(refreshToken));
router.get("/status", requireAuth, asyncHandler(status));
router.get("/account", requireAuth, asyncHandler(account));

export default router;
