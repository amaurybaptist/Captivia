-- AlterTable
ALTER TABLE "Animal" ADD COLUMN IF NOT EXISTS "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Animal_publicSlug_key" ON "Animal"("publicSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Animal_publicSlug_idx" ON "Animal"("publicSlug");
