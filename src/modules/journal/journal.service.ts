import dayjs from "dayjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { fetchSchwabOrdersForToday } from "../schwab/schwab.service";
import { isFilledStatus } from "../schwab/schwab.adapter";

type JournalFilters = {
  from?: Date;
  to?: Date;
  symbol?: string;
};

export async function syncJournal(userId: string) {
  const orders = await fetchSchwabOrdersForToday(userId);
  const filledOrders = orders.filter((order) => isFilledStatus(order.status));
  let createdCount = 0;
  let updatedCount = 0;

  for (const order of filledOrders) {
    const existingJournal = await prisma.tradeJournal.findUnique({
      where: {
        userId_broker_orderId: {
          userId,
          broker: "SCHWAB",
          orderId: order.orderId
        }
      },
      select: { id: true }
    });

    const prices = getJournalPrices(order.side, order.price);

    await prisma.tradeJournal.upsert({
      where: {
        userId_broker_orderId: {
          userId,
          broker: "SCHWAB",
          orderId: order.orderId
        }
      },
      update: {
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        entryPrice: prices.entryPrice,
        exitPrice: prices.exitPrice,
        pnl: null,
        status: order.status.toUpperCase(),
        executedAt: order.executedAt,
        rawData: order.rawData as Prisma.InputJsonValue
      },
      create: {
        userId,
        broker: "SCHWAB",
        orderId: order.orderId,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        entryPrice: prices.entryPrice,
        exitPrice: prices.exitPrice,
        pnl: null,
        status: order.status.toUpperCase(),
        executedAt: order.executedAt,
        rawData: order.rawData as Prisma.InputJsonValue
      }
    });

    if (existingJournal) {
      updatedCount += 1;
    } else {
      createdCount += 1;
    }
  }

  await recalculateJournalPnl(userId);

  return {
    synced: true,
    fetchedCount: orders.length,
    createdCount,
    updatedCount
  };
}

export async function getJournal(userId: string, filters: JournalFilters = {}) {
  return prisma.tradeJournal.findMany({
    where: buildJournalWhere(userId, filters),
    orderBy: { executedAt: "desc" }
  });
}

export async function getJournalSummary(userId: string, filters: JournalFilters = {}) {
  const trades = await prisma.tradeJournal.findMany({
    where: buildJournalWhere(userId, filters),
    select: { pnl: true }
  });
  const closedTrades = trades.filter((trade) => trade.pnl !== null);
  const wins = closedTrades.filter((trade) => Number(trade.pnl) > 0).length;
  const losses = closedTrades.filter((trade) => Number(trade.pnl) < 0).length;
  const totalPnl = closedTrades.reduce((total, trade) => total + Number(trade.pnl), 0);

  return {
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    wins,
    losses,
    totalPnl,
    winRate: closedTrades.length ? Number(((wins / closedTrades.length) * 100).toFixed(2)) : 0
  };
}

export async function syncJournalForConnectedUsers() {
  const tokens = await prisma.schwabToken.findMany({
    select: { userId: true }
  });

  const results = await Promise.allSettled(tokens.map((token) => syncJournal(token.userId)));

  return {
    usersChecked: tokens.length,
    syncedUsers: results.filter((result) => result.status === "fulfilled").length,
    failedUsers: results.filter((result) => result.status === "rejected").length
  };
}

async function recalculateJournalPnl(userId: string) {
  const trades = await prisma.tradeJournal.findMany({
    where: { userId },
    orderBy: { executedAt: "asc" }
  });
  const openBuys = new Map<string, Array<{ id: string; quantity: number; price: number }>>();

  for (const trade of trades) {
    if (trade.side === "BUY" && trade.entryPrice !== null) {
      const queue = openBuys.get(trade.symbol) ?? [];
      queue.push({ id: trade.id, quantity: trade.quantity, price: trade.entryPrice });
      openBuys.set(trade.symbol, queue);
      continue;
    }

    if (trade.side !== "SELL" || trade.exitPrice === null) {
      continue;
    }

    const queue = openBuys.get(trade.symbol) ?? [];
    let remainingQuantity = trade.quantity;
    let pnl = 0;

    while (remainingQuantity > 0 && queue.length > 0) {
      const buy = queue[0];
      const matchedQuantity = Math.min(remainingQuantity, buy.quantity);
      pnl += (trade.exitPrice - buy.price) * matchedQuantity;
      buy.quantity -= matchedQuantity;
      remainingQuantity -= matchedQuantity;

      if (buy.quantity <= 0) {
        queue.shift();
      }
    }

    await prisma.tradeJournal.update({
      where: { id: trade.id },
      data: { pnl: remainingQuantity < trade.quantity ? pnl : null }
    });
  }
}

function getJournalPrices(side: string, price: number | null) {
  return {
    entryPrice: side === "BUY" ? price : null,
    exitPrice: side === "SELL" ? price : null
  };
}

function buildJournalWhere(userId: string, filters: JournalFilters): Prisma.TradeJournalWhereInput {
  const where: Prisma.TradeJournalWhereInput = { userId };

  if (filters.from || filters.to) {
    where.executedAt = {
      gte: filters.from ?? dayjs().startOf("day").toDate(),
      lte: filters.to ?? dayjs().endOf("day").toDate()
    };
  }

  if (filters.symbol) {
    where.symbol = filters.symbol.toUpperCase();
  }

  return where;
}
