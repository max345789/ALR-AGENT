-- CreateEnum
CREATE TYPE "BillingPlan" AS ENUM ('trial', 'starter', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('trialing', 'active', 'past_due', 'paused', 'canceled');

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "plan" "BillingPlan" NOT NULL DEFAULT 'trial',
ADD COLUMN "billingStatus" "BillingStatus" NOT NULL DEFAULT 'trialing',
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "leadLimit" INTEGER NOT NULL DEFAULT 250,
ADD COLUMN "billingCustomerId" TEXT,
ADD COLUMN "billingSubscriptionId" TEXT,
ADD COLUMN "billingPriceId" TEXT,
ADD COLUMN "captureKeyHash" TEXT,
ADD COLUMN "captureKeyLast4" TEXT,
ADD COLUMN "captureKeyIssuedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_ownerUserId_idx" ON "Lead"("ownerUserId");

-- CreateIndex
CREATE INDEX "Lead_ownerUserId_createdAt_idx" ON "Lead"("ownerUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingCustomerId_key" ON "User"("billingCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingSubscriptionId_key" ON "User"("billingSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_captureKeyHash_key" ON "User"("captureKeyHash");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
