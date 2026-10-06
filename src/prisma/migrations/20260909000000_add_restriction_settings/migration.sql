CREATE TABLE "RestrictionSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "maxPositionSize" DOUBLE PRECISION,
    "instruments" TEXT NOT NULL DEFAULT 'Single/Stocks',
    "riskLevel" TEXT NOT NULL DEFAULT 'Unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestrictionSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RestrictionSetting_userId_key" ON "RestrictionSetting"("userId");

ALTER TABLE "RestrictionSetting" ADD CONSTRAINT "RestrictionSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
