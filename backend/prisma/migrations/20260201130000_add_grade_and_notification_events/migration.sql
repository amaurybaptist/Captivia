-- AlterTable User: add points and grade
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "grade" TEXT NOT NULL DEFAULT 'bronze';

-- CreateTable NotificationEvent
CREATE TABLE IF NOT EXISTS "NotificationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NotificationEvent_userId_idx" ON "NotificationEvent"("userId");
CREATE INDEX IF NOT EXISTS "NotificationEvent_scheduledAt_idx" ON "NotificationEvent"("scheduledAt");
CREATE INDEX IF NOT EXISTS "NotificationEvent_userId_scheduledAt_idx" ON "NotificationEvent"("userId", "scheduledAt");

ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
