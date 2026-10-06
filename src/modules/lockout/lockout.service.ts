import dayjs from "dayjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { countTodaysLimitTrades } from "../tradeLimit/tradeLimit.service";

const APPS_TO_BLOCK = ["thinkorswim.exe", "TradingView.exe", "Binance.exe"];

export async function getLockoutStatus(userId: string) {
  const activeLockout = await prisma.lockout.findFirst({
    where: { userId, isActive: true },
    orderBy: { lockedUntil: "desc" }
  });

  if (!activeLockout) {
    return { locked: false as const };
  }

  if (activeLockout.lockedUntil.getTime() <= Date.now()) {
    await prisma.lockout.update({
      where: { id: activeLockout.id },
      data: { isActive: false }
    });

    return { locked: false as const };
  }

  return {
    locked: true as const,
    lockedUntil: activeLockout.lockedUntil.toISOString(),
    reason: activeLockout.reason,
    appsToBlock: APPS_TO_BLOCK
  };
}

export async function checkAndCreateLockout(userId: string) {
  const tradeLimit = await prisma.tradeLimit.findUnique({ where: { userId } });

  if (!tradeLimit || !tradeLimit.isEnabled) {
    return getLockoutStatus(userId);
  }

  const existingStatus = await getLockoutStatus(userId);

  if (existingStatus.locked) {
    return existingStatus;
  }

  const todayTradeCount = await countTodaysLimitTrades(userId);

  if (todayTradeCount < tradeLimit.dailyLimit) {
    return { locked: false as const, todayTradeCount, dailyLimit: tradeLimit.dailyLimit };
  }

  await prisma.lockout.create({
    data: {
      userId,
      reason: "Daily trade limit reached",
      lockedUntil: dayjs().add(tradeLimit.lockoutHours, "hour").toDate(),
      isActive: true
    }
  });

  return getLockoutStatus(userId);
}

export async function createManualLockout(
  userId: string,
  input: { lockoutHours: 4 | 8 | 12 | 24; reason: string }
) {
  await prisma.lockout.create({
    data: {
      userId,
      reason: input.reason,
      lockedUntil: dayjs().add(input.lockoutHours, "hour").toDate(),
      isActive: true
    }
  });

  return getLockoutStatus(userId);
}

export async function createWeeklyLockout(
  userId: string,
  input: { weeklyLimit: number; reason: string }
) {
  await prisma.lockout.create({
    data: {
      userId,
      reason: `${input.reason} Weekly limit: ${input.weeklyLimit}`,
      lockedUntil: dayjs().add(7, "day").toDate(),
      isActive: true
    }
  });

  return getLockoutStatus(userId);
}

export async function unlockUser(userId: string) {
  const result = await prisma.lockout.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false }
  });

  if (result.count === 0) {
    throw new AppError(404, "No active lockout found");
  }

  return { unlocked: true };
}
