/*
  Warnings:

  - Made the column `audioContent` on table `ttsEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ttsEvent" ALTER COLUMN "audioContent" SET NOT NULL,
ALTER COLUMN "audioContent" SET DATA TYPE TEXT;
