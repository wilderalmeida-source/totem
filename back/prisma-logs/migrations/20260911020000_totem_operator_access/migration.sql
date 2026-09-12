-- Acesso de colaboradores ao totem. Executar no banco de configuracoes/logs.
CREATE TABLE IF NOT EXISTS "TotemAccessSettings" (
  "id" INTEGER PRIMARY KEY DEFAULT 1 CHECK ("id" = 1),
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "pinValidityDays" INTEGER NOT NULL DEFAULT 90 CHECK ("pinValidityDays" BETWEEN 1 AND 365),
  "sessionHours" INTEGER NOT NULL DEFAULT 12 CHECK ("sessionHours" BETWEEN 1 AND 24)
);
INSERT INTO "TotemAccessSettings" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "TotemOperator" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(100) NOT NULL UNIQUE,
  "displayName" VARCHAR(150) NOT NULL,
  "cardId" UUID NOT NULL UNIQUE,
  "pinHash" VARCHAR(255) NOT NULL,
  "pinExpiresAt" TIMESTAMP(3) NOT NULL,
  "mustChangePin" BOOLEAN NOT NULL DEFAULT true,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "TotemOperatorSession" (
  "tokenHash" VARCHAR(64) PRIMARY KEY,
  "operatorId" INTEGER NOT NULL REFERENCES "TotemOperator"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL,
  "restricted" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "TotemOperatorSession_operatorId_idx" ON "TotemOperatorSession"("operatorId");
CREATE INDEX IF NOT EXISTS "TotemOperatorSession_expiresAt_idx" ON "TotemOperatorSession"("expiresAt");
CREATE TABLE IF NOT EXISTS "TotemLoginAttempt" (
  "key" VARCHAR(100) PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 1,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "TotemLoginAttempt_expiresAt_idx" ON "TotemLoginAttempt"("expiresAt");
