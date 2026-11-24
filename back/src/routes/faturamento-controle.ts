import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { comCache, dataIso, erro, exames, filtros, num, type Filtros } from './faturamento'

// Faturamento — rodada 2: guias e autorizações, demonstrativos de retorno (TISS), produtividade e auditoria automática.
// Tudo somente leitura: os alertas são possíveis problemas, não erros confirmados; a correção é feita no Clinux.

const id = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const filtrosSimples = z.object({ inicio: dataIso, fim: dataIso, convenio: z.coerce.number().int().positive().optional(), atualizar: z.string().optional() })
type FiltrosSimples = z.infer<typeof filtrosSimples>

// ---------------- Guias e autorizações ----------------
// Situação da guia/autorização do exame: cancelada (atendimento cancelado), pendente (sem número de autorização),
// vencida (validade da senha antes do atendimento) ou autorizada. "Negada": glosa de autorização (código TISS 14xx)
// ou pendência com "NEGAD". Divergência: autorização com data posterior ao atendimento.

async function guias(f: Filtros) {
  const w = Prisma.sql`a.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date
    ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
    ${f.modalidade ? Prisma.sql`AND COALESCE(pr.cd_modalidade, sl.cd_modalidade) = ${f.modalidade}` : Prisma.empty}
    ${f.procedimento ? Prisma.sql`AND e.cd_procedimento = ${f.procedimento}` : Prisma.empty}
    AND (COALESCE(e.nr_vl_convenio, 0) > 0 OR NULLIF(TRIM(e.ds_guia), '') IS NOT NULL)`
  const situacao = Prisma.sql`CASE
    WHEN a.ds_status = 1 THEN 'cancelada'
    WHEN NULLIF(TRIM(e.ds_autorizacao), '') IS NULL THEN 'pendente'
    WHEN e.dt_senha IS NOT NULL AND e.dt_senha < a.dt_data THEN 'vencida'
    ELSE 'autorizada' END`
  const negada = Prisma.sql`(g.ds_codigo LIKE '14%' OR upper(COALESCE(pe.ds_pendencia, e.ds_pendencia_motivo, '')) LIKE '%NEGAD%')`
  const [lista, mensal, proximas] = await Promise.all([
    prisma.$queryRaw<Array<{
      cd_exame: number; cd_atendimento: number; data: string; conv: number | null; modal: number | null; proc: number | null; guia: string | null
      autorizacao: string | null; solicitacao: string | null; dt_autorizacao: string | null; validade: string | null; situacao: string; negada: boolean
      divergente: boolean; faturado: boolean; valor: number; motivo_glosa: string | null; pendencia: string | null
    }>>`
      SELECT e.cd_exame, a.cd_atendimento, to_char(a.dt_data, 'YYYY-MM-DD') AS data, pl.cd_fornecedor AS conv,
             COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS modal, e.cd_procedimento AS proc,
             NULLIF(TRIM(e.ds_guia), '') AS guia, NULLIF(TRIM(e.ds_autorizacao), '') AS autorizacao,
             to_char(e.dt_solicitacao, 'YYYY-MM-DD') AS solicitacao, to_char(e.dt_autorizacao, 'YYYY-MM-DD') AS dt_autorizacao,
             to_char(e.dt_senha, 'YYYY-MM-DD') AS validade, ${situacao} AS situacao, ${negada} AS negada,
             (e.dt_autorizacao IS NOT NULL AND e.dt_autorizacao > a.dt_data) AS divergente,
             (f.cd_lancamento IS NOT NULL) AS faturado, COALESCE(e.nr_vl_convenio, 0) AS valor,
             TRIM(g.ds_glosa) AS motivo_glosa, COALESCE(TRIM(pe.ds_pendencia), NULLIF(TRIM(e.ds_pendencia_motivo), '')) AS pendencia
      FROM ${exames}
      LEFT JOIN tiss_glosas g ON g.cd_glosa = e.cd_glosa_tiss
      LEFT JOIN pendencias pe ON pe.cd_pendencia = e.cd_pendencia
      WHERE ${w}
      ORDER BY a.dt_data DESC LIMIT 30000`,
    // Evolução mensal dos status (12 meses até o fim do período).
    prisma.$queryRaw<Array<{ mes: string; situacao: string; exames: bigint; guias: bigint; valor: number }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, ${situacao} AS situacao, COUNT(*) AS exames,
             COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) AS guias, SUM(COALESCE(e.nr_vl_convenio, 0)) AS valor
      FROM ${exames}
      WHERE a.dt_data > ${f.fim}::date - 365 AND a.dt_data <= ${f.fim}::date AND (COALESCE(e.nr_vl_convenio, 0) > 0 OR NULLIF(TRIM(e.ds_guia), '') IS NOT NULL)
        ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1, 2`,
    // Exames agendados nos próximos 30 dias com autorização vencendo antes ou até 7 dias depois do exame.
    prisma.$queryRaw<Array<{ cd_exame: number; cd_atendimento: number; data: string; conv: number | null; proc: number | null; guia: string | null; autorizacao: string | null; validade: string | null; valor: number }>>`
      SELECT e.cd_exame, a.cd_atendimento, to_char(a.dt_data, 'YYYY-MM-DD') AS data, pl.cd_fornecedor AS conv, e.cd_procedimento AS proc,
             NULLIF(TRIM(e.ds_guia), '') AS guia, NULLIF(TRIM(e.ds_autorizacao), '') AS autorizacao, to_char(e.dt_senha, 'YYYY-MM-DD') AS validade,
             COALESCE(e.nr_vl_convenio, 0) AS valor
      FROM ${exames}
      WHERE a.dt_data >= current_date AND a.dt_data <= current_date + 30 AND a.ds_status IS DISTINCT FROM 1
        AND e.dt_senha IS NOT NULL AND e.dt_senha <= a.dt_data + 7
        ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      ORDER BY e.dt_senha LIMIT 2000`,
  ])
  const ids = (k: 'conv' | 'modal' | 'proc') => [...new Set([...lista.map(x => x[k]), ...(k !== 'modal' ? proximas.map(x => x[k]) : [])].filter(x => x !== null).map(Number))]
  const [c, m, p] = await Promise.all([
    ids('conv').length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${ids('conv')}::int[])` : [],
    ids('modal').length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${ids('modal')}::int[])` : [],
    ids('proc').length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${ids('proc')}::int[])` : [],
  ])
  const mapa = (l: Array<{ id: number; nome: string | null }>) => Object.fromEntries(l.map(x => [Number(x.id), x.nome ?? `Código ${x.id}`]))
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    exames: lista.map(r => ({
      cdExame: Number(r.cd_exame), cdAtendimento: Number(r.cd_atendimento), data: r.data, cdConvenio: id(r.conv), cdModalidade: id(r.modal), cdProcedimento: id(r.proc),
      guia: r.guia, autorizacao: r.autorizacao, solicitacao: r.solicitacao, dataAutorizacao: r.dt_autorizacao, validade: r.validade,
      situacao: r.situacao as 'cancelada' | 'pendente' | 'vencida' | 'autorizada', negada: r.negada === true, divergente: r.divergente === true, faturado: r.faturado === true,
      valor: num(r.valor), motivoGlosa: r.motivo_glosa, pendencia: r.pendencia,
    })),
    limite: 30000,
    mensal: mensal.map(x => ({ mes: x.mes, situacao: x.situacao, exames: num(x.exames), guias: num(x.guias), valor: num(x.valor) })),
    proximas: proximas.map(r => ({ cdExame: Number(r.cd_exame), cdAtendimento: Number(r.cd_atendimento), data: r.data, cdConvenio: id(r.conv), cdProcedimento: id(r.proc), guia: r.guia, autorizacao: r.autorizacao, validade: r.validade, valor: num(r.valor) })),
    nomes: { convenios: mapa(c), modalidades: mapa(m), procedimentos: mapa(p) },
    atualizadoEm: new Date().toISOString(),
  }
}

