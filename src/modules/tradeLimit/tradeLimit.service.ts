import dayjs from "dayjs";
import { prisma } from "../../lib/prisma";

const COUNTED_TRADE_STATUSES = ["FILLED", "EXECUTED", "COMPLETED"];

export async function upsertTradeLimit(
  userId: string,
  input: { dailyLimit: number; lockoutHours: number; isEnabled: boolean }
) {
  return prisma.tradeLimit.upsert({
    where: { userId },
    update: input,
    create: { userId, ...input }
  });
}

export async function getTradeLimit(userId: string) {
  return prisma.tradeLimit.findUnique({ where: { userId } });
}

export async function getRemainingTrades(userId: string, dailyLimit: number) {
  const todayTradeCount = await countTodaysLimitTrades(userId);
  return Math.max(dailyLimit - todayTradeCount, 0);
}

export async function countTodaysLimitTrades(userId: string) {
  const todayStart = dayjs().startOf("day").toDate();
  const todayEnd = dayjs().endOf("day").toDate();

  return prisma.tradeLog.count({
    where: {
      userId,
      executedAt: {
        gte: todayStart,
        lte: todayEnd
      },
      status: {
        in: COUNTED_TRADE_STATUSES
      }
    }
  });
}
