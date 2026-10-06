ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
ALTER TABLE "User" ADD COLUMN "subscription" TEXT NOT NULL DEFAULT 'starter';
