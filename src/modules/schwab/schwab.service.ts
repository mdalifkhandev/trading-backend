import axios from "axios";
import dayjs from "dayjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/error.middleware";
import { notifyBrokerConnectionsUpdated } from "../brokerConnections/brokerConnections.events";
import type { NormalizedSchwabOrder } from "./schwab.adapter";
import { normalizeSchwabOrders } from "./schwab.adapter";

type OAuthStatePayload = {
  userId: string;
};

type SchwabTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export function buildSchwabAuthorizationUrl(userId: string) {
  assertSchwabOAuthEnv();

  const state = jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "10m" });
  const url = new URL(env.SCHWAB_AUTH_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.SCHWAB_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.SCHWAB_REDIRECT_URI);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function handleSchwabCallback(input: { code: string; state: string }) {
  assertSchwabOAuthEnv();

  const payload = jwt.verify(input.state, env.JWT_SECRET) as OAuthStatePayload;

  if (!payload.userId) {
    throw new AppError(400, "Invalid OAuth state");
  }

  const tokenResponse = await exchangeCodeForToken(input.code);
  await saveSchwabToken(payload.userId, tokenResponse);
  await notifyBrokerConnectionsUpdated(payload.userId);

  return { connected: true };
}

export async function refreshSchwabTokenForUser(userId: string) {
  assertSchwabOAuthEnv();

  const token = await prisma.schwabToken.findUnique({ where: { userId } });

  if (!token) {
    throw new AppError(404, "Schwab account is not connected");
  }

  const refreshedToken = await refreshToken(token.refreshToken);
  await saveSchwabToken(userId, {
    ...refreshedToken,
    refresh_token: refreshedToken.refresh_token ?? token.refreshToken
  });
  await notifyBrokerConnectionsUpdated(userId);

  return { refreshed: true };
}

export async function getSchwabStatus(userId: string) {
  const token = await prisma.schwabToken.findUnique({
    where: { userId },
    select: { id: true, expiresAt: true, updatedAt: true }
  });

  return {
    connected: Boolean(token),
    expiresAt: token?.expiresAt ?? null,
    updatedAt: token?.updatedAt ?? null,
  };
}

export async function getSchwabAccountDetails(userId: string) {
  const accessToken = await getValidSchwabAccessToken(userId);
  const accountsUrl = getAccountsUrl();

  try {
    const response = await axios.get(accountsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: "positions" }
    });

    return {
      broker: "SCHWAB",
      accounts: normalizeSchwabAccounts(response.data)
    };
  } catch (error) {
    throw mapSchwabRequestError(error, "account details");
  }
}

export async function getValidSchwabAccessToken(userId: string) {
  assertSchwabOAuthEnv();

  const token = await prisma.schwabToken.findUnique({ where: { userId } });

  if (!token) {
    throw new AppError(404, "Schwab account is not connected");
  }

  const refreshBufferMs = 60 * 1000;

  if (token.expiresAt.getTime() > Date.now() + refreshBufferMs) {
    return token.accessToken;
  }

  const refreshedToken = await refreshToken(token.refreshToken);
  await saveSchwabToken(userId, {
    ...refreshedToken,
    refresh_token: refreshedToken.refresh_token ?? token.refreshToken
  });

  const updatedToken = await prisma.schwabToken.findUniqueOrThrow({ where: { userId } });
  return updatedToken.accessToken;
}

export async function fetchSchwabOrdersForToday(userId: string): Promise<NormalizedSchwabOrder[]> {
  const accessToken = await getValidSchwabAccessToken(userId);
  const ordersUrl = getOrdersUrl();
  const start = dayjs().startOf("day").toISOString();
  const end = dayjs().endOf("day").toISOString();

  try {
    const response = await axios.get(ordersUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        fromEnteredTime: start,
        toEnteredTime: end
      }
    });

    return normalizeSchwabOrders(response.data);
  } catch (error) {
    throw mapSchwabRequestError(error, "orders");
  }
}

async function exchangeCodeForToken(code: string): Promise<SchwabTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.SCHWAB_REDIRECT_URI
  });

  try {
    const response = await axios.post<SchwabTokenResponse>(env.SCHWAB_TOKEN_URL, body, {
      auth: {
        username: env.SCHWAB_CLIENT_ID,
        password: env.SCHWAB_CLIENT_SECRET
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    return response.data;
  } catch (error) {
    throw mapSchwabTokenError(error, "authorization code exchange");
  }
}

async function refreshToken(refreshTokenValue: string): Promise<SchwabTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshTokenValue
  });

  try {
    const response = await axios.post<SchwabTokenResponse>(env.SCHWAB_TOKEN_URL, body, {
      auth: {
        username: env.SCHWAB_CLIENT_ID,
        password: env.SCHWAB_CLIENT_SECRET
      },
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    return response.data;
  } catch (error) {
    throw mapSchwabTokenError(error, "refresh token exchange");
  }
}

async function saveSchwabToken(userId: string, tokenResponse: SchwabTokenResponse) {
  if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
    throw new AppError(502, "Schwab token response did not include required tokens");
  }

  const expiresAt = dayjs()
    .add(tokenResponse.expires_in ?? 1800, "second")
    .toDate();

  await prisma.schwabToken.upsert({
    where: { userId },
    update: {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt
    },
    create: {
      userId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt
    }
  });
}

