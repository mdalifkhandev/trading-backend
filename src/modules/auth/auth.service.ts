import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { UAParser } from "ua-parser-js";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import { prisma } from "../../lib/prisma";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  subscription: true,
  createdAt: true,
  updatedAt: true
};

const passwordResetOtpStore = new Map<string, { otp: string; expiresAt: number }>();
const passwordResetTokenStore = new Map<string, { email: string; expiresAt: number }>();

export async function registerUser(
  input: { name: string; email: string; password: string },
  userAgent: string = "Unknown Device",
  ipAddress: string = ""
) {
  const email = input.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AppError(409, "Email is already registered");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash
    },
    select: userSelect
  });

  const parsedUA = new UAParser(userAgent).getResult();
  const deviceString = parsedUA.browser.name ? `${parsedUA.browser.name} on ${parsedUA.os.name || "Unknown OS"}` : "Unknown Device";

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, device: deviceString, ipAddress }
  });

  return { user, token: signJwt(user.id, session.id) };
}

export async function requestPasswordResetOtp(input: { email: string }) {
  const email = input.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true }
  });

  if (!user) {
    return {
      message: "If the email exists, an OTP has been sent."
    };
  }

  const otp = generateOtp();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  passwordResetOtpStore.set(email, { otp, expiresAt });

  console.log(`[FORGOT_PASSWORD_OTP] email=${email} otp=${otp} expiresIn=10m`);

  return {
    message: "OTP generated successfully. Check backend console."
  };
}

export async function verifyPasswordResetOtp(input: { email: string; otp: string }) {
  const email = input.email.toLowerCase();
  const record = passwordResetOtpStore.get(email);

  if (!record || record.expiresAt < Date.now()) {
    passwordResetOtpStore.delete(email);
    throw new AppError(400, "OTP expired or not found");
  }

  if (record.otp !== input.otp) {
    throw new AppError(400, "Invalid OTP");
  }

  passwordResetOtpStore.delete(email);

  const resetToken = crypto.randomUUID();
  passwordResetTokenStore.set(resetToken, {
    email,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return { verified: true, resetToken };
}

export async function resetPasswordWithToken(input: {
  email: string;
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}) {
  if (input.newPassword !== input.confirmPassword) {
    throw new AppError(400, "New password and confirm password do not match");
  }

  const email = input.email.toLowerCase();
  const record = passwordResetTokenStore.get(input.resetToken);

  if (!record || record.expiresAt < Date.now() || record.email !== email) {
    passwordResetTokenStore.delete(input.resetToken);
    throw new AppError(400, "Password reset session expired. Please request a new OTP.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (!user) {
    passwordResetTokenStore.delete(input.resetToken);
    throw new AppError(404, "User not found");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    prisma.deviceSession.updateMany({
      where: { userId: user.id },
      data: { isActive: false }
    })
  ]);

  passwordResetTokenStore.delete(input.resetToken);

  return { message: "Password reset successfully. Please login with your new password." };
}

export async function loginUser(
  input: { email: string; password: string },
  userAgent: string = "Unknown Device",
  ipAddress: string = ""
) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });

  if (!user) {
    throw new AppError(401, "Invalid email or password");
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new AppError(401, "Invalid email or password");
  }

  const parsedUA = new UAParser(userAgent).getResult();
  const deviceString = parsedUA.browser.name ? `${parsedUA.browser.name} on ${parsedUA.os.name || "Unknown OS"}` : "Unknown Device";

  const session = await prisma.deviceSession.create({
    data: { userId: user.id, device: deviceString, ipAddress }
  });

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return { user: safeUser, token: signJwt(user.id, session.id) };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userSelect
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
}

export async function updateCurrentUser(
  userId: string,
  input: { name?: string; email?: string; avatar?: string | null }
) {
  const data: { name?: string; email?: string; avatar?: string | null } = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.email !== undefined) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId }
      },
      select: { id: true }
    });

    if (existingUser) {
      throw new AppError(409, "Email is already registered");
    }

    data.email = email;
  }

  if (input.avatar !== undefined) {
    data.avatar = input.avatar;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: userSelect
  });

  return user;
}

export async function changeCurrentUserPassword(
  userId: string,
  input: { oldPassword: string; newPassword: string; confirmPassword: string }
) {
  if (input.newPassword !== input.confirmPassword) {
    throw new AppError(400, "New password and confirm password do not match");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, "User not found");

  const isValid = await bcrypt.compare(input.oldPassword, user.passwordHash);
  if (!isValid) throw new AppError(401, "Invalid old password");

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });
}

function signJwt(userId: string, sessionId: string) {
  return jwt.sign({ userId, sessionId }, env.JWT_SECRET, { expiresIn: "7d" });
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function logoutAllSessions(userId: string, currentSessionId?: string) {
  await prisma.deviceSession.updateMany({
    where: { 
      userId,
      id: { not: currentSessionId }
    },
    data: { isActive: false }
  });
}

export async function logoutSession(sessionId?: string) {
  if (sessionId) {
    await prisma.deviceSession.updateMany({
      where: { id: sessionId },
      data: { isActive: false }
    });
  }
}
