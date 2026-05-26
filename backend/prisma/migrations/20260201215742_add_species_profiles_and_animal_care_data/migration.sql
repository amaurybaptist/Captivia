-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "sex" TEXT,
    "photos" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "types" JSONB NOT NULL,
    "schedule" JSONB NOT NULL,
    "snooze" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesHealthContent" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "diseases" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesHealthContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesLegislation" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "sources" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesLegislation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendedEquipment" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "size" TEXT,
    "searchTerms" TEXT[],
    "isEssential" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendedEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesProfile" (
    "id" SERIAL NOT NULL,
    "gbifKey" INTEGER,
    "commonNameFr" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "domesticationType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesFeeding" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "dietType" TEXT NOT NULL,
    "recommendedFoods" JSONB NOT NULL,
    "foodsToAvoid" JSONB NOT NULL,
    "mealFrequency" TEXT NOT NULL,
    "specificNeeds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesFeeding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesHabitat" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "habitatType" TEXT NOT NULL,
    "tempMin" INTEGER NOT NULL,
    "tempMax" INTEGER NOT NULL,
    "humidityMin" INTEGER,
    "humidityMax" INTEGER,
    "minSpaceSize" TEXT,
    "lightNeeds" TEXT,
    "activityEnrichment" TEXT,
    "costEstimate" TEXT NOT NULL,
    "hygieneNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesHabitat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeciesBehavior" (
    "id" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "generalBehavior" TEXT NOT NULL,
    "sociability" TEXT NOT NULL,
    "difficultyLevel" TEXT NOT NULL,
    "compatibilityWithChildren" TEXT,
    "compatibilityWithOtherAnimals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeciesBehavior_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Animal_userId_idx" ON "Animal"("userId");

-- CreateIndex
CREATE INDEX "Animal_speciesId_idx" ON "Animal"("speciesId");

-- CreateIndex
CREATE INDEX "Routine_animalId_idx" ON "Routine"("animalId");

-- CreateIndex
CREATE INDEX "Routine_active_idx" ON "Routine"("active");

-- CreateIndex
CREATE INDEX "ActionLog_animalId_idx" ON "ActionLog"("animalId");

-- CreateIndex
CREATE INDEX "ActionLog_doneAt_idx" ON "ActionLog"("doneAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "SpeciesHealthContent_speciesId_idx" ON "SpeciesHealthContent"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesHealthContent_speciesId_locale_key" ON "SpeciesHealthContent"("speciesId", "locale");

-- CreateIndex
CREATE INDEX "SpeciesLegislation_speciesId_idx" ON "SpeciesLegislation"("speciesId");

-- CreateIndex
CREATE INDEX "SpeciesLegislation_country_idx" ON "SpeciesLegislation"("country");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesLegislation_speciesId_country_key" ON "SpeciesLegislation"("speciesId", "country");

-- CreateIndex
CREATE INDEX "RecommendedEquipment_speciesId_idx" ON "RecommendedEquipment"("speciesId");

-- CreateIndex
CREATE INDEX "RecommendedEquipment_category_idx" ON "RecommendedEquipment"("category");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesProfile_gbifKey_key" ON "SpeciesProfile"("gbifKey");

-- CreateIndex
CREATE INDEX "SpeciesProfile_gbifKey_idx" ON "SpeciesProfile"("gbifKey");

-- CreateIndex
CREATE INDEX "SpeciesProfile_category_idx" ON "SpeciesProfile"("category");

-- CreateIndex
CREATE INDEX "SpeciesProfile_domesticationType_idx" ON "SpeciesProfile"("domesticationType");

-- CreateIndex
CREATE INDEX "SpeciesFeeding_speciesId_idx" ON "SpeciesFeeding"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesFeeding_speciesId_locale_key" ON "SpeciesFeeding"("speciesId", "locale");

-- CreateIndex
CREATE INDEX "SpeciesHabitat_speciesId_idx" ON "SpeciesHabitat"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesHabitat_speciesId_locale_key" ON "SpeciesHabitat"("speciesId", "locale");

-- CreateIndex
CREATE INDEX "SpeciesBehavior_speciesId_idx" ON "SpeciesBehavior"("speciesId");

-- CreateIndex
CREATE UNIQUE INDEX "SpeciesBehavior_speciesId_locale_key" ON "SpeciesBehavior"("speciesId", "locale");

-- AddForeignKey
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