function getOrdersUrl() {
  if (env.SCHWAB_ORDERS_URL) {
    return env.SCHWAB_ORDERS_URL;
  }

  if (!env.SCHWAB_API_BASE_URL) {
    throw new AppError(500, "SCHWAB_API_BASE_URL or SCHWAB_ORDERS_URL must be configured");
  }

  return new URL("/trader/v1/orders", env.SCHWAB_API_BASE_URL).toString();
}

function getAccountsUrl() {
  if (!env.SCHWAB_API_BASE_URL) {
    throw new AppError(500, "SCHWAB_API_BASE_URL must be configured");
  }

  return new URL("/trader/v1/accounts", env.SCHWAB_API_BASE_URL).toString();
}

function mapSchwabRequestError(error: unknown, resource: string) {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const message = getSchwabErrorMessage(error.response?.data);
  const statusCode = error.response?.status ?? 502;

  if (statusCode === 401 || statusCode === 403) {
    return new AppError(statusCode, "Schwab authorization failed. Please reconnect your Schwab account.");
  }

  return new AppError(502, `Schwab ${resource} request failed${message ? `: ${message}` : ""}`);
}

function mapSchwabTokenError(error: unknown, step: string) {
  if (!axios.isAxiosError(error)) {
    return error;
  }

  const statusCode = error.response?.status ?? 502;
  const providerMessage = getSchwabErrorMessage(error.response?.data);

  console.error("Schwab OAuth token request failed", {
    step,
    statusCode,
    providerMessage,
    tokenUrlConfigured: Boolean(env.SCHWAB_TOKEN_URL),
    authUrlConfigured: Boolean(env.SCHWAB_AUTH_URL),
    redirectUri: env.SCHWAB_REDIRECT_URI,
    clientIdSuffix: env.SCHWAB_CLIENT_ID ? env.SCHWAB_CLIENT_ID.slice(-6) : ""
  });

  if (statusCode === 401 || statusCode === 403) {
    return new AppError(
      statusCode,
      [
        "Schwab rejected the OAuth token request.",
        "Check SCHWAB_CLIENT_ID, SCHWAB_CLIENT_SECRET, and the exact redirect URI configured in the Schwab developer portal.",
        providerMessage ? `Schwab message: ${providerMessage}` : ""
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  return new AppError(
    502,
    `Schwab ${step} failed${providerMessage ? `: ${providerMessage}` : ""}`
  );
}

function normalizeSchwabAccounts(response: unknown) {
  const accountRecords = Array.isArray(response) ? response : [response];

  return accountRecords
    .map((record) => {
      if (!isRecord(record)) {
        return null;
      }

      const securitiesAccount = isRecord(record.securitiesAccount) ? record.securitiesAccount : record;
      const balances = isRecord(securitiesAccount.currentBalances)
        ? securitiesAccount.currentBalances
        : isRecord(securitiesAccount.initialBalances)
          ? securitiesAccount.initialBalances
          : {};
      const positions = Array.isArray(securitiesAccount.positions) ? securitiesAccount.positions : [];
      const accountNumber = getString(securitiesAccount, ["accountNumber", "accountId"]);

      return {
        accountNumberLast4: accountNumber ? accountNumber.slice(-4) : null,
        type: getString(securitiesAccount, ["type", "accountType"]) || null,
        isDayTrader: getBoolean(securitiesAccount, ["isDayTrader"]),
        positionsCount: positions.length,
        balances: {
          cashBalance: getOptionalNumber(balances, ["cashBalance"]),
          buyingPower: getOptionalNumber(balances, ["buyingPower"]),
          liquidationValue: getOptionalNumber(balances, ["liquidationValue"]),
          availableFunds: getOptionalNumber(balances, ["availableFunds"]),
          maintenanceRequirement: getOptionalNumber(balances, ["maintenanceRequirement"])
        }
      };
    })
    .filter(Boolean);
}

function getSchwabErrorMessage(data: unknown) {
  if (!data || typeof data !== "object") {
    return "";
  }

  const message = (data as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
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

function getBoolean(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "boolean") {
      return value;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertSchwabOAuthEnv() {
  if (
    !env.SCHWAB_CLIENT_ID ||
    !env.SCHWAB_CLIENT_SECRET ||
    !env.SCHWAB_REDIRECT_URI ||
    !env.SCHWAB_AUTH_URL ||
    !env.SCHWAB_TOKEN_URL
  ) {
    throw new AppError(500, "Schwab OAuth environment variables are not configured");
  }
}
