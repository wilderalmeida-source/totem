CREATE TABLE "AdminUser" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(100) NOT NULL UNIQUE,
  "displayName" VARCHAR(150) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditLog" (
  "id" BIGSERIAL PRIMARY KEY,
  "sessionId" VARCHAR(100),
  "actor" VARCHAR(100),
  "category" VARCHAR(30) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "step" VARCHAR(100),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_sessionId_idx" ON "AuditLog"("sessionId");
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");
