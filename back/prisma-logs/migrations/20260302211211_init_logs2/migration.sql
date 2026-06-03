/*
  Warnings:

  - The primary key for the `token` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `name` on table `token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expiresAt` on table `token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `revokedAt` on table `token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `createdAt` on table `token` required. This step will fail if there are existing NULL values in that column.
  - Made the column `Id` on table `token` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
CREATE SEQUENCE token_id_seq;
ALTER TABLE "token" DROP CONSTRAINT "token_pkey",
ALTER COLUMN "name" SET NOT NULL,
ALTER COLUMN "expiresAt" SET NOT NULL,
ALTER COLUMN "revokedAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "Id" SET NOT NULL,
ALTER COLUMN "Id" SET DEFAULT nextval('token_id_seq'),
ADD CONSTRAINT "token_pkey" PRIMARY KEY ("Id");
ALTER SEQUENCE token_id_seq OWNED BY "token"."Id";

-- CreateTable
CREATE TABLE "TtsDailyUsage" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "chars" INTEGER NOT NULL DEFAULT 0,
    "requests" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TtsDailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsWeekVoice" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "voiceName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsWeekVoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsSettings" (
    "id" SERIAL NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "volumeSound" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TtsSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsVoiceOverride" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "voiceName" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TtsVoiceOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NameDictionary" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NameDictionary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TtsVoiceTest" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "voiceName" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "text" TEXT NOT NULL,
    "audioMp3" BYTEA NOT NULL,
    "volumeSound" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TtsVoiceTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ttsEvent" (
    "eventId" TEXT NOT NULL,
    "audioContent" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TtsDailyUsage_date_key" ON "TtsDailyUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TtsWeekVoice_year_week_key" ON "TtsWeekVoice"("year", "week");

-- CreateIndex
CREATE UNIQUE INDEX "TtsVoiceOverride_year_week_key" ON "TtsVoiceOverride"("year", "week");

-- CreateIndex
CREATE UNIQUE INDEX "NameDictionary_key_key" ON "NameDictionary"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TtsVoiceTest_cacheKey_key" ON "TtsVoiceTest"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "ttsEvent_eventId_key" ON "ttsEvent"("eventId");
