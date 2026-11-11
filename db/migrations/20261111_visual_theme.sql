-- Execute no PostgreSQL de configurações (o mesmo das tabelas AuditLog e TtsSettings).
CREATE TABLE IF NOT EXISTS configuracao_visual (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  tema TEXT NOT NULL DEFAULT 'theme2' CHECK (tema IN ('theme1', 'theme2')),
  modo TEXT NOT NULL DEFAULT 'light' CHECK (modo IN ('light', 'dark'))
);
INSERT INTO configuracao_visual (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
