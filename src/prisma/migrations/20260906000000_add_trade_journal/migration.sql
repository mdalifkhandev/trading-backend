CREATE TABLE "TradeJournal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "broker" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "entryPrice" DOUBLE PRECISION,
    "exitPrice" DOUBLE PRECISION,
    "pnl" DOUBLE PRECISION,
    "status" TEXT NOT NULL,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeJournal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradeJournal_userId_broker_orderId_key" ON "TradeJournal"("userId", "broker", "orderId");

CREATE INDEX "TradeJournal_userId_executedAt_idx" ON "TradeJournal"("userId", "executedAt");

CREATE INDEX "TradeJournal_userId_symbol_idx" ON "TradeJournal"("userId", "symbol");

ALTER TABLE "TradeJournal" ADD CONSTRAINT "TradeJournal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
