-- Banco de configurações: o mesmo de AuditLog e TtsSettings.
CREATE TABLE IF NOT EXISTS configuracao_informativos (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config JSONB NOT NULL DEFAULT '{"enabled":true,"items":[]}'::jsonb
);
INSERT INTO configuracao_informativos (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
