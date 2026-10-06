import type { Request, Response } from "express";
import { z } from "zod";
import { getRemainingTrades, getTradeLimit, upsertTradeLimit } from "./tradeLimit.service";

const tradeLimitSchema = z.object({
  dailyLimit: z.number().int().positive(),
  lockoutHours: z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(24)]),
  isEnabled: z.boolean().default(true)
});

export async function saveTradeLimit(req: Request, res: Response) {
  const input = tradeLimitSchema.parse(req.body);
  const tradeLimit = await upsertTradeLimit(req.user!.id, input);
  const remainingTrades = await getRemainingTrades(req.user!.id, tradeLimit.dailyLimit);

  res.json({ tradeLimit, remainingTrades });
}

export async function readTradeLimit(req: Request, res: Response) {
  const tradeLimit = await getTradeLimit(req.user!.id);

  if (!tradeLimit) {
    return res.json({ tradeLimit: null, remainingTrades: null });
  }

  const remainingTrades = await getRemainingTrades(req.user!.id, tradeLimit.dailyLimit);
  return res.json({ tradeLimit, remainingTrades });
}
