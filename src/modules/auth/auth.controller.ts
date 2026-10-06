import type { Request, Response } from "express";
import { z } from "zod";
import { uploadAvatar } from "../../lib/cloudinary";
import { AppError } from "../../middleware/error.middleware";
import {
  changeCurrentUserPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  updateCurrentUser,
  logoutAllSessions,
  logoutSession,
  requestPasswordResetOtp,
  resetPasswordWithToken,
  verifyPasswordResetOtp
} from "./auth.service";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional()
  })
  .strict();

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"]
  });

const forgotPasswordSchema = z.object({
  email: z.string().email()
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    resetToken: z.string().min(1),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters")
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "New password and confirm password do not match",
    path: ["confirmPassword"]
  });

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const result = await registerUser(input, userAgent, req.ip);
  res.status(201).json(result);
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const result = await loginUser(input, userAgent, req.ip);
  res.json(result);
}

export async function forgotPassword(req: Request, res: Response) {
  const input = forgotPasswordSchema.parse(req.body);
  const result = await requestPasswordResetOtp(input);
  res.json(result);
}

export async function verifyForgotPasswordOtp(req: Request, res: Response) {
  const input = verifyOtpSchema.parse(req.body);
  const result = await verifyPasswordResetOtp(input);
  res.json(result);
}

export async function resetForgotPassword(req: Request, res: Response) {
  const input = resetPasswordSchema.parse(req.body);
  const result = await resetPasswordWithToken(input);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.user!.id);
  res.json({ user });
}

export async function updateMe(req: Request, res: Response) {
  const input: { name?: string; email?: string; avatar?: string } = updateProfileSchema.parse(req.body);
  if (req.file) {
    const avatar = await uploadAvatar(req.file);
    input.avatar = avatar.url;
  }

  if (Object.keys(input).length === 0) {
    throw new AppError(400, "At least one profile field or avatar file is required");
  }

  const user = await updateCurrentUser(req.user!.id, input);
  res.json({ user });
}

export async function changePassword(req: Request, res: Response) {
  const input = changePasswordSchema.parse(req.body);
  await changeCurrentUserPassword(req.user!.id, input);
  res.json({ message: "Password changed successfully" });
}

export async function logoutAll(req: Request, res: Response) {
  const sessionId = (req as any).sessionId;
  await logoutAllSessions(req.user!.id, sessionId);
  res.json({ message: "Logged out of all other sessions" });
}

export async function logout(req: Request, res: Response) {
  const sessionId = (req as any).sessionId;
  await logoutSession(sessionId);
  res.json({ message: "Logged out successfully" });
}
