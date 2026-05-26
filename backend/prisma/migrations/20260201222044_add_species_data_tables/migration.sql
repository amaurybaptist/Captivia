/*
  Warnings:

  - You are about to drop the column `isEssential` on the `RecommendedEquipment` table. All the data in the column will be lost.
  - The primary key for the `SpeciesProfile` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `gbifKey` on the `SpeciesProfile` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[speciesId]` on the table `SpeciesProfile` will be added. If there are existing duplicate values, this will fail.
  - Made the column `minSpaceSize` on table `SpeciesHabitat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `lightNeeds` on table `SpeciesHabitat` required. This step will fail if there are existing NULL values in that column.
  - Made the column `activityEnrichment` on table `SpeciesHabitat` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `speciesId` to the `SpeciesProfile` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "SpeciesProfile_gbifKey_idx";

-- DropIndex
DROP INDEX "SpeciesProfile_gbifKey_key";

-- AlterTable
ALTER TABLE "RecommendedEquipment" DROP COLUMN "isEssential";

-- AlterTable
ALTER TABLE "SpeciesHabitat" ALTER COLUMN "tempMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "tempMax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "humidityMin" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "humidityMax" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "minSpaceSize" SET NOT NULL,
ALTER COLUMN "lightNeeds" SET NOT NULL,
ALTER COLUMN "activityEnrichment" SET NOT NULL;

-- AlterTable
ALTER TABLE "SpeciesProfile" DROP CONSTRAINT "SpeciesProfile_pkey",
DROP COLUMN "gbifKey",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "speciesId" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "SpeciesProfile_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "SpeciesProfile_id_seq";

-- CreateIndex
CREATE INDEX "SpeciesBehavior_difficultyLevel_idx" ON "SpeciesBehavior"("difficultyLevel");

-- CreateIndex
CREATE INDEX "SpeciesFeeding_dietType_idx" ON "SpeciesFeeding"("dietType");

-- CreateIndex
CREATE INDEX "SpeciesHabitat_habitatType_idx" ON "SpeciesHabitat"("habitatType");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesProfile_speciesId_key" ON "SpeciesProfile"("speciesId");

-- CreateIndex
CREATE INDEX "SpeciesProfile_speciesId_idx" ON "SpeciesProfile"("speciesId");
