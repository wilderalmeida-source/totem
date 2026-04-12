/*
  Warnings:

  - A unique constraint covering the columns `[tokenHash]` on the table `token` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "token_tokenHash_key" ON "token"("tokenHash");
