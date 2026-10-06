import type { Request, Response } from "express";
import { z } from "zod";
import { createManualLockout, createWeeklyLockout, getLockoutStatus, unlockUser } from "./lockout.service";

const manualLockoutSchema = z.object({
  lockoutHours: z.union([z.literal(4), z.literal(8), z.literal(12), z.literal(24)]),
  reason: z.string().min(1).default("Manual lockout")
});

const weeklyLockoutSchema = z.object({
  weeklyLimit: z.number().int().min(1),
  reason: z.string().min(1).default("Weekly lockout")
});

export async function status(req: Request, res: Response) {
  const result = await getLockoutStatus(req.user!.id);
  res.json(result);
}

export async function manual(req: Request, res: Response) {
  const input = manualLockoutSchema.parse(req.body);
  const result = await createManualLockout(req.user!.id, input);
  res.status(201).json(result);
}

export async function weekly(req: Request, res: Response) {
  const input = weeklyLockoutSchema.parse(req.body);
  const result = await createWeeklyLockout(req.user!.id, input);
  res.status(201).json(result);
}

export async function unlock(req: Request, res: Response) {
  const result = await unlockUser(req.user!.id);
  res.json(result);
}