// ---------------- Demonstrativos de retorno (TISS importado) ----------------

async function demonstrativos(f: FiltrosSimples) {
  const [retornos, semRetorno] = await Promise.all([
    prisma.$queryRaw<Array<{
      cd_retorno: number; data: string | null; descricao: string | null; conv: number | null; convenio: string | null; linhas: bigint; guias: bigint
      protocolos: string | null; demonstrativo: number | null; protocolo_data: string | null; informado: number; processado: number; liberado: number; glosado: number
      linhas_glosa: bigint; divergentes: bigint; pagos: number; situacoes: string | null
    }>>`
      SELECT r.cd_retorno, to_char(r.dt_retorno, 'YYYY-MM-DD') AS data, NULLIF(TRIM(r.ds_retorno), '') AS descricao, r.cd_fornecedor AS conv, TRIM(fo.ds_fornecedor) AS convenio,
             COUNT(c.cd_conta) AS linhas, COUNT(DISTINCT COALESCE(NULLIF(TRIM(c.ds_guia_prestador), ''), NULLIF(TRIM(c.ds_guia_operadora), ''))) AS guias,
             string_agg(DISTINCT NULLIF(TRIM(c.nr_protocolo_lote), ''), ', ') AS protocolos, MAX(c.nr_operadora_demonstrativo) AS demonstrativo,
             to_char(MIN(c.dt_protocolo), 'YYYY-MM-DD') AS protocolo_data,
             SUM(COALESCE(c.nr_procedimento_vi, 0)) AS informado, SUM(COALESCE(c.nr_procedimento_vp, 0)) AS processado,
             SUM(COALESCE(c.nr_procedimento_vl, 0)) AS liberado, SUM(COALESCE(c.nr_procedimento_vg, 0)) AS glosado,
             COUNT(*) FILTER (WHERE c.sn_glosa OR COALESCE(c.nr_procedimento_vg, 0) > 0) AS linhas_glosa,
             COUNT(*) FILTER (WHERE ABS(COALESCE(c.nr_procedimento_vi, 0) - COALESCE(c.nr_procedimento_vl, 0) - COALESCE(c.nr_procedimento_vg, 0)) > 0.01) AS divergentes,
             SUM(CASE WHEN COALESCE(NULLIF(TRIM(c.ds_status), ''), NULLIF(TRIM(c.ds_protocolo_situacao), ''), NULLIF(TRIM(c.ds_guia_situacao), '')) = '6' THEN COALESCE(c.nr_procedimento_vl, 0) ELSE 0 END) AS pagos,
             string_agg(DISTINCT COALESCE(NULLIF(TRIM(c.ds_status), ''), NULLIF(TRIM(c.ds_protocolo_situacao), ''), NULLIF(TRIM(c.ds_guia_situacao), '')), ',') AS situacoes
      FROM tiss_retorno r
      LEFT JOIN tiss_contas c ON c.cd_retorno = r.cd_retorno
      LEFT JOIN fornecedores fo ON fo.cd_fornecedor = r.cd_fornecedor
      WHERE r.dt_retorno BETWEEN ${f.inicio}::date AND ${f.fim}::date
        ${f.convenio ? Prisma.sql`AND r.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1, 2, 3, 4, 5 ORDER BY 2 DESC, 1 DESC`,
    // Exames faturados em faturas emitidas no período sem retorno TISS identificado (exames.cd_conta vazio).
    prisma.$queryRaw<Array<{ exames: bigint; guias: bigint; valor: number; faturados: bigint }>>`
      SELECT COUNT(*) FILTER (WHERE e.cd_conta IS NULL) AS exames,
             COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) FILTER (WHERE e.cd_conta IS NULL) AS guias,
             SUM(CASE WHEN e.cd_conta IS NULL THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS valor, COUNT(*) AS faturados
      FROM exames e JOIN lancamentos f ON f.cd_lancamento = e.cd_lancamento AND f.ds_tipo = 'F'
      WHERE f.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date
        ${f.convenio ? Prisma.sql`AND f.cd_fornecedor = ${f.convenio}` : Prisma.empty}`,
  ])
  const s = semRetorno[0]
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    demonstrativos: retornos.map(r => ({
      cdRetorno: Number(r.cd_retorno), data: r.data, descricao: r.descricao, cdConvenio: id(r.conv), convenio: r.convenio, linhas: num(r.linhas), guias: num(r.guias),
      protocolos: r.protocolos, demonstrativo: id(r.demonstrativo), protocoloData: r.protocolo_data, informado: num(r.informado), processado: num(r.processado),
      liberado: num(r.liberado), glosado: num(r.glosado), linhasGlosa: num(r.linhas_glosa), divergentes: num(r.divergentes), pagos: num(r.pagos),
      situacoes: (r.situacoes ?? '').split(',').filter(Boolean),
    })),
    semRetorno: { exames: num(s?.exames), guias: num(s?.guias), valor: num(s?.valor), faturados: num(s?.faturados) },
    atualizadoEm: new Date().toISOString(),
  }
}

async function itensDemonstrativo(cdRetorno: number) {
  const rows = await prisma.$queryRaw<Array<{ guia: string | null; protocolo: string | null; realizado: string | null; procedimento: string | null; codigo: string | null; qtde: number | null; vi: number; vp: number; vl: number; vg: number; glosa_tipo: string | null; glosa: string | null; situacao: string | null; exame: number | null }>>`
    SELECT COALESCE(NULLIF(TRIM(c.ds_guia_prestador), ''), NULLIF(TRIM(c.ds_guia_operadora), '')) AS guia, NULLIF(TRIM(c.nr_protocolo_lote), '') AS protocolo,
           to_char(c.dt_guia_realizado, 'YYYY-MM-DD') AS realizado, TRIM(c.ds_procedimento) AS procedimento, TRIM(c.ds_procedimento_codigo) AS codigo, c.nr_procedimento_qte AS qtde,
           COALESCE(c.nr_procedimento_vi, 0) AS vi, COALESCE(c.nr_procedimento_vp, 0) AS vp, COALESCE(c.nr_procedimento_vl, 0) AS vl, COALESCE(c.nr_procedimento_vg, 0) AS vg,
           TRIM(c.ds_glosa_tipo) AS glosa_tipo, TRIM(c.ds_glosa_descricao) AS glosa,
           COALESCE(NULLIF(TRIM(c.ds_status), ''), NULLIF(TRIM(c.ds_protocolo_situacao), ''), NULLIF(TRIM(c.ds_guia_situacao), '')) AS situacao,
           (SELECT MIN(e.cd_exame) FROM exames e WHERE e.cd_conta = c.cd_conta) AS exame
    FROM tiss_contas c WHERE c.cd_retorno = ${cdRetorno}
    ORDER BY ABS(COALESCE(c.nr_procedimento_vi, 0) - COALESCE(c.nr_procedimento_vl, 0)) DESC LIMIT 3000`
  return rows.map(r => ({ guia: r.guia, protocolo: r.protocolo, realizado: r.realizado, procedimento: r.procedimento, codigo: r.codigo, quantidade: r.qtde === null ? null : Number(r.qtde),
    informado: num(r.vi), processado: num(r.vp), liberado: num(r.vl), glosado: num(r.vg), glosaCodigo: r.glosa_tipo, glosa: r.glosa, situacao: r.situacao, cdExame: id(r.exame) }))
}

// ---------------- Produtividade do faturamento ----------------

async function produtividade(f: FiltrosSimples) {
  const conv = f.convenio ? Prisma.sql`AND l.cd_fornecedor = ${f.convenio}` : Prisma.empty
  const [porDia, porColaborador, prazo, competencia, rejeicoes, refaturados] = await Promise.all([
    prisma.$queryRaw<Array<{ dia: string; faturas: bigint; valor: number; exames: bigint; guias: bigint }>>`
      WITH fat AS (
        SELECT l.cd_lancamento, l.dt_emissao, SUM(COALESCE(p.nr_previsto, 0)) AS valor
        FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
        WHERE l.ds_tipo = 'F' AND l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date ${conv} GROUP BY 1, 2
      ),
      ex AS (SELECT e.cd_lancamento, COUNT(*) AS exames, COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) AS guias FROM exames e WHERE e.cd_lancamento IN (SELECT cd_lancamento FROM fat) GROUP BY 1)
      SELECT to_char(fat.dt_emissao, 'YYYY-MM-DD') AS dia, COUNT(*) AS faturas, SUM(fat.valor) AS valor,
             SUM(COALESCE(ex.exames, 0)) AS exames, SUM(COALESCE(ex.guias, 0)) AS guias
      FROM fat LEFT JOIN ex ON ex.cd_lancamento = fat.cd_lancamento GROUP BY 1`,
    prisma.$queryRaw<Array<{ colaborador: string | null; faturas: bigint; valor: number; exames: bigint; guias: bigint }>>`
      WITH fat AS (
        SELECT l.cd_lancamento, COALESCE(l.cd_funcionario_lancamento, l.cd_funcionario) AS fu, SUM(COALESCE(p.nr_previsto, 0)) AS valor
        FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
        WHERE l.ds_tipo = 'F' AND l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date ${conv} GROUP BY 1, 2
      ),
      ex AS (SELECT e.cd_lancamento, COUNT(*) AS exames, COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) AS guias FROM exames e WHERE e.cd_lancamento IN (SELECT cd_lancamento FROM fat) GROUP BY 1)
      SELECT TRIM(fu.ds_funcionario) AS colaborador, COUNT(*) AS faturas, SUM(fat.valor) AS valor, SUM(COALESCE(ex.exames, 0)) AS exames, SUM(COALESCE(ex.guias, 0)) AS guias
      FROM fat LEFT JOIN ex ON ex.cd_lancamento = fat.cd_lancamento LEFT JOIN funcionarios fu ON fu.cd_funcionario = fat.fu
      GROUP BY 1`,
    // Dias entre o exame e a emissão da fatura (exames faturados no período), para o percentual dentro do prazo.
    prisma.$queryRaw<Array<{ dias: number; exames: bigint; valor: number }>>`
      SELECT LEAST(GREATEST(l.dt_emissao - a.dt_data, 0), 120) AS dias, COUNT(*) AS exames, SUM(COALESCE(e.nr_vl_convenio, 0)) AS valor
      FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      JOIN lancamentos l ON l.cd_lancamento = e.cd_lancamento AND l.ds_tipo = 'F'
      WHERE l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date ${conv}
      GROUP BY 1`,
    // Valor faturado por competência da fatura.
    prisma.$queryRaw<Array<{ competencia: string | null; faturas: bigint; valor: number }>>`
      SELECT CASE WHEN l.nr_ano BETWEEN 2000 AND 2100 AND l.nr_mes BETWEEN 1 AND 12 THEN to_char(make_date(l.nr_ano, l.nr_mes, 1), 'YYYY-MM')
                  WHEN l.dt_fatura IS NOT NULL THEN to_char(l.dt_fatura, 'YYYY-MM') END AS competencia,
             COUNT(DISTINCT l.cd_lancamento) AS faturas, SUM(COALESCE(p.nr_previsto, 0)) AS valor
      FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
      WHERE l.ds_tipo = 'F' AND l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date ${conv}
      GROUP BY 1`,
    // Rejeições (glosas registradas) por mês da glosa.
    prisma.$queryRaw<Array<{ mes: string; glosas: bigint; valor: number }>>`
      SELECT to_char(e.dt_glosa, 'YYYY-MM') AS mes, COUNT(*) AS glosas, SUM(COALESCE(e.nr_vl_glosa, 0)) AS valor
      FROM exames e LEFT JOIN planos pl ON pl.cd_plano = e.cd_plano
      WHERE e.dt_glosa BETWEEN ${f.inicio}::date AND ${f.fim}::date AND (COALESCE(e.nr_vl_glosa, 0) > 0 OR e.cd_glosa_tiss IS NOT NULL)
        ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1`,
    // Retrabalho: exames das faturas do período que já estiveram em outra fatura (troca registrada no log do Clinux).
    prisma.$queryRaw<Array<{ exames: bigint }>>`
      SELECT COUNT(DISTINCT e.cd_exame) AS exames
      FROM exames e JOIN lancamentos l ON l.cd_lancamento = e.cd_lancamento AND l.ds_tipo = 'F'
      WHERE l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date ${conv}
        AND EXISTS (
          SELECT 1 FROM log_clinux x
          WHERE x.cd_key = e.cd_exame AND LOWER(TRIM(x.ds_table)) = 'exames'
            AND regexp_replace(LOWER(x.ds_field), '[^a-z]', '', 'g') IN ('cdlancamento', 'lancamento', 'fatura')
            AND COALESCE(TRIM(x.ds_before), '') NOT IN ('', '0')
        )`,
  ])
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    porDia: porDia.map(d => ({ dia: d.dia, faturas: num(d.faturas), valor: num(d.valor), exames: num(d.exames), guias: num(d.guias) })),
    porColaborador: porColaborador.map(c => ({ colaborador: c.colaborador ?? 'Não informado', faturas: num(c.faturas), valor: num(c.valor), exames: num(c.exames), guias: num(c.guias) })),
    prazo: prazo.map(p => ({ dias: Number(p.dias), exames: num(p.exames), valor: num(p.valor) })),
    competencia: competencia.map(c => ({ competencia: c.competencia, faturas: num(c.faturas), valor: num(c.valor) })),
    rejeicoes: rejeicoes.map(r => ({ mes: r.mes, glosas: num(r.glosas), valor: num(r.valor) })),
    refaturados: num(refaturados[0]?.exames),
    atualizadoEm: new Date().toISOString(),
  }
}

// ---------------- Auditoria automática ----------------

type Item = { exame: number | null; atendimento: number | null; lote: number | null; guia: string | null; data: string | null; convenio: string | null; procedimento: string | null; valor: number; detalhe: string | null; total: bigint; impacto: number | null }
type Verificacao = { id: string; titulo: string; gravidade: 'alta' | 'media' | 'baixa'; descricao: string; sql: Prisma.Sql }

function verificacoes(f: FiltrosSimples): Verificacao[] {
  const conv = f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty
  const per = Prisma.sql`a.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date`
  // Colunas padrão de um item de exame.
  const item = (detalhe: Prisma.Sql) => Prisma.sql`e.cd_exame AS exame, a.cd_atendimento AS atendimento, f.cd_lancamento AS lote, NULLIF(TRIM(e.ds_guia), '') AS guia,
    to_char(a.dt_data, 'YYYY-MM-DD') AS data, TRIM(fo.ds_fornecedor) AS convenio, TRIM(pr.ds_procedimento) AS procedimento, COALESCE(e.nr_vl_convenio, 0) AS valor,
    ${detalhe} AS detalhe, COUNT(*) OVER () AS total, SUM(COALESCE(e.nr_vl_convenio, 0)) OVER () AS impacto`
  const base = Prisma.sql`${exames} LEFT JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor`
  return [
    { id: 'sem_faturamento', titulo: 'Exames realizados sem faturamento há mais de 30 dias', gravidade: 'alta', descricao: 'Exame de convênio sem fatura no Clinux.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`(current_date - a.dt_data) || ' dias sem fatura'`)} FROM ${base}
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND f.cd_lancamento IS NULL AND COALESCE(e.nr_vl_convenio, 0) > 0 AND a.dt_data < current_date - 30
        ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'faturado_cancelado', titulo: 'Exames faturados com atendimento cancelado', gravidade: 'alta', descricao: 'Faturado sem realização correspondente.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'atendimento cancelado e exame na fatura ' || f.cd_lancamento`)} FROM ${base}
        WHERE ${per} AND a.ds_status = 1 ${conv} AND f.cd_lancamento IS NOT NULL ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'convenio_divergente', titulo: 'Convênio do exame diferente do convênio da fatura', gravidade: 'alta', descricao: 'Divergência de convênio entre o exame e o lote.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'fatura de ' || COALESCE(TRIM(fo2.ds_fornecedor), '?')`)} FROM ${base}
        LEFT JOIN fornecedores fo2 ON fo2.cd_fornecedor = f.cd_fornecedor
        WHERE ${per} ${conv} AND f.cd_lancamento IS NOT NULL AND pl.cd_fornecedor IS DISTINCT FROM f.cd_fornecedor
        ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'cobranca_duplicada', titulo: 'Possível cobrança duplicada', gravidade: 'media', descricao: 'Mesmo paciente, procedimento e dia em mais de um exame de convênio.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`d.vezes || ' exames iguais no dia'`)} FROM ${base}
        JOIN (SELECT a2.cd_paciente, e2.cd_procedimento, a2.dt_data, COUNT(*) AS vezes FROM exames e2 JOIN atendimentos a2 ON a2.cd_atendimento = e2.cd_atendimento
              WHERE a2.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date AND a2.ds_status IS DISTINCT FROM 1 AND COALESCE(e2.nr_vl_convenio, 0) > 0
              GROUP BY 1, 2, 3 HAVING COUNT(*) > 1) d ON d.cd_paciente = a.cd_paciente AND d.cd_procedimento = e.cd_procedimento AND d.dt_data = a.dt_data
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND COALESCE(e.nr_vl_convenio, 0) > 0
        ORDER BY a.dt_data, a.cd_paciente LIMIT 200` },
    { id: 'guia_duplicada', titulo: 'Mesma guia em pacientes diferentes', gravidade: 'media', descricao: 'Guia potencialmente duplicada no mesmo convênio.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`d.pacientes || ' pacientes com esta guia'`)} FROM ${base}
        JOIN (SELECT TRIM(e2.ds_guia) AS guia, pl2.cd_fornecedor, COUNT(DISTINCT a2.cd_paciente) AS pacientes FROM exames e2 JOIN atendimentos a2 ON a2.cd_atendimento = e2.cd_atendimento
              LEFT JOIN planos pl2 ON pl2.cd_plano = e2.cd_plano
              WHERE a2.dt_data BETWEEN ${f.inicio}::date - 90 AND ${f.fim}::date AND NULLIF(TRIM(e2.ds_guia), '') IS NOT NULL AND a2.ds_status IS DISTINCT FROM 1
              GROUP BY 1, 2 HAVING COUNT(DISTINCT a2.cd_paciente) > 1) d ON d.guia = TRIM(e.ds_guia) AND d.cd_fornecedor IS NOT DISTINCT FROM pl.cd_fornecedor
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} ORDER BY TRIM(e.ds_guia) LIMIT 200` },
    { id: 'autorizacao_duplicada', titulo: 'Mesma autorização em pacientes diferentes', gravidade: 'media', descricao: 'Identificador de autorização duplicado.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'autorização ' || TRIM(e.ds_autorizacao) || ' em ' || d.pacientes || ' pacientes'`)} FROM ${base}
        JOIN (SELECT TRIM(e2.ds_autorizacao) AS aut, COUNT(DISTINCT a2.cd_paciente) AS pacientes FROM exames e2 JOIN atendimentos a2 ON a2.cd_atendimento = e2.cd_atendimento
              WHERE a2.dt_data BETWEEN ${f.inicio}::date - 90 AND ${f.fim}::date AND length(TRIM(COALESCE(e2.ds_autorizacao, ''))) >= 4 AND a2.ds_status IS DISTINCT FROM 1
              GROUP BY 1 HAVING COUNT(DISTINCT a2.cd_paciente) > 1) d ON d.aut = TRIM(e.ds_autorizacao)
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} ORDER BY TRIM(e.ds_autorizacao) LIMIT 200` },
    { id: 'datas', titulo: 'Datas incompatíveis', gravidade: 'media', descricao: 'Autorização depois do exame ou fatura emitida antes do exame.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`CASE WHEN e.dt_autorizacao > a.dt_data THEN 'autorização em ' || to_char(e.dt_autorizacao, 'DD/MM/YYYY') ELSE 'fatura emitida em ' || to_char(f.dt_emissao, 'DD/MM/YYYY') END`)} FROM ${base}
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND (e.dt_autorizacao > a.dt_data OR f.dt_emissao < a.dt_data)
        ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'sem_informacao', titulo: 'Exames de convênio sem guia, autorização ou procedimento', gravidade: 'media', descricao: 'Falta de informação essencial para faturar.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`concat_ws(', ', CASE WHEN NULLIF(TRIM(e.ds_guia), '') IS NULL THEN 'sem guia' END, CASE WHEN NULLIF(TRIM(e.ds_autorizacao), '') IS NULL THEN 'sem autorização' END, CASE WHEN e.cd_procedimento IS NULL THEN 'sem procedimento' END)`)} FROM ${base}
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND COALESCE(e.nr_vl_convenio, 0) > 0
          AND (NULLIF(TRIM(e.ds_guia), '') IS NULL OR NULLIF(TRIM(e.ds_autorizacao), '') IS NULL OR e.cd_procedimento IS NULL)
        ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'valor_zerado', titulo: 'Procedimentos com valor zerado', gravidade: 'media', descricao: 'Exame realizado sem valor de convênio nem particular.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'valor zerado'`)} FROM ${base}
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND COALESCE(e.nr_vl_convenio, 0) = 0 AND COALESCE(e.nr_vl_particular, 0) = 0
        ORDER BY a.dt_data LIMIT 200` },
    { id: 'valor_fora_padrao', titulo: 'Valor muito diferente do habitual no convênio', gravidade: 'baixa', descricao: 'Mais de 50% acima ou abaixo da mediana do mesmo procedimento no mesmo convênio (90 dias).',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'mediana ' || to_char(md.mediana, 'FM999G999G990D00')`)} FROM ${base}
        JOIN (SELECT e2.cd_procedimento, pl2.cd_fornecedor, percentile_cont(0.5) WITHIN GROUP (ORDER BY e2.nr_vl_convenio) AS mediana, COUNT(*) AS n
              FROM exames e2 JOIN atendimentos a2 ON a2.cd_atendimento = e2.cd_atendimento LEFT JOIN planos pl2 ON pl2.cd_plano = e2.cd_plano
              WHERE a2.dt_data BETWEEN ${f.fim}::date - 90 AND ${f.fim}::date AND COALESCE(e2.nr_vl_convenio, 0) > 0 AND a2.ds_status IS DISTINCT FROM 1
              GROUP BY 1, 2 HAVING COUNT(*) >= 5) md ON md.cd_procedimento = e.cd_procedimento AND md.cd_fornecedor IS NOT DISTINCT FROM pl.cd_fornecedor
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND COALESCE(e.nr_vl_convenio, 0) > 0
          AND (e.nr_vl_convenio > md.mediana * 1.5 OR e.nr_vl_convenio < md.mediana * 0.5)
        ORDER BY ABS(e.nr_vl_convenio - md.mediana) DESC LIMIT 200` },
    { id: 'modalidade_divergente', titulo: 'Procedimento de modalidade diferente da sala', gravidade: 'baixa', descricao: 'Divergência entre a modalidade do procedimento e a da sala do atendimento.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'procedimento de ' || COALESCE(TRIM(m1.ds_modalidade), '?') || ', sala de ' || COALESCE(TRIM(m2.ds_modalidade), '?')`)} FROM ${base}
        LEFT JOIN modalidades m1 ON m1.cd_modalidade = pr.cd_modalidade LEFT JOIN modalidades m2 ON m2.cd_modalidade = sl.cd_modalidade
        WHERE ${per} AND a.ds_status IS DISTINCT FROM 1 ${conv} AND pr.cd_modalidade IS NOT NULL AND sl.cd_modalidade IS NOT NULL AND pr.cd_modalidade <> sl.cd_modalidade
          AND upper(COALESCE(m2.ds_modalidade, '')) NOT LIKE '%TOTEM%'
        ORDER BY e.nr_vl_convenio DESC NULLS LAST LIMIT 200` },
    { id: 'glosa_sem_guia', titulo: 'Glosas sem guia identificada', gravidade: 'baixa', descricao: 'Exame glosado sem número de guia.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'glosa de ' || to_char(COALESCE(e.nr_vl_glosa, 0), 'FM999G999G990D00')`)} FROM ${base}
        WHERE ${per} ${conv} AND (COALESCE(e.nr_vl_glosa, 0) > 0 OR e.cd_glosa_tiss IS NOT NULL) AND NULLIF(TRIM(e.ds_guia), '') IS NULL
        ORDER BY e.nr_vl_glosa DESC NULLS LAST LIMIT 200` },
    { id: 'recurso_sem_glosa', titulo: 'Recursos sem glosa correspondente', gravidade: 'baixa', descricao: 'Recurso registrado em exame sem glosa.',
      sql: Prisma.sql`SELECT ${item(Prisma.sql`'recurso em ' || to_char(COALESCE(e.dt_recurso, eg.dt_recurso), 'DD/MM/YYYY')`)} FROM ${base}
        LEFT JOIN LATERAL (SELECT MAX(x.dt_recurso) AS dt_recurso FROM exames_glosas x WHERE x.cd_exame = e.cd_exame) eg ON true
        WHERE ${per} ${conv} AND (e.dt_recurso IS NOT NULL OR eg.dt_recurso IS NOT NULL) AND COALESCE(e.nr_vl_glosa, 0) = 0 AND e.cd_glosa_tiss IS NULL
        ORDER BY a.dt_data LIMIT 200` },
  ]
}

// Verificações sobre faturas (lotes) e demonstrativos.
function verificacoesLote(f: FiltrosSimples) {
  const conv = f.convenio ? Prisma.sql`AND l.cd_fornecedor = ${f.convenio}` : Prisma.empty
  const itemLote = (detalhe: Prisma.Sql) => Prisma.sql`NULL::int AS exame, NULL::int AS atendimento, l.cd_lancamento AS lote, NULLIF(TRIM(l.ds_fatura), '') AS guia,
    to_char(l.dt_emissao, 'YYYY-MM-DD') AS data, TRIM(fo.ds_fornecedor) AS convenio, NULL::text AS procedimento, x.valor AS valor, ${detalhe} AS detalhe,
    COUNT(*) OVER () AS total, SUM(x.valor) OVER () AS impacto`
  const fat = Prisma.sql`(SELECT l2.cd_lancamento, SUM(COALESCE(p.nr_previsto, 0)) AS valor, SUM(CASE WHEN p.dt_realizacao IS NOT NULL THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS recebido,
      BOOL_OR(p.dt_realizacao IS NULL AND p.dt_vencimento < current_date - 15) AS atrasada, MIN(p.dt_vencimento) AS vencimento
      FROM lancamentos l2 JOIN pagamentos p ON p.cd_lancamento = l2.cd_lancamento
      WHERE l2.ds_tipo = 'F' AND l2.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date GROUP BY 1) x`
  return [
    { id: 'lote_duplicado', titulo: 'Faturas possivelmente duplicadas', gravidade: 'media' as const, descricao: 'Mesmo convênio com o mesmo número de fatura, ou mesmo valor e data.',
      sql: Prisma.sql`SELECT ${itemLote(Prisma.sql`d.vezes || ' faturas iguais'`)} FROM ${fat}
        JOIN lancamentos l ON l.cd_lancamento = x.cd_lancamento LEFT JOIN fornecedores fo ON fo.cd_fornecedor = l.cd_fornecedor
        JOIN (SELECT l3.cd_fornecedor, COALESCE(NULLIF(TRIM(l3.ds_fatura), ''), to_char(l3.dt_emissao, 'YYYYMMDD')) AS chave, COUNT(*) AS vezes
              FROM lancamentos l3 WHERE l3.ds_tipo = 'F' AND l3.dt_emissao BETWEEN ${f.inicio}::date - 60 AND ${f.fim}::date
              GROUP BY 1, 2 HAVING COUNT(*) > 1 AND (MIN(NULLIF(TRIM(l3.ds_fatura), '')) IS NOT NULL OR COUNT(DISTINCT l3.cd_lancamento) > 1)) d
          ON d.cd_fornecedor IS NOT DISTINCT FROM l.cd_fornecedor AND d.chave = COALESCE(NULLIF(TRIM(l.ds_fatura), ''), to_char(l.dt_emissao, 'YYYYMMDD'))
        WHERE TRUE ${conv} AND NULLIF(TRIM(l.ds_fatura), '') IS NOT NULL ORDER BY l.cd_fornecedor, l.ds_fatura LIMIT 200` },
    { id: 'valor_fatura', titulo: 'Valor da fatura diferente da soma dos exames', gravidade: 'media' as const, descricao: 'Diferença maior que 1% entre o título e os exames ligados a ele.',
      sql: Prisma.sql`SELECT ${itemLote(Prisma.sql`'exames somam ' || to_char(COALESCE(s.soma, 0), 'FM999G999G990D00')`)} FROM ${fat}
        JOIN lancamentos l ON l.cd_lancamento = x.cd_lancamento LEFT JOIN fornecedores fo ON fo.cd_fornecedor = l.cd_fornecedor
        LEFT JOIN (SELECT cd_lancamento, SUM(COALESCE(nr_vl_convenio, 0)) AS soma FROM exames WHERE cd_lancamento IS NOT NULL GROUP BY 1) s ON s.cd_lancamento = x.cd_lancamento
        WHERE TRUE ${conv} AND ABS(x.valor - COALESCE(s.soma, 0)) > GREATEST(x.valor, 1) * 0.01
        ORDER BY ABS(x.valor - COALESCE(s.soma, 0)) DESC LIMIT 200` },
    { id: 'lote_sem_retorno', titulo: 'Faturas vencidas há mais de 15 dias sem recebimento', gravidade: 'media' as const, descricao: 'Lote sem retorno de pagamento.',
      sql: Prisma.sql`SELECT ${itemLote(Prisma.sql`'venceu em ' || to_char(x.vencimento, 'DD/MM/YYYY') || ', recebido ' || to_char(x.recebido, 'FM999G999G990D00')`)} FROM ${fat}
        JOIN lancamentos l ON l.cd_lancamento = x.cd_lancamento LEFT JOIN fornecedores fo ON fo.cd_fornecedor = l.cd_fornecedor
        WHERE x.atrasada ${conv} ORDER BY x.valor - x.recebido DESC LIMIT 200` },
    { id: 'demonstrativo_sem_guia', titulo: 'Itens de demonstrativo sem guia correspondente no Clinux', gravidade: 'baixa' as const, descricao: 'Retorno TISS com guia que não aparece em nenhum exame.',
      sql: Prisma.sql`SELECT NULL::int AS exame, NULL::int AS atendimento, NULL::int AS lote, COALESCE(NULLIF(TRIM(c.ds_guia_prestador), ''), NULLIF(TRIM(c.ds_guia_operadora), '')) AS guia,
          to_char(r.dt_retorno, 'YYYY-MM-DD') AS data, TRIM(fo.ds_fornecedor) AS convenio, TRIM(c.ds_procedimento) AS procedimento, COALESCE(c.nr_procedimento_vi, 0) AS valor,
          'demonstrativo ' || r.cd_retorno AS detalhe, COUNT(*) OVER () AS total, SUM(COALESCE(c.nr_procedimento_vi, 0)) OVER () AS impacto
        FROM tiss_retorno r JOIN tiss_contas c ON c.cd_retorno = r.cd_retorno LEFT JOIN fornecedores fo ON fo.cd_fornecedor = r.cd_fornecedor
        WHERE r.dt_retorno BETWEEN ${f.inicio}::date AND ${f.fim}::date ${f.convenio ? Prisma.sql`AND r.cd_fornecedor = ${f.convenio}` : Prisma.empty}
          AND NOT EXISTS (SELECT 1 FROM exames e WHERE e.cd_conta = c.cd_conta)
          AND NOT EXISTS (SELECT 1 FROM exames e WHERE NULLIF(TRIM(e.ds_guia_prestador), '') = TRIM(c.ds_guia_prestador) OR NULLIF(TRIM(e.ds_guia), '') = TRIM(c.ds_guia_prestador))
        ORDER BY c.nr_procedimento_vi DESC NULLS LAST LIMIT 200` },
  ]
}

async function auditoria(f: FiltrosSimples) {
  const todas = [...verificacoes(f), ...verificacoesLote(f)]
  const resultados = await Promise.all(todas.map(async v => {
    const rows = await prisma.$queryRaw<Item[]>(v.sql)
    return {
      id: v.id, titulo: v.titulo, gravidade: v.gravidade, descricao: v.descricao,
      quantidade: num(rows[0]?.total), impacto: num(rows[0]?.impacto),
      itens: rows.map(r => ({ exame: id(r.exame), atendimento: id(r.atendimento), lote: id(r.lote), guia: r.guia, data: r.data, convenio: r.convenio, procedimento: r.procedimento, valor: num(r.valor), detalhe: r.detalhe })),
    }
  }))
  // Evolução mensal (6 meses) das verificações de exame mais simples.
  const evolucao = await prisma.$queryRaw<Array<{ mes: string; sem_faturamento: bigint; faturado_cancelado: bigint; datas: bigint; sem_informacao: bigint; valor_zerado: bigint }>>`
    SELECT to_char(a.dt_data, 'YYYY-MM') AS mes,
           COUNT(*) FILTER (WHERE a.ds_status IS DISTINCT FROM 1 AND f.cd_lancamento IS NULL AND COALESCE(e.nr_vl_convenio, 0) > 0 AND a.dt_data < current_date - 30) AS sem_faturamento,
           COUNT(*) FILTER (WHERE a.ds_status = 1 AND f.cd_lancamento IS NOT NULL) AS faturado_cancelado,
           COUNT(*) FILTER (WHERE a.ds_status IS DISTINCT FROM 1 AND (e.dt_autorizacao > a.dt_data OR f.dt_emissao < a.dt_data)) AS datas,
           COUNT(*) FILTER (WHERE a.ds_status IS DISTINCT FROM 1 AND COALESCE(e.nr_vl_convenio, 0) > 0 AND (NULLIF(TRIM(e.ds_guia), '') IS NULL OR NULLIF(TRIM(e.ds_autorizacao), '') IS NULL)) AS sem_informacao,
           COUNT(*) FILTER (WHERE a.ds_status IS DISTINCT FROM 1 AND COALESCE(e.nr_vl_convenio, 0) = 0 AND COALESCE(e.nr_vl_particular, 0) = 0) AS valor_zerado
    FROM ${exames}
    WHERE a.dt_data >= date_trunc('month', ${f.fim}::date) - interval '5 months' AND a.dt_data <= ${f.fim}::date
      ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
    GROUP BY 1`
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    verificacoes: resultados,
    evolucao: evolucao.map(e => ({ mes: e.mes, sem_faturamento: num(e.sem_faturamento), faturado_cancelado: num(e.faturado_cancelado), datas: num(e.datas), sem_informacao: num(e.sem_informacao), valor_zerado: num(e.valor_zerado) })),
    atualizadoEm: new Date().toISOString(),
  }
}

export async function faturamentoControleRoutes(fastify: FastifyInstance) {
  const rota = <T>(caminho: string, esquema: z.ZodTypeAny, prefixo: string, calc: (f: never) => Promise<T>) =>
    fastify.get(caminho, async (request, reply) => {
      const p = esquema.safeParse(request.query)
      if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? 'Filtros inválidos.' })
      const dados = p.data as { atualizar?: string }
      try { return await comCache(`${prefixo}|${JSON.stringify({ ...dados, atualizar: undefined })}`, Boolean(dados.atualizar), () => calc(dados as never)) }
      catch (err) { request.log.error({ err }, caminho); return reply.code(500).send({ error: erro(err) }) }
    })
  rota('/clinux/faturamento/guias', filtros, 'gu', guias as (f: never) => Promise<unknown>)
  rota('/clinux/faturamento/demonstrativos', filtrosSimples, 'de', demonstrativos as (f: never) => Promise<unknown>)
  rota('/clinux/faturamento/produtividade', filtrosSimples, 'pr', produtividade as (f: never) => Promise<unknown>)
  rota('/clinux/faturamento/auditoria', filtrosSimples, 'au', auditoria as (f: never) => Promise<unknown>)
  fastify.get('/clinux/faturamento/demonstrativos/:id/itens', async (request, reply) => {
    const cd = Number((request.params as { id?: string }).id)
    if (!Number.isInteger(cd) || cd <= 0) return reply.code(400).send({ error: 'Demonstrativo inválido.' })
    try { return { itens: await itensDemonstrativo(cd) } }
    catch (err) { request.log.error({ err }, 'itens do demonstrativo'); return reply.code(500).send({ error: erro(err) }) }
  })
}

