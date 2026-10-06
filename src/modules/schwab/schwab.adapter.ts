export type NormalizedSchwabOrder = {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL" | "UNKNOWN";
  quantity: number;
  price: number | null;
  status: string;
  executedAt: Date;
  rawData: Record<string, unknown>;
};

const FILLED_STATUSES = new Set(["FILLED", "EXECUTED", "COMPLETED"]);

export function normalizeSchwabOrders(response: unknown): NormalizedSchwabOrder[] {
  const rawOrders = findOrderLikeObjects(response);

  return rawOrders
    .map((order) => normalizeOrder(order))
    .filter((order): order is NormalizedSchwabOrder => Boolean(order));
}

export function isFilledStatus(status: string) {
  return FILLED_STATUSES.has(status.toUpperCase());
}

function normalizeOrder(order: Record<string, unknown>): NormalizedSchwabOrder | null {
  const orderId = getString(order, ["orderId", "order_id", "id"]);
  const status = getString(order, ["status", "orderStatus", "executionStatus"]).toUpperCase();
  const executedAtValue = getString(order, [
    "closeTime",
    "enteredTime",
    "executionTime",
    "executedAt",
    "filledAt"
  ]);

  if (!orderId || !status || !isFilledStatus(status)) {
    return null;
  }

  const legs = Array.isArray(order.orderLegCollection)
    ? (order.orderLegCollection as Record<string, unknown>[])
    : [];
  const firstLeg = legs[0] ?? {};
  const instrument = isRecord(firstLeg.instrument) ? firstLeg.instrument : {};

  const symbol =
    getString(order, ["symbol", "ticker"]) ||
    getString(instrument, ["symbol", "underlyingSymbol"]) ||
    "UNKNOWN";
  const side = normalizeSide(
    getString(firstLeg, ["instruction", "side"]) || getString(order, ["side", "instruction"])
  );
  const quantity =
    getNumber(firstLeg, ["quantity"]) ||
    getNumber(order, ["quantity", "filledQuantity", "orderQuantity"]) ||
    0;
  const activityCollection = Array.isArray(order.orderActivityCollection)
    ? (order.orderActivityCollection as Record<string, unknown>[])
    : [];
  const executionLegs = activityCollection.flatMap((activity) =>
    Array.isArray(activity.executionLegs)
      ? (activity.executionLegs as Record<string, unknown>[])
      : []
  );
  const firstExecutionLeg = executionLegs[0] ?? {};
  const price =
    getOptionalNumber(firstExecutionLeg, ["price", "executionPrice"]) ??
    getOptionalNumber(order, ["price", "averagePrice", "filledPrice"]);
  const executedAt = executedAtValue ? new Date(executedAtValue) : new Date();

  return {
    orderId,
    symbol,
    side,
    quantity,
    price,
    status,
    executedAt: Number.isNaN(executedAt.getTime()) ? new Date() : executedAt,
    rawData: order
  };
}

function findOrderLikeObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(findOrderLikeObjects);
  }

  if (!isRecord(value)) {
    return [];
  }

  const hasOrderIdentity = "orderId" in value || "order_id" in value || "id" in value;
  const hasStatus = "status" in value || "orderStatus" in value || "executionStatus" in value;

  if (hasOrderIdentity && hasStatus) {
    return [value];
  }

  return Object.values(value).flatMap(findOrderLikeObjects);
}

function normalizeSide(value: string): "BUY" | "SELL" | "UNKNOWN" {
  const upper = value.toUpperCase();

  if (upper.includes("BUY")) {
    return "BUY";
  }

  if (upper.includes("SELL")) {
    return "SELL";
  }

  return "UNKNOWN";
}

function getString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return "";
}

function getNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return 0;
}

function getOptionalNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
