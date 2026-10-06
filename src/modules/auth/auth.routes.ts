import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { avatarUpload } from "./avatar-upload.middleware";
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  logoutAll,
  me,
  register,
  resetForgotPassword,
  updateMe,
  verifyForgotPasswordOtp
} from "./auth.controller";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false
});

router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/forgot-password", authLimiter, asyncHandler(forgotPassword));
router.post("/forgot-password/verify-otp", authLimiter, asyncHandler(verifyForgotPasswordOtp));
router.post("/forgot-password/reset", authLimiter, asyncHandler(resetForgotPassword));
router.get("/me", requireAuth, asyncHandler(me));
router.patch("/me", requireAuth, avatarUpload.single("avatar"), asyncHandler(updateMe));
router.patch("/change-password", requireAuth, asyncHandler(changePassword));
router.post("/logout-all", requireAuth, asyncHandler(logoutAll));
router.post("/logout", requireAuth, asyncHandler(logout));

export default router;
