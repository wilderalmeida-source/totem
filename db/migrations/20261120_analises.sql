-- Execute no PostgreSQL de configurações (o mesmo das tabelas AuditLog e configuracao_visual).
-- Tela "Configurar analíticos": modalidades, médicos e convênios considerados em cada tela de análise (por ID do Clinux).
-- Enquanto não for executado, o backend tenta criar a coluna ao salvar; sem ela, valem as regras padrão por nome.
ALTER TABLE configuracao_visual ADD COLUMN IF NOT EXISTS analises JSONB NOT NULL DEFAULT '{}'::jsonb;
