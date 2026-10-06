import dayjs from "dayjs";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";

export const plans = [
  {
    code: "starter",
    name: "Starter",
    price: 9,
    billingCycle: "monthly",
    description: "For Individual traders building a basic workflow.",
    features: ["1 broker connection", "Core risk dashboard", "5GB cloud storage", "Email support"]
  },
  {
    code: "starter_pro",
    name: "Starter Pro",
    price: 15,
    billingCycle: "monthly",
    description: "For active traders who need more automation.",
    features: ["3 broker connections", "Advanced guardrails", "25GB cloud storage", "Priority support"],
    popular: true
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: 35,
    billingCycle: "monthly",
    description: "For teams managing multiple desks and accounts.",
    features: ["Unlimited connections", "Team policy controls", "More Broker Connection", "Dedicated onboarding"]
  }
] as const;

export type PlanCode = (typeof plans)[number]["code"];

export async function getSubscriptionOverview(userId: string) {
  const subscription = await getOrCreateSubscription(userId);
  const currentPlan = getPlan(subscription.planCode);

  return {
    current: serializeSubscription(subscription),
    plans: plans.map((plan) => ({
      ...plan,
      selected: plan.code === currentPlan.code
    }))
  };
}

export async function changeSubscriptionPlan(userId: string, planCode: PlanCode) {
  const plan = getPlan(planCode);
  const now = dayjs();

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    update: {
      planCode: plan.code,
      status: "active",
      billingCycle: plan.billingCycle,
      price: plan.price,
      startedAt: now.toDate(),
      expiresAt: now.add(1, "month").toDate(),
      canceledAt: null
    },
    create: {
      userId,
      planCode: plan.code,
      status: "active",
      billingCycle: plan.billingCycle,
      price: plan.price,
      startedAt: now.toDate(),
      expiresAt: now.add(1, "month").toDate()
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscription: plan.code }
  });

  return serializeSubscription(subscription);
}

export async function cancelSubscription(userId: string) {
  const subscription = await getOrCreateSubscription(userId);
  const canceled = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date()
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { subscription: canceled.planCode }
  });

  return serializeSubscription(canceled);
}

export async function getOrCreateSubscription(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { subscription: true }
  });
  const plan = getPlan(normalizePlanCode(user.subscription));
  const existing = await prisma.subscription.findUnique({ where: { userId } });

  if (existing) {
    return existing;
  }

  const now = dayjs();
  return prisma.subscription.create({
    data: {
      userId,
      planCode: plan.code,
      status: "active",
      billingCycle: plan.billingCycle,
      price: plan.price,
      startedAt: now.toDate(),
      expiresAt: now.add(1, "month").toDate()
    }
  });
}

export function serializeSubscription(subscription: Awaited<ReturnType<typeof getOrCreateSubscription>>) {
  const plan = getPlan(subscription.planCode);
  const daysLeft = subscription.status === "active"
    ? Math.max(dayjs(subscription.expiresAt).diff(dayjs(), "day"), 0)
    : 0;

  return {
    id: subscription.id,
    plan: plan.name,
    code: plan.code,
    status: subscription.status,
    price: subscription.price,
    billingCycle: subscription.billingCycle,
    startedAt: subscription.startedAt.toISOString(),
    expiresAt: subscription.expiresAt.toISOString(),
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    daysLeft
  };
}

function getPlan(planCode: string) {
  const plan = plans.find((item) => item.code === normalizePlanCode(planCode));

  if (!plan) {
    throw new AppError(400, "Invalid subscription plan");
  }

  return plan;
}

function normalizePlanCode(planCode: string): PlanCode {
  if (planCode === "starter_pro" || planCode === "starter-pro") {
    return "starter_pro";
  }

  if (planCode === "enterprise") {
    return "enterprise";
  }

  return "starter";
}
