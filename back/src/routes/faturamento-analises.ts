import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { comCache, dataIso, erro, exames, filtros, num, onde, type Filtros } from './faturamento'

// Faturamento — rodada 1: cruzamentos por convênio, modalidade e procedimento, faturas (lotes) e glosas/recursos.
// Lote = fatura de convênio (lancamentos tipo F). O Clinux não guarda status do lote: a situação é derivada das
// parcelas do título (recebida, parcial, aguardando, atrasada = vencida sem recebimento).

const id = (v: unknown) => (v === null || v === undefined ? null : Number(v))
const mesesAntes = (fim: string, n: number) => {
  const [a, m] = fim.split('-').map(Number)
  const t = a * 12 + (m - 1) - n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}-01`
}

async function nomes(convenios: number[], modalidades: number[], procedimentos: number[]) {
  const [c, m, p] = await Promise.all([
    convenios.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${convenios}::int[])` : [],
    modalidades.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${modalidades}::int[])` : [],
    procedimentos.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${procedimentos}::int[])` : [],
  ])
  const mapa = (l: Array<{ id: number; nome: string | null }>) => Object.fromEntries(l.map(x => [Number(x.id), x.nome ?? `Código ${x.id}`]))
  return { convenios: mapa(c), modalidades: mapa(m), procedimentos: mapa(p) }
}
const unicos = (l: Array<unknown>) => [...new Set(l.filter(x => x !== null && x !== undefined).map(Number))]

const mini = Prisma.sql`
  COUNT(*) AS exames,
  SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS producao,
  SUM(COALESCE(e.nr_vl_convenio, 0)) AS faturavel,
  SUM(CASE WHEN f.cd_lancamento IS NOT NULL THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS faturado,
  COUNT(f.cd_lancamento) AS faturados,
  SUM(COALESCE(e.nr_vl_glosa, 0)) AS glosa`
type Mini = { exames: bigint; producao: number; faturavel: number; faturado: number; faturados: bigint; glosa: number }
const m = (r: Mini) => ({ exames: num(r.exames), producao: num(r.producao), faturavel: num(r.faturavel), faturado: num(r.faturado), faturados: num(r.faturados), glosa: num(r.glosa) })

// ---------------- Cruzamentos (convênio, modalidade, procedimento) ----------------

