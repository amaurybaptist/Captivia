CREATE TABLE "HabitatProject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "animalId" TEXT,
  "name" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "HabitatProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HabitatProject_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "HabitatProject_name_check" CHECK (char_length("name") BETWEEN 1 AND 80)
);
CREATE INDEX "HabitatProject_userId_updatedAt_idx" ON "HabitatProject"("userId", "updatedAt");
CREATE INDEX "HabitatProject_animalId_idx" ON "HabitatProject"("animalId");
ALTER TABLE "HabitatProject" ADD CONSTRAINT "HabitatProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HabitatProject" ADD CONSTRAINT "HabitatProject_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
