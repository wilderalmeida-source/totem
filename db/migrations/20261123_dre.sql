-- Execute no PostgreSQL de configurações (o mesmo das tabelas AuditLog e configuracao_visual).
-- Módulo DRE: associação das contas do plano de contas do Clinux às linhas da DRE (com rateio) e histórico das alterações.
-- Enquanto não for executado, o backend tenta criar a coluna ao salvar; sem ela, vale a sugestão automática.
ALTER TABLE configuracao_visual ADD COLUMN IF NOT EXISTS dre JSONB NOT NULL DEFAULT '{}'::jsonb;