async function cruzado(f: Filtros) {
  const w = onde(f)
  const w13 = onde({ ...f, base: 'realizacao', inicio: mesesAntes(f.fim, 12), fim: f.fim })
  const [convMod, procConv, mensalConv, mensalMod, mensalProc, processamento] = await Promise.all([
    prisma.$queryRaw<Array<Mini & { conv: number | null; modal: number | null }>>`
      SELECT pl.cd_fornecedor AS conv, COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS modal, ${mini} FROM ${exames} WHERE ${w} GROUP BY 1, 2`,
    // Valor médio de cada procedimento em cada convênio (os 300 procedimentos de maior produção).
    prisma.$queryRaw<Array<Mini & { proc: number | null; conv: number | null }>>`
      WITH top AS (
        SELECT e.cd_procedimento FROM ${exames} WHERE ${w} GROUP BY 1
        ORDER BY SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) DESC LIMIT 300
      )
      SELECT e.cd_procedimento AS proc, pl.cd_fornecedor AS conv, ${mini} FROM ${exames}
      WHERE ${w} AND e.cd_procedimento IN (SELECT cd_procedimento FROM top) GROUP BY 1, 2`,
    prisma.$queryRaw<Array<Mini & { mes: string; conv: number | null }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, pl.cd_fornecedor AS conv, ${mini} FROM ${exames} WHERE ${w13} GROUP BY 1, 2`,
    prisma.$queryRaw<Array<Mini & { mes: string; modal: number | null }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS modal, ${mini} FROM ${exames} WHERE ${w13} GROUP BY 1, 2`,
    prisma.$queryRaw<Array<Mini & { mes: string; proc: number | null }>>`
      WITH top AS (
        SELECT e.cd_procedimento FROM ${exames} WHERE ${w13} GROUP BY 1
        ORDER BY SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) DESC LIMIT 40
      )
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, e.cd_procedimento AS proc, ${mini} FROM ${exames}
      WHERE ${w13} AND e.cd_procedimento IN (SELECT cd_procedimento FROM top) GROUP BY 1, 2`,
    // Processamento das faturas dos últimos 12 meses por convênio: emissão -> recebimento, abertas e atrasadas.
    prisma.$queryRaw<Array<{ conv: number | null; faturas: bigint; valor: number; recebido: number; abertas: bigint; valor_aberto: number; atrasadas: bigint; valor_atrasado: number; dias_receber: number | null; recebidas: bigint }>>`
      WITH fat AS (
        SELECT l.cd_lancamento, l.cd_fornecedor, l.dt_emissao,
               SUM(COALESCE(p.nr_previsto, 0)) AS valor,
               SUM(CASE WHEN p.dt_realizacao IS NOT NULL THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS recebido,
               BOOL_AND(p.dt_realizacao IS NOT NULL) AS quitada,
               BOOL_OR(p.dt_realizacao IS NULL AND p.dt_vencimento < current_date) AS atrasada,
               MAX(p.dt_realizacao) AS ultimo_recebimento
        FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
        WHERE l.ds_tipo = 'F' AND l.dt_emissao > ${f.fim}::date - 365 AND l.dt_emissao <= ${f.fim}::date
          ${f.convenio ? Prisma.sql`AND l.cd_fornecedor = ${f.convenio}` : Prisma.empty}
        GROUP BY 1, 2, 3
      )
      SELECT cd_fornecedor AS conv, COUNT(*) AS faturas, SUM(valor) AS valor, SUM(recebido) AS recebido,
             COUNT(*) FILTER (WHERE NOT quitada) AS abertas, SUM(CASE WHEN NOT quitada THEN valor - recebido ELSE 0 END) AS valor_aberto,
             COUNT(*) FILTER (WHERE atrasada) AS atrasadas, SUM(CASE WHEN atrasada THEN valor - recebido ELSE 0 END) AS valor_atrasado,
             AVG(ultimo_recebimento - dt_emissao) FILTER (WHERE quitada) AS dias_receber, COUNT(*) FILTER (WHERE quitada) AS recebidas
      FROM fat GROUP BY 1`,
  ])
  const n = await nomes(
    unicos([...convMod.map(x => x.conv), ...procConv.map(x => x.conv), ...mensalConv.map(x => x.conv), ...processamento.map(x => x.conv)]),
    unicos([...convMod.map(x => x.modal), ...mensalMod.map(x => x.modal)]),
    unicos([...procConv.map(x => x.proc), ...mensalProc.map(x => x.proc)]),
  )
  return {
    periodo: { inicio: f.inicio, fim: f.fim, base: f.base },
    convMod: convMod.map(r => ({ convenio: id(r.conv), modalidade: id(r.modal), ...m(r) })),
    procConv: procConv.map(r => ({ procedimento: id(r.proc), convenio: id(r.conv), ...m(r) })),
    mensalConv: mensalConv.map(r => ({ mes: r.mes, convenio: id(r.conv), ...m(r) })),
    mensalMod: mensalMod.map(r => ({ mes: r.mes, modalidade: id(r.modal), ...m(r) })),
    mensalProc: mensalProc.map(r => ({ mes: r.mes, procedimento: id(r.proc), ...m(r) })),
    processamento: processamento.map(r => ({
      convenio: id(r.conv), faturas: num(r.faturas), valor: num(r.valor), recebido: num(r.recebido), abertas: num(r.abertas), valorAberto: num(r.valor_aberto),
      atrasadas: num(r.atrasadas), valorAtrasado: num(r.valor_atrasado), diasReceber: r.dias_receber === null ? null : Math.round(Number(r.dias_receber) * 10) / 10, recebidas: num(r.recebidas),
    })),
    nomes: n,
    atualizadoEm: new Date().toISOString(),
  }
}

