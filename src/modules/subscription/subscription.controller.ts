import type { Request, Response } from "express";
import { z } from "zod";
import { cancelSubscription, changeSubscriptionPlan, getSubscriptionOverview } from "./subscription.service";

const changePlanSchema = z.object({
  planCode: z.enum(["starter", "starter_pro", "enterprise"])
});

export async function overview(req: Request, res: Response) {
  const result = await getSubscriptionOverview(req.user!.id);
  res.json(result);
}

export async function changePlan(req: Request, res: Response) {
  const input = changePlanSchema.parse(req.body);
  const subscription = await changeSubscriptionPlan(req.user!.id, input.planCode);
  res.json({ subscription });
}

export async function cancel(req: Request, res: Response) {
  const subscription = await cancelSubscription(req.user!.id);
  res.json({ subscription });
}
