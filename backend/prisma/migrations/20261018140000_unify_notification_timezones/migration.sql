-- Synchronisation : conserver les fuseaux choisis dans les préférences existantes.
-- Aucun renommage ni retrait de colonne ; les anciennes versions restent compatibles.
UPDATE "User" AS u SET "timezone" = p."timeZone"
FROM "NotificationPreference" AS p WHERE p."userId" = u."id";