// ---------------- Lotes (faturas) ----------------

const filtrosLotes = z.object({ inicio: dataIso, fim: dataIso, convenio: z.coerce.number().int().positive().optional(), atualizar: z.string().optional() })

async function lotes(f: z.infer<typeof filtrosLotes>) {
  const rows = await prisma.$queryRaw<Array<{
    cd_lancamento: number; numero: string | null; documento: string | null; conv: number | null; convenio: string | null; competencia: string | null
    cadastro: string | null; emissao: string; vencimento: string | null; valor: number; recebido: number; ultimo_recebimento: string | null
    quitada: boolean; alguma: boolean; atrasada: boolean; exames: bigint; guias: bigint; valor_exames: number; glosa: number; responsavel: string | null
  }>>`
    WITH fat AS (
      SELECT l.cd_lancamento, SUM(COALESCE(p.nr_previsto, 0)) AS valor,
             SUM(CASE WHEN p.dt_realizacao IS NOT NULL THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS recebido,
             MIN(p.dt_vencimento) AS vencimento, MAX(p.dt_realizacao) AS ultimo_recebimento,
             BOOL_AND(p.dt_realizacao IS NOT NULL) AS quitada, BOOL_OR(p.dt_realizacao IS NOT NULL) AS alguma,
             BOOL_OR(p.dt_realizacao IS NULL AND p.dt_vencimento < current_date) AS atrasada
      FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
      WHERE l.ds_tipo = 'F' AND l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date
        ${f.convenio ? Prisma.sql`AND l.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1
    ),
    ex AS (
      SELECT e.cd_lancamento, COUNT(*) AS exames, COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) AS guias,
             SUM(COALESCE(e.nr_vl_convenio, 0)) AS valor_exames, SUM(COALESCE(e.nr_vl_glosa, 0)) AS glosa
      FROM exames e WHERE e.cd_lancamento IN (SELECT cd_lancamento FROM fat) GROUP BY 1
    )
    SELECT l.cd_lancamento, NULLIF(TRIM(l.ds_fatura), '') AS numero, NULLIF(TRIM(l.ds_documento), '') AS documento,
           l.cd_fornecedor AS conv, TRIM(fo.ds_fornecedor) AS convenio,
           CASE WHEN l.nr_ano BETWEEN 2000 AND 2100 AND l.nr_mes BETWEEN 1 AND 12 THEN to_char(make_date(l.nr_ano, l.nr_mes, 1), 'YYYY-MM')
                WHEN l.dt_fatura IS NOT NULL THEN to_char(l.dt_fatura, 'YYYY-MM') END AS competencia,
           to_char(l.dt_cadastro, 'YYYY-MM-DD') AS cadastro, to_char(l.dt_emissao, 'YYYY-MM-DD') AS emissao, to_char(fat.vencimento, 'YYYY-MM-DD') AS vencimento,
           fat.valor, fat.recebido, to_char(fat.ultimo_recebimento, 'YYYY-MM-DD') AS ultimo_recebimento, fat.quitada, fat.alguma, fat.atrasada,
           COALESCE(ex.exames, 0) AS exames, COALESCE(ex.guias, 0) AS guias, COALESCE(ex.valor_exames, 0) AS valor_exames, COALESCE(ex.glosa, 0) AS glosa,
           TRIM(fu.ds_funcionario) AS responsavel
    FROM fat
    JOIN lancamentos l ON l.cd_lancamento = fat.cd_lancamento
    LEFT JOIN ex ON ex.cd_lancamento = fat.cd_lancamento
    LEFT JOIN fornecedores fo ON fo.cd_fornecedor = l.cd_fornecedor
    LEFT JOIN funcionarios fu ON fu.cd_funcionario = COALESCE(l.cd_funcionario_lancamento, l.cd_funcionario)
    ORDER BY l.dt_emissao DESC, l.cd_lancamento DESC`
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    lotes: rows.map(r => ({
      cdLancamento: Number(r.cd_lancamento), numero: r.numero, documento: r.documento, cdConvenio: id(r.conv), convenio: r.convenio, competencia: r.competencia,
      cadastro: r.cadastro, emissao: r.emissao, vencimento: r.vencimento, valor: num(r.valor), recebido: num(r.recebido), ultimoRecebimento: r.ultimo_recebimento,
      situacao: (r.quitada ? 'recebida' : r.atrasada ? 'atrasada' : r.alguma ? 'parcial' : 'aguardando') as 'recebida' | 'atrasada' | 'parcial' | 'aguardando',
      exames: num(r.exames), guias: num(r.guias), valorExames: num(r.valor_exames), glosa: num(r.glosa), responsavel: r.responsavel,
    })),
    atualizadoEm: new Date().toISOString(),
  }
}

async function examesDoLote(cdLancamento: number) {
  const rows = await prisma.$queryRaw<Array<{ cd_exame: number; cd_atendimento: number; data: string; guia: string | null; procedimento: string | null; valor: number; glosa: number; motivo: string | null }>>`
    SELECT e.cd_exame, e.cd_atendimento, to_char(a.dt_data, 'YYYY-MM-DD') AS data, NULLIF(TRIM(e.ds_guia), '') AS guia, TRIM(pr.ds_procedimento) AS procedimento,
           COALESCE(e.nr_vl_convenio, 0) AS valor, COALESCE(e.nr_vl_glosa, 0) AS glosa, TRIM(g.ds_glosa) AS motivo
    FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
    LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
    LEFT JOIN tiss_glosas g ON g.cd_glosa = e.cd_glosa_tiss
    WHERE e.cd_lancamento = ${cdLancamento}
    ORDER BY e.ds_guia, a.dt_data LIMIT 5000`
  return rows.map(r => ({ cdExame: Number(r.cd_exame), cdAtendimento: Number(r.cd_atendimento), data: r.data, guia: r.guia, procedimento: r.procedimento, valor: num(r.valor), glosa: num(r.glosa), motivo: r.motivo }))
}

// ---------------- Glosas e recursos ----------------

async function glosas(f: Filtros) {
  // Base "envio" aqui = data da glosa (retorno); "realizacao" = data do exame.
  const periodo = f.base === 'envio'
    ? Prisma.sql`e.dt_glosa BETWEEN ${f.inicio}::date AND ${f.fim}::date`
    : Prisma.sql`a.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date`
  const w = Prisma.sql`${periodo} AND a.ds_status IS DISTINCT FROM 1
    ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
    ${f.modalidade ? Prisma.sql`AND COALESCE(pr.cd_modalidade, sl.cd_modalidade) = ${f.modalidade}` : Prisma.empty}
    ${f.procedimento ? Prisma.sql`AND e.cd_procedimento = ${f.procedimento}` : Prisma.empty}`
  const ehGlosa = Prisma.sql`(COALESCE(e.nr_vl_glosa, 0) > 0 OR e.cd_glosa_tiss IS NOT NULL OR e.sn_glosa IS TRUE)`
  const [lista, base, retorno, historico] = await Promise.all([
    // Exames glosados com motivo e recurso (registro de glosa do exame, quando houver).
    prisma.$queryRaw<Array<{
      cd_exame: number; cd_atendimento: number; data: string; dt_glosa: string | null; conv: number | null; modal: number | null; proc: number | null
      guia: string | null; lote: number | null; codigo: string | null; motivo: string | null; valor_exame: number; glosa: number
      dt_recurso: string | null; recorrido: number; recebido: number; dt_recebimento: string | null; aceite: boolean | null; justificativa: string | null; protocolo: string | null
    }>>`
      SELECT e.cd_exame, e.cd_atendimento, to_char(a.dt_data, 'YYYY-MM-DD') AS data, to_char(e.dt_glosa, 'YYYY-MM-DD') AS dt_glosa,
             pl.cd_fornecedor AS conv, COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS modal, e.cd_procedimento AS proc,
             NULLIF(TRIM(e.ds_guia), '') AS guia, f.cd_lancamento AS lote, TRIM(g.ds_codigo) AS codigo, COALESCE(TRIM(g.ds_glosa), NULLIF(TRIM(e.ds_glosa), '')) AS motivo,
             COALESCE(e.nr_vl_convenio, 0) AS valor_exame, COALESCE(e.nr_vl_glosa, 0) AS glosa,
             to_char(COALESCE(e.dt_recurso, eg.dt_recurso), 'YYYY-MM-DD') AS dt_recurso, COALESCE(eg.recorrido, 0) AS recorrido, COALESCE(eg.recebido, 0) AS recebido,
             to_char(eg.dt_recebimento, 'YYYY-MM-DD') AS dt_recebimento, e.sn_glosa_aceite AS aceite, NULLIF(TRIM(e.ds_glosa_justificativa), '') AS justificativa,
             COALESCE(NULLIF(TRIM(e.nr_glosa_protocolo), ''), NULLIF(TRIM(e.nr_glosa_lote), '')) AS protocolo
      FROM ${exames}
      LEFT JOIN tiss_glosas g ON g.cd_glosa = e.cd_glosa_tiss
      LEFT JOIN LATERAL (
        SELECT MAX(x.dt_recurso) AS dt_recurso, SUM(COALESCE(x.nr_recurso, 0)) AS recorrido, SUM(COALESCE(x.nr_recebimento, 0)) AS recebido, MAX(x.dt_recebimento) AS dt_recebimento
        FROM exames_glosas x WHERE x.cd_exame = e.cd_exame
      ) eg ON true
      WHERE ${w} AND ${ehGlosa}
      ORDER BY COALESCE(e.nr_vl_glosa, 0) DESC LIMIT 20000`,
    // Bases para as taxas: faturado e guias faturadas por convênio, modalidade e procedimento.
    prisma.$queryRaw<Array<{ conv: number | null; modal: number | null; proc: number | null; faturado: number; faturados: bigint; guias: bigint }>>`
      SELECT pl.cd_fornecedor AS conv, COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS modal, e.cd_procedimento AS proc,
             SUM(CASE WHEN f.cd_lancamento IS NOT NULL THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS faturado,
             COUNT(f.cd_lancamento) AS faturados, COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) FILTER (WHERE f.cd_lancamento IS NOT NULL) AS guias
      FROM ${exames} WHERE ${onde({ ...f, base: 'realizacao' })}
      GROUP BY 1, 2, 3`,
    // Glosas informadas nos retornos TISS importados (apresentado x glosado), por mês do retorno.
    prisma.$queryRaw<Array<{ mes: string; conv: number | null; apresentado: number; liberado: number; glosado: number; linhas: bigint; linhas_glosa: bigint }>>`
      SELECT to_char(r.dt_retorno, 'YYYY-MM') AS mes, r.cd_fornecedor AS conv, SUM(COALESCE(c.nr_procedimento_vi, 0)) AS apresentado,
             SUM(COALESCE(c.nr_procedimento_vl, 0)) AS liberado, SUM(COALESCE(c.nr_procedimento_vg, 0)) AS glosado,
             COUNT(*) AS linhas, COUNT(*) FILTER (WHERE c.sn_glosa OR COALESCE(c.nr_procedimento_vg, 0) > 0) AS linhas_glosa
      FROM tiss_retorno r JOIN tiss_contas c ON c.cd_retorno = r.cd_retorno
      WHERE r.dt_retorno >= ${f.inicio}::date - 365 AND r.dt_retorno < ${f.fim}::date + 1
      GROUP BY 1, 2`,
    // Histórico de 12 meses (para recorrência e aumento anormal): glosa por mês, motivo e convênio.
    prisma.$queryRaw<Array<{ mes: string; codigo: string | null; conv: number | null; glosa: number; exames: bigint }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, TRIM(g.ds_codigo) AS codigo, pl.cd_fornecedor AS conv,
             SUM(COALESCE(e.nr_vl_glosa, 0)) AS glosa, COUNT(*) AS exames
      FROM ${exames} LEFT JOIN tiss_glosas g ON g.cd_glosa = e.cd_glosa_tiss
      WHERE a.dt_data > ${f.fim}::date - 365 AND a.dt_data <= ${f.fim}::date AND a.ds_status IS DISTINCT FROM 1 AND ${ehGlosa}
        ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1, 2, 3`,
  ])
  const n = await nomes(
    unicos([...lista.map(x => x.conv), ...retorno.map(x => x.conv), ...historico.map(x => x.conv)]),
    unicos(lista.map(x => x.modal)), unicos(lista.map(x => x.proc)),
  )
  return {
    periodo: { inicio: f.inicio, fim: f.fim, base: f.base },
    exames: lista.map(r => ({
      cdExame: Number(r.cd_exame), cdAtendimento: Number(r.cd_atendimento), data: r.data, dataGlosa: r.dt_glosa, cdConvenio: id(r.conv), cdModalidade: id(r.modal), cdProcedimento: id(r.proc),
      guia: r.guia, lote: id(r.lote), codigo: r.codigo, motivo: r.motivo, valorExame: num(r.valor_exame), glosa: num(r.glosa),
      dataRecurso: r.dt_recurso, recorrido: num(r.recorrido), recebido: num(r.recebido), dataRecebimento: r.dt_recebimento, aceite: r.aceite === true, justificativa: r.justificativa, protocolo: r.protocolo,
    })),
    limite: 20000,
    base: base.map(r => ({ cdConvenio: id(r.conv), cdModalidade: id(r.modal), cdProcedimento: id(r.proc), faturado: num(r.faturado), faturados: num(r.faturados), guias: num(r.guias) })),
    retorno: retorno.map(r => ({ mes: r.mes, cdConvenio: id(r.conv), apresentado: num(r.apresentado), liberado: num(r.liberado), glosado: num(r.glosado), linhas: num(r.linhas), linhasGlosa: num(r.linhas_glosa) })),
    historico: historico.map(r => ({ mes: r.mes, codigo: r.codigo, cdConvenio: id(r.conv), glosa: num(r.glosa), exames: num(r.exames) })),
    nomes: n,
    atualizadoEm: new Date().toISOString(),
  }
}

