ALTER TABLE "NotificationPreference" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'Europe/Brussels';
ALTER TABLE "NotificationEvent" ADD COLUMN "occurrenceKey" TEXT,
  ADD COLUMN "snoozedUntil" TIMESTAMPTZ(3),
  ADD COLUMN "deliveryVersion" INTEGER NOT NULL DEFAULT 0;
-- Les anciens horaires étaient des heures murales enregistrées comme de l'UTC.
-- Le fuseau historique par défaut est belge; on préserve statuts et points.
UPDATE "NotificationEvent" SET "scheduledAt" = ("scheduledAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Brussels';
UPDATE "NotificationEvent" SET "occurrenceKey" = "userId" || ':' ||
  CASE WHEN "routineId" IS NOT NULL THEN 'routine:' || "routineId"
       WHEN "medicationId" IS NOT NULL THEN 'medication:' || "medicationId"
       WHEN "appointmentId" IS NOT NULL THEN 'vet_appointment:' || "appointmentId"
       WHEN "vaccinationId" IS NOT NULL THEN 'vaccination:' || "vaccinationId"
       ELSE 'type:' || "type" END || ':' ||
  to_char("scheduledAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
-- Conserver en priorité la réalisation existante lorsque l'ancien générateur a doublonné.
DELETE FROM "NotificationEvent" WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY "occurrenceKey"
      ORDER BY CASE status WHEN 'done' THEN 0 WHEN 'skipped' THEN 1 ELSE 2 END, "createdAt", id) AS rank
    FROM "NotificationEvent"
  ) AS duplicates WHERE rank > 1
);
CREATE UNIQUE INDEX "NotificationEvent_occurrenceKey_key" ON "NotificationEvent"("occurrenceKey");
CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 0,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseUntil" TIMESTAMPTZ(3),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMPTZ(3),
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationDelivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "NotificationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "NotificationDelivery_eventId_channel_version_key" ON "NotificationDelivery"("eventId", "channel", "version");
ALTER TABLE "NotificationEvent" DROP CONSTRAINT "NotificationEvent_status_check";
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_status_check"
  CHECK (status IN ('pending', 'done', 'skipped', 'dismissed', 'obsolete'));
