import type { Request, Response } from "express";
import { z } from "zod";
import {
  deleteCurrentUserAccount,
  getSettingsOverview,
  resetUserRestrictions,
  updateRestrictionSettings,
  updateAccountSettings,
  getUserDevices,
  revokeDeviceSession
} from "./settings.service";

const restrictionSettingsSchema = z
  .object({
    maxPositionSize: z.number().positive().nullable().optional(),
    instruments: z.string().trim().min(1).optional(),
    riskLevel: z.string().trim().min(1).optional()
  })
  .strict();

export async function overview(req: Request, res: Response) {
  const result = await getSettingsOverview(req.user!.id);
  res.json(result);
}

export async function resetRestrictions(req: Request, res: Response) {
  const result = await resetUserRestrictions(req.user!.id);
  res.json(result);
}

export async function updateRestrictions(req: Request, res: Response) {
  const input = restrictionSettingsSchema.parse(req.body);
  const restrictionSettings = await updateRestrictionSettings(req.user!.id, input);
  res.json({ restrictionSettings });
}

export async function deleteAccount(req: Request, res: Response) {
  const result = await deleteCurrentUserAccount(req.user!.id);
  res.json(result);
}

export async function updateAccount(req: Request, res: Response) {
  const input = z
    .object({
      twoFactorAuthentication: z.boolean().optional(),
      password: z.string().min(1).optional()
    })
    .parse(req.body);
  const result = await updateAccountSettings(req.user!.id, input);
  res.json(result);
}

export async function getDevices(req: Request, res: Response) {
  const result = await getUserDevices(req.user!.id);
  res.json(result);
}

export async function revokeDevice(req: Request, res: Response) {
  const result = await revokeDeviceSession(req.user!.id, req.params.sessionId);
  res.json(result);
}
