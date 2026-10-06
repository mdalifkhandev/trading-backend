import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { addBrokerConnectionEventClient } from "./brokerConnections.events";
import { connectBroker, getBrokerConnections } from "./brokerConnections.service";

type JwtPayload = {
  userId: string;
};

export async function listBrokerConnections(req: Request, res: Response) {
  const result = await getBrokerConnections(req.user!.id);
  res.json(result);
}

export async function connectBrokerConnection(req: Request, res: Response) {
  const result = await connectBroker(req.user!.id, req.params.brokerId);
  res.json(result);
}

export async function brokerConnectionEvents(req: Request, res: Response) {
  const userId = req.user?.id ?? (await getUserIdFromAuthorizationHeader(req)) ?? (await getUserIdFromQueryToken(req));

  if (!userId) {
    return res.status(401).json({ message: "Missing or invalid authorization token" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  addBrokerConnectionEventClient(userId, res);

  const brokers = await getBrokerConnections(userId);
  res.write("event: broker_connections_updated\n");
  res.write(`data: ${JSON.stringify({ type: "broker_connections_updated", brokers })}\n\n`);
}

async function getUserIdFromAuthorizationHeader(req: Request) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  return getUserIdFromToken(token);
}

async function getUserIdFromQueryToken(req: Request) {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;

  return getUserIdFromToken(token);
}

async function getUserIdFromToken(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true }
    });

    return user?.id ?? null;
  } catch {
    return null;
  }
}