export async function faturamentoAnalisesRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/faturamento/cruzado', async (request, reply) => {
    const p = filtros.safeParse(request.query)
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? 'Filtros inválidos.' })
    try { return await comCache(`c|${JSON.stringify({ ...p.data, atualizar: undefined })}`, Boolean(p.data.atualizar), () => cruzado(p.data)) }
    catch (err) { request.log.error({ err }, 'faturamento cruzado'); return reply.code(500).send({ error: erro(err) }) }
  })
  fastify.get('/clinux/faturamento/lotes', async (request, reply) => {
    const p = filtrosLotes.safeParse(request.query)
    if (!p.success) return reply.code(400).send({ error: 'Filtros inválidos.' })
    try { return await comCache(`l|${JSON.stringify({ ...p.data, atualizar: undefined })}`, Boolean(p.data.atualizar), () => lotes(p.data)) }
    catch (err) { request.log.error({ err }, 'faturamento lotes'); return reply.code(500).send({ error: erro(err) }) }
  })
  fastify.get('/clinux/faturamento/lotes/:id/exames', async (request, reply) => {
    const cd = Number((request.params as { id?: string }).id)
    if (!Number.isInteger(cd) || cd <= 0) return reply.code(400).send({ error: 'Lote inválido.' })
    try { return { exames: await examesDoLote(cd) } }
    catch (err) { request.log.error({ err }, 'exames do lote'); return reply.code(500).send({ error: erro(err) }) }
  })
  fastify.get('/clinux/faturamento/glosas', async (request, reply) => {
    const p = filtros.safeParse(request.query)
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? 'Filtros inválidos.' })
    try { return await comCache(`g|${JSON.stringify({ ...p.data, atualizar: undefined })}`, Boolean(p.data.atualizar), () => glosas(p.data)) }
    catch (err) { request.log.error({ err }, 'faturamento glosas'); return reply.code(500).send({ error: erro(err) }) }
  })
}
