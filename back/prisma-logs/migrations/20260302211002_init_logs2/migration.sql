/*
  Warnings:

  - You are about to drop the `NameDictionary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TtsDailyUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TtsSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TtsVoiceOverride` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TtsVoiceTest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TtsWeekVoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ttsEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "NameDictionary";

-- DropTable
DROP TABLE "TtsDailyUsage";

-- DropTable
DROP TABLE "TtsSettings";

-- DropTable
DROP TABLE "TtsVoiceOverride";

-- DropTable
DROP TABLE "TtsVoiceTest";

-- DropTable
DROP TABLE "TtsWeekVoice";

-- DropTable
DROP TABLE "ttsEvent";

-- CreateTable
CREATE TABLE "token" (
    "tokenHash" TEXT NOT NULL,
    "name" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(6),
    "revokedAt" TEXT,
    "createdAt" TIMESTAMP(6),
    "Id" BIGINT,

    CONSTRAINT "token_pkey" PRIMARY KEY ("tokenHash")
);
