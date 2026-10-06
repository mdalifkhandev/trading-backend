import { prisma } from "../../lib/prisma";
import { checkAndCreateLockout } from "../lockout/lockout.service";
import { fetchSchwabOrdersForToday } from "../schwab/schwab.service";
import { isFilledStatus } from "../schwab/schwab.adapter";
import { syncJournal } from "../journal/journal.service";

export async function syncTrades(userId: string) {
  const orders = await fetchSchwabOrdersForToday(userId);
  const filledOrders = orders.filter((order) => isFilledStatus(order.status));
  let insertedCount = 0;

  for (const order of filledOrders) {
    const existingTradeLog = await prisma.tradeLog.findUnique({
      where: {
        userId_broker_orderId: {
          userId,
          broker: "SCHWAB",
          orderId: order.orderId
        }
      }
    });

    if (existingTradeLog) {
      continue;
    }

    await prisma.tradeLog.create({
      data: {
        userId,
        broker: "SCHWAB",
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        status: order.status.toUpperCase(),
        executedAt: order.executedAt
      }
    });

    insertedCount += 1;
  }

  const lockoutStatus = await checkAndCreateLockout(userId);
  const journalSync = await syncJournal(userId);

  return {
    synced: true,
    fetchedCount: orders.length,
    insertedCount,
    journalSync,
    lockoutStatus
  };
}

export async function getTodaysTrades(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return prisma.tradeLog.findMany({
    where: {
      userId,
      executedAt: {
        gte: start,
        lte: end
      }
    },
    orderBy: { executedAt: "desc" }
  });
}
