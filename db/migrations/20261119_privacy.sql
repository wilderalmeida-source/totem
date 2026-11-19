-- Execute no PostgreSQL de configurações (o mesmo das tabelas AuditLog e configuracao_visual).
-- Opções de privacidade da tela Temas: formato do nome no painel e no histórico do totem e prazo de guarda dos logs.
-- Enquanto não for executado, o sistema funciona com o comportamento anterior, mas não salva as opções.
ALTER TABLE configuracao_visual ADD COLUMN IF NOT EXISTS privacidade JSONB NOT NULL DEFAULT '{}'::jsonb;
