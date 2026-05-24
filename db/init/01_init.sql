-- ============================================================
-- INIT - Criação das tabelas e seed inicial
-- Gerado a partir do schema Prisma
-- ============================================================

CREATE TABLE IF NOT EXISTS "TtsDailyUsage" (
  "id"       SERIAL PRIMARY KEY,
  "date"     TIMESTAMP(3) NOT NULL UNIQUE,
  "chars"    INTEGER NOT NULL DEFAULT 0,
  "requests" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "TtsWeekVoice" (
  "id"        SERIAL PRIMARY KEY,
  "year"      INTEGER NOT NULL,
  "week"      INTEGER NOT NULL,
  "voiceName" VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TtsWeekVoice_year_week_key" UNIQUE ("year", "week")
);

CREATE TABLE IF NOT EXISTS "TtsSettings" (
  "id"          SERIAL PRIMARY KEY,
  "rate"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "volumeSound" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TtsVoiceOverride" (
  "id"        SERIAL PRIMARY KEY,
  "year"      INTEGER NOT NULL,
  "week"      INTEGER NOT NULL,
  "voiceName" VARCHAR(191) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TtsVoiceOverride_year_week_key" UNIQUE ("year", "week")
);

CREATE TABLE IF NOT EXISTS "NameDictionary" (
  "id"        SERIAL PRIMARY KEY,
  "key"       VARCHAR(191) NOT NULL UNIQUE,
  "value"     VARCHAR(191) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TtsVoiceTest" (
  "id"          SERIAL PRIMARY KEY,
  "cacheKey"    VARCHAR(191) NOT NULL UNIQUE,
  "voiceName"   VARCHAR(191) NOT NULL,
  "rate"        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "text"        TEXT NOT NULL,
  "audioMp3"    BYTEA NOT NULL,
  "volumeSound" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ttsEvent" (
  "eventId"      VARCHAR(191) NOT NULL UNIQUE,
  "audioContent" VARCHAR(191) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "token" (
  "Id"        BIGSERIAL PRIMARY KEY,
  "tokenHash" VARCHAR(191) NOT NULL UNIQUE,
  "name"      VARCHAR(191) NOT NULL,
  "scope"     VARCHAR(191),
  "expiresAt" TIMESTAMP(6) NOT NULL,
  "revokedAt" VARCHAR(191),
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED - NameDictionary
-- ============================================================

INSERT INTO "NameDictionary" ("key", "value", "createdAt", "updatedAt") VALUES
  ('wilder',     'Uilder',     '2025-12-19 17:29:47.679', '2025-12-19 17:29:47.679'),
  ('julia',      'Júlia',      '2025-12-19 17:42:16.168', '2025-12-19 17:42:16.168'),
  ('luisa',      'Luísa',      '2025-12-19 17:42:28.477', '2025-12-19 17:42:28.477'),
  ('luiza',      'Luíza',      '2025-12-19 17:42:46.336', '2025-12-19 17:48:19.348'),
  ('graca',      'Graça',      '2025-12-19 17:43:00.160', '2025-12-19 17:43:00.160'),
  ('gracas',     'Graças',     '2025-12-19 17:43:09.224', '2025-12-19 17:43:09.224'),
  ('lazaro',     'Lázaro',     '2025-12-19 17:43:23.978', '2025-12-19 17:52:23.376'),
  ('falcao',     'Falcão',     '2025-12-19 17:43:32.055', '2025-12-19 17:43:32.055'),
  ('josue',      'Josué',      '2025-12-19 17:43:55.653', '2025-12-19 17:43:55.653'),
  ('valadao',    'Valadão',    '2025-12-19 17:44:02.576', '2025-12-19 17:44:02.576'),
  ('momente',    'Momenté',    '2025-12-19 17:44:25.332', '2025-12-19 17:44:25.332'),
  ('guimaraes',  'Guimarães',  '2025-12-19 17:45:21.783', '2026-02-13 19:44:58.243'),
  ('cecilia',    'Cecília',    '2025-12-19 17:46:02.397', '2025-12-19 17:46:02.397'),
  ('jose',       'José',       '2025-12-19 17:46:11.160', '2025-12-19 17:46:11.160'),
  ('joao',       'João',       '2025-12-19 17:46:21.592', '2026-01-29 10:38:27.758'),
  ('lucia',      'Lúcia',      '2025-12-19 17:46:31.991', '2025-12-19 17:46:31.991'),
  ('sonia',      'Sônia',      '2025-12-19 17:46:39.691', '2025-12-19 17:46:39.691'),
  ('marcia',     'Márcia',     '2025-12-19 17:46:46.100', '2025-12-19 17:51:57.364'),
  ('patricia',   'Patrícia',   '2025-12-19 17:46:53.167', '2025-12-19 17:46:53.167'),
  ('claudia',    'Cláudia',    '2025-12-19 17:47:04.989', '2025-12-19 17:47:04.989'),
  ('claudio',    'Cláudio',    '2025-12-19 17:47:12.577', '2025-12-19 17:47:12.577'),
  ('debora',     'Débora',     '2025-12-19 17:47:21.565', '2025-12-19 17:47:21.565'),
  ('monica',     'Mônica',     '2025-12-19 17:47:27.601', '2025-12-19 17:47:27.601'),
  ('tania',      'Tânia',      '2025-12-19 17:47:40.958', '2025-12-19 17:47:40.958'),
  ('vitoria',    'Vitória',    '2025-12-19 17:47:54.247', '2025-12-19 17:47:54.247'),
  ('iris',       'Íris',       '2025-12-19 17:48:03.656', '2025-12-19 17:48:03.656'),
  ('lais',       'Laís',       '2025-12-19 17:48:11.351', '2025-12-19 17:48:11.351'),
  ('nivea',      'Nívea',      '2025-12-19 17:48:27.557', '2025-12-19 17:48:27.557'),
  ('aredio',     'Arédio',     '2025-12-19 17:48:36.924', '2025-12-19 17:48:36.924'),
  ('goncalves',  'Gonçalves',  '2025-12-19 17:48:52.076', '2026-02-12 10:32:49.966'),
  ('simao',      'Simão',      '2025-12-19 17:50:49.076', '2025-12-19 17:50:49.076'),
  ('fatima',     'Fátima',     '2025-12-19 17:50:56.787', '2025-12-19 17:55:48.842'),
  ('vinicius',   'Vinícius',   '2025-12-19 17:51:28.681', '2025-12-19 17:51:28.681'),
  ('andre',      'André',      '2025-12-19 17:51:37.098', '2025-12-19 20:00:32.708'),
  ('fabio',      'Fábio',      '2025-12-19 17:51:44.552', '2025-12-19 17:51:44.552'),
  ('marcio',     'Márcio',     '2025-12-19 17:51:50.528', '2025-12-19 17:51:50.528'),
  ('lazara',     'Lázara',     '2025-12-19 17:52:11.605', '2025-12-19 19:58:57.582'),
  ('julio',      'Júlio',      '2025-12-19 17:52:32.428', '2025-12-19 17:52:32.428'),
  ('rogerio',    'Rogério',    '2025-12-19 17:52:38.978', '2025-12-19 17:52:38.978'),
  ('antonio',    'Antônio',    '2025-12-19 17:52:47.333', '2025-12-19 17:52:47.333'),
  ('otavio',     'Otávio',     '2025-12-19 17:52:54.225', '2025-12-19 17:52:54.225'),
  ('lucio',      'Lúcio',      '2025-12-19 17:53:03.416', '2025-12-19 17:53:03.416'),
  ('sebastiao',  'Sebastião',  '2025-12-19 17:53:14.152', '2025-12-19 17:53:14.152'),
  ('cicera',     'Cícera',     '2025-12-19 17:53:23.590', '2025-12-19 17:53:23.590'),
  ('candida',    'Cândida',    '2025-12-19 17:53:37.500', '2025-12-19 17:53:37.500'),
  ('conceicao',  'Conceição',  '2025-12-19 20:01:17.228', '2025-12-19 20:01:17.228'),
  ('carita',     'Cárita',     '2025-12-30 13:17:46.567', '2025-12-30 13:17:46.567'),
  ('isaias',     'Isaías',     '2026-01-06 18:38:16.707', '2026-01-06 18:38:16.707'),
  ('valeria',    'Valéria',    '2026-01-29 13:25:43.120', '2026-01-29 13:25:43.120'),
  ('maite',      'Maitê',      '2026-01-29 13:26:18.160', '2026-01-29 13:26:18.160'),
  ('mayte',      'Maytê',      '2026-01-29 13:26:27.569', '2026-01-29 13:26:27.569'),
  ('alcantara',  'Alcântara',  '2026-02-10 17:40:13.681', '2026-02-10 17:40:13.681'),
  ('araujo',     'Araújo',     '2026-02-11 10:24:06.276', '2026-02-11 10:24:06.276'),
  ('mendonca',   'Mendonça',   '2026-02-26 19:07:26.822', '2026-02-26 19:07:26.822'),
  ('edineia',    'Edinéia',    '2026-03-05 12:35:24.574', '2026-03-05 12:35:24.574'),
  ('cesaria',    'Cesária',    '2026-03-06 10:57:12.923', '2026-03-06 10:57:12.923')
ON CONFLICT ("key") DO NOTHING;
