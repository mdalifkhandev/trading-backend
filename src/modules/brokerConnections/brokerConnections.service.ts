import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { buildSchwabAuthorizationUrl } from "../schwab/schwab.service";

type BrokerConnectionStatus = "connected" | "not_connected" | "coming_soon";
type BrokerConnectionAction = "redirect" | "manage" | "unavailable";

type BrokerConnection = {
  id: string;
  broker: string;
  displayName: string;
  subtitle: string;
  logoKey: string;
  status: BrokerConnectionStatus;
  statusLabel: string;
  actionLabel: "MANAGE" | "CONNECT" | "COMING SOON";
  isEnabled: boolean;
  connectUrl: string | null;
  manageUrl: string | null;
};

type BrokerConnectionCard = {
  id: string;
  broker: string;
  displayName: string;
  subtitle: string;
  logoKey: string;
  status?: BrokerConnectionStatus;
  manageUrl?: string;
};

const brokerCards: BrokerConnectionCard[] = [
  {
    id: "thinkorswim",
    broker: "SCHWAB",
    displayName: "Thinkorswim",
    subtitle: "Equities & Options",
    logoKey: "thinkorswim",
    manageUrl: "/schwab/account"
  },
  {
    id: "tradovate",
    broker: "TRADOVATE",
    displayName: "Tradovate",
    subtitle: "Futures Execution",
    logoKey: "tradovate"
  },
  {
    id: "interactive_brokers",
    broker: "IBKR",
    displayName: "Interactive Brokers",
    subtitle: "Global Multi-Asset",
    logoKey: "interactive_brokers"
  },
  {
    id: "tradingview",
    broker: "TRADINGVIEW",
    displayName: "TradingView",
    subtitle: "Chart Integration",
    logoKey: "tradingview"
  },
  {
    id: "ninjatrader",
    broker: "NINJATRADER",
    displayName: "NinjaTrader",
    subtitle: "Desktop Terminal",
    logoKey: "ninjatrader"
  },
  {
    id: "tastytrade",
    broker: "TASTYTRADE",
    displayName: "Tastytrade",
    subtitle: "High Probability Trading",
    logoKey: "tastytrade"
  },
  {
    id: "robinhood",
    broker: "ROBINHOOD",
    displayName: "Robinhood",
    subtitle: "Simple Execution",
    logoKey: "robinhood"
  },
  {
    id: "next_gateway",
    broker: "NEXT_GATEWAY",
    displayName: "Next Gateway",
    subtitle: "Community Requested",
    logoKey: "next_gateway",
    status: "coming_soon" as const
  }
];

export async function getBrokerConnections(userId: string) {
  const schwabToken = await prisma.schwabToken.findUnique({
    where: { userId },
    select: { expiresAt: true, updatedAt: true }
  });

  const brokers: BrokerConnection[] = brokerCards.map((card) => {
    const status = getBrokerStatus(card.id, Boolean(schwabToken), card.status);
    const connected = status === "connected";
    const comingSoon = status === "coming_soon";

    return {
      id: card.id,
      broker: card.broker,
      displayName: card.displayName,
      subtitle: card.subtitle,
      logoKey: card.logoKey,
      status,
      statusLabel: getStatusLabel(status),
      actionLabel: comingSoon ? "COMING SOON" : connected ? "MANAGE" : "CONNECT",
      isEnabled: !comingSoon,
      connectUrl: !connected && !comingSoon ? `/broker-connections/${card.id}/connect` : null,
      manageUrl: connected ? card.manageUrl ?? null : null
    };
  });

  return {
    brokers,
    connectedCount: brokers.filter((broker) => broker.status === "connected").length,
    updatedAt: schwabToken?.updatedAt ?? null
  };
}

export async function connectBroker(userId: string, brokerId: string) {
  const card = findBrokerCard(brokerId);

  if (!card) {
    throw new AppError(404, "Broker connection not found");
  }

  if (card.broker === "SCHWAB") {
    return connectSchwabBroker(userId, card);
  }

  return buildBrokerAction(card, "unavailable", null, `${card.displayName} connection is not available yet`);
}

async function connectSchwabBroker(userId: string, card: BrokerConnectionCard) {
  const token = await prisma.schwabToken.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (token) {
    return buildBrokerAction(card, "manage", card.manageUrl ?? "/schwab/account", "Schwab is already connected");
  }

  const url = buildSchwabAuthorizationUrl(userId);
  return buildBrokerAction(card, "redirect", url, "Redirect the user to Schwab OAuth");
}

function buildBrokerAction(
  card: BrokerConnectionCard,
  action: BrokerConnectionAction,
  url: string | null,
  message: string
) {
  return {
    id: card.id,
    broker: card.broker,
    displayName: card.displayName,
    action,
    url,
    message
  };
}

function findBrokerCard(brokerId: string) {
  const normalizedBrokerId = normalizeBrokerId(brokerId);

  return brokerCards.find((card) => {
    return (
      normalizeBrokerId(card.id) === normalizedBrokerId ||
      normalizeBrokerId(card.broker) === normalizedBrokerId ||
      normalizeBrokerId(card.displayName) === normalizedBrokerId ||
      (card.broker === "SCHWAB" && normalizedBrokerId === "schwab")
    );
  });
}

function normalizeBrokerId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getBrokerStatus(
  id: string,
  schwabConnected: boolean,
  configuredStatus?: BrokerConnectionStatus
): BrokerConnectionStatus {
  if (configuredStatus) {
    return configuredStatus;
  }

  if (id === "thinkorswim") {
    return schwabConnected ? "connected" : "not_connected";
  }

  return "not_connected";
}

function getStatusLabel(status: BrokerConnectionStatus) {
  if (status === "connected") {
    return "CONNECTED";
  }

  if (status === "coming_soon") {
    return "COMING SOON";
  }

  return "NOT CONNECTED";
}
