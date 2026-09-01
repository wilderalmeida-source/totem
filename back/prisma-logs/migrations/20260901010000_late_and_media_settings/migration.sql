CREATE TABLE IF NOT EXISTS "configuracao_atraso" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "toleranciaMinutos" INTEGER NOT NULL DEFAULT 0,
  "baseHorario" VARCHAR(10) NOT NULL DEFAULT 'CHEGADA',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracao_atraso_id_unico" CHECK ("id" = 1),
  CONSTRAINT "configuracao_atraso_tolerancia_check" CHECK ("toleranciaMinutos" BETWEEN 0 AND 1440),
  CONSTRAINT "configuracao_atraso_base_check" CHECK ("baseHorario" IN ('EXAME', 'CHEGADA'))
);
INSERT INTO "configuracao_atraso" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;

CREATE TABLE IF NOT EXISTS "configuracao_midia" (
  "id" INTEGER PRIMARY KEY DEFAULT 1,
  "playlistAtivaId" VARCHAR(60),
  "duracaoImagemSegundos" INTEGER NOT NULL DEFAULT 10,
  "playlists" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "configuracao_midia_id_unico" CHECK ("id" = 1),
  CONSTRAINT "configuracao_midia_duracao_check" CHECK ("duracaoImagemSegundos" BETWEEN 2 AND 300)
);
INSERT INTO "configuracao_midia" ("id") VALUES (1) ON CONFLICT ("id") DO NOTHING;
