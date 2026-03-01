-- AlterTable: Add missing columns to Business
ALTER TABLE "Business" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "Business" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);

-- AlterTable: Add missing column to EventAttendee
ALTER TABLE "EventAttendee" ADD COLUMN "guestCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "EventAttendee_eventId_idx" ON "EventAttendee"("eventId");

-- CreateIndex
CREATE INDEX "EventAttendee_userId_idx" ON "EventAttendee"("userId");

-- CreateIndex
CREATE INDEX "ChatMember_chatId_idx" ON "ChatMember"("chatId");

-- CreateIndex
CREATE INDEX "ChatMember_userId_idx" ON "ChatMember"("userId");

-- CreateIndex
CREATE INDEX "ChatMember_businessId_idx" ON "ChatMember"("businessId");
