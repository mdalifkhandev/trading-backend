import type { Response } from "express";

type BrokerConnectionEvent = {
  type: "broker_connections_updated";
  brokers: unknown;
};

const clients = new Map<string, Set<Response>>();
const heartbeatInterval = setInterval(sendBrokerConnectionHeartbeat, 30_000);
heartbeatInterval.unref();

export function addBrokerConnectionEventClient(userId: string, res: Response) {
  const userClients = clients.get(userId) ?? new Set<Response>();
  userClients.add(res);
  clients.set(userId, userClients);

  res.on("close", () => {
    userClients.delete(res);

    if (userClients.size === 0) {
      clients.delete(userId);
    }
  });
}

export function sendBrokerConnectionEvent(userId: string, event: BrokerConnectionEvent) {
  const userClients = clients.get(userId);

  if (!userClients) {
    return;
  }

  for (const client of userClients) {
    client.write(`event: ${event.type}\n`);
    client.write(`data: ${JSON.stringify(event)}\n\n`);
  }
}

export async function notifyBrokerConnectionsUpdated(userId: string) {
  const { getBrokerConnections } = await import("./brokerConnections.service.js");
  const brokers = await getBrokerConnections(userId);

  sendBrokerConnectionEvent(userId, {
    type: "broker_connections_updated",
    brokers
  });
}

export function sendBrokerConnectionHeartbeat() {
  for (const userClients of clients.values()) {
    for (const client of userClients) {
      client.write(": heartbeat\n\n");
    }
  }
}
