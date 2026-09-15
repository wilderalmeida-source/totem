ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "eventId" UUID;
CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_eventId_key" ON "AuditLog"("eventId");
