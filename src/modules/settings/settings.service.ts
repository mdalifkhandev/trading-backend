import os from "node:os";
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { getBrokerConnections } from "../brokerConnections/brokerConnections.service";
import { getLockoutStatus } from "../lockout/lockout.service";
import { getOrCreateSubscription, serializeSubscription } from "../subscription/subscription.service";
import { getRemainingTrades } from "../tradeLimit/tradeLimit.service";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  subscription: true,
  twoFactorEnabled: true,
  createdAt: true,
  updatedAt: true
};

export async function getSettingsOverview(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: userSelect
  });

  const [tradeLimit, lockoutStatus, brokerConnections, restrictionSetting, subscription, activeSessions, latestSession] = await Promise.all([
    prisma.tradeLimit.findUnique({ where: { userId } }),
    getLockoutStatus(userId),
    getBrokerConnections(userId),
    getOrCreateRestrictionSetting(userId),
    getOrCreateSubscription(userId),
    prisma.deviceSession.count({ where: { userId, isActive: true } }),
    prisma.deviceSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastActive: "desc" }
    })
  ]);

  const remainingTrades = tradeLimit ? await getRemainingTrades(userId, tradeLimit.dailyLimit) : null;
  const serializedSubscription = serializeSubscription(subscription);

  return {
    user,
    subscription: serializedSubscription,
    brokerConnections,
    restrictions: {
      status: lockoutStatus.locked ? "locked" : tradeLimit?.isEnabled ? "active" : "inactive",
      tradeLimit,
      remainingTrades,
      lockoutStatus,
      maxPositionSize: restrictionSetting.maxPositionSize,
      instruments: restrictionSetting.instruments,
      riskLevel: restrictionSetting.riskLevel
    },
    accountSettings: {
      twoFactorAuthentication: user.twoFactorEnabled,
      deviceManagement: activeSessions > 1,
      loginSessions: activeSessions || 1
    },
    system: {
      os: latestSession ? latestSession.device : "Unknown OS",
      version: process.env.npm_package_version || "1.0.0",
      lastLogin: latestSession ? latestSession.lastActive.toISOString() : new Date().toISOString(),
      accountType: `${serializedSubscription.plan} Trader (${serializedSubscription.status})`
    }
  };
}

export async function updateRestrictionSettings(
  userId: string,
  input: { maxPositionSize?: number | null; instruments?: string; riskLevel?: string }
) {
  return prisma.restrictionSetting.upsert({
    where: { userId },
    update: input,
    create: {
      userId,
      maxPositionSize: input.maxPositionSize,
      instruments: input.instruments ?? "Single/Stocks",
      riskLevel: input.riskLevel ?? "Unknown"
    }
  });
}

export async function resetUserRestrictions(userId: string) {
  const [tradeLimit, lockouts] = await prisma.$transaction([
    prisma.tradeLimit.deleteMany({ where: { userId } }),
    prisma.lockout.updateMany({ where: { userId, isActive: true }, data: { isActive: false } })
  ]);

  return {
    message: "Restrictions reset successfully",
    tradeLimitsRemoved: tradeLimit.count,
    lockoutsDisabled: lockouts.count
  };
}

export async function deleteCurrentUserAccount(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
  return { message: "Account deleted successfully" };
}

function getOrCreateRestrictionSetting(userId: string) {
  return prisma.restrictionSetting.upsert({
    where: { userId },
    update: {},
    create: { userId }
  });
}

export async function updateAccountSettings(
  userId: string,
  input: { twoFactorAuthentication?: boolean; password?: string }
) {
  if (input.twoFactorAuthentication !== undefined) {
    await verifyCurrentPassword(userId, input.password);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: input.twoFactorAuthentication }
    });
  }
  return { message: "Account settings updated successfully" };
}

async function verifyCurrentPassword(userId: string, password?: string) {
  if (!password) {
    throw new AppError(400, "Password is required to update two-factor authentication");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true }
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);

  if (!isValid) {
    throw new AppError(401, "Invalid password");
  }
}

export async function getUserDevices(userId: string) {
  return prisma.deviceSession.findMany({
    where: { userId, isActive: true },
    orderBy: { lastActive: "desc" }
  });
}

export async function revokeDeviceSession(userId: string, sessionId: string) {
  await prisma.deviceSession.updateMany({
    where: { id: sessionId, userId },
    data: { isActive: false }
  });
  return { message: "Session revoked successfully" };
}
