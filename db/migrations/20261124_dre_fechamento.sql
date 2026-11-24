-- Execute no PostgreSQL de configurações (o mesmo das tabelas AuditLog e configuracao_visual).
-- Módulo DRE: fechamento mensal (versões com fotografia dos valores, aprovação, ajustes posteriores e conciliação)
-- e orçamento anual por linha da DRE. Enquanto não for executado, o backend cria as tabelas no primeiro uso.
CREATE TABLE IF NOT EXISTS dre_fechamento (
  mes CHAR(7) NOT NULL,
  versao INT NOT NULL,
  status TEXT NOT NULL,                       -- aguardando | aprovado | rejeitado | substituido | reaberto
  valores JSONB NOT NULL,                     -- fotografia: [{ cdConta, valor, titulos }]
  mapeamento JSONB NOT NULL,                  -- associação das contas às linhas no momento do fechamento
  ajustes JSONB NOT NULL DEFAULT '[]'::jsonb, -- ajustes posteriores: [{ id, folha, valor, descricao, em, por }]
  conciliacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  motivo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por TEXT NOT NULL,
  decidido_em TIMESTAMPTZ,
  decidido_por TEXT,
  decisao_motivo TEXT,
  PRIMARY KEY (mes, versao)
);

CREATE TABLE IF NOT EXISTS dre_orcamento (
  ano INT PRIMARY KEY,
  valores JSONB NOT NULL,                     -- { "RB.CONV": [12 valores], ... }
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_por TEXT NOT NULL
);
