import type { Request, Response } from "express";
import { getTodaysTrades, syncTrades } from "./trades.service";

export async function sync(req: Request, res: Response) {
  const result = await syncTrades(req.user!.id);
  res.json(result);
}

export async function today(req: Request, res: Response) {
  const trades = await getTodaysTrades(req.user!.id);
  res.json({ trades });
}
