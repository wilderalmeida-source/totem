import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'

// Dashboards de Faturamento (somente leitura: nada é corrigido, reenviado ou alterado no Clinux).
//   Produção     = exames do atendimento (sem cancelados): valor de convênio + particular.
//   Faturável    = parte de convênio (nr_vl_convenio). Particular é recebido no atendimento e não é faturado.
//   Faturado     = exame ligado a uma fatura de convênio (exames.cd_lancamento -> lancamentos tipo F).
//                  A data de envio é a emissão da fatura; o valor é o faturável do exame (o nr_ft do exame só é
//                  preenchido depois da conferência e fica zerado nos meses recentes).
//   Pendente     = exame de convênio ainda sem fatura.
//   Glosa        = exames.nr_vl_glosa (motivo TISS em cd_glosa_tiss).

export const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const filtros = z.object({
  inicio: dataIso, fim: dataIso,
  base: z.enum(['realizacao', 'envio']).default('realizacao'),
  convenio: z.coerce.number().int().positive().optional(),
  modalidade: z.coerce.number().int().positive().optional(),
  procedimento: z.coerce.number().int().positive().optional(),
  atualizar: z.string().optional(),
}).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 731) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O período máximo é de 2 anos.' })
})
export type Filtros = z.infer<typeof filtros>

// Exames com convênio, modalidade, procedimento e fatura (alias e, a, pl, pr, sl, f).
export const exames = Prisma.sql`
  exames e
  JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
  LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
  LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
  LEFT JOIN planos pl ON pl.cd_plano = e.cd_plano
  LEFT JOIN lancamentos f ON f.cd_lancamento = e.cd_lancamento AND f.ds_tipo = 'F'`

export function onde(f: Pick<Filtros, 'inicio' | 'fim' | 'base' | 'convenio' | 'modalidade' | 'procedimento'>) {
  const periodo = f.base === 'envio'
    ? Prisma.sql`f.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date`
    : Prisma.sql`a.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date`
  return Prisma.sql`${periodo} AND a.ds_status IS DISTINCT FROM 1
    ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
    ${f.modalidade ? Prisma.sql`AND COALESCE(pr.cd_modalidade, sl.cd_modalidade) = ${f.modalidade}` : Prisma.empty}
    ${f.procedimento ? Prisma.sql`AND e.cd_procedimento = ${f.procedimento}` : Prisma.empty}`
}

// Métricas comuns de um agrupamento de exames.
const metricas = Prisma.sql`
  COUNT(*) AS exames,
  SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS producao,
  SUM(COALESCE(e.nr_vl_convenio, 0)) AS faturavel,
  COUNT(*) FILTER (WHERE COALESCE(e.nr_vl_convenio, 0) > 0) AS exames_convenio,
  COUNT(*) FILTER (WHERE COALESCE(e.nr_vl_convenio, 0) = 0 AND COALESCE(e.nr_vl_particular, 0) > 0) AS exames_particular,
  COUNT(f.cd_lancamento) AS faturados,
  SUM(CASE WHEN f.cd_lancamento IS NOT NULL THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS faturado,
  SUM(CASE WHEN f.cd_lancamento IS NULL THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS pendente,
  COUNT(*) FILTER (WHERE f.cd_lancamento IS NULL AND COALESCE(e.nr_vl_convenio, 0) > 0) AS exames_pendentes,
  SUM(COALESCE(e.nr_vl_glosa, 0)) AS glosa,
  COUNT(*) FILTER (WHERE COALESCE(e.nr_vl_glosa, 0) > 0 OR e.cd_glosa_tiss IS NOT NULL) AS exames_glosados,
  COUNT(DISTINCT NULLIF(TRIM(e.ds_guia), '')) FILTER (WHERE f.cd_lancamento IS NOT NULL) AS guias_faturadas,
  COUNT(DISTINCT f.cd_lancamento) AS faturas,
  SUM(CASE WHEN f.cd_lancamento IS NOT NULL THEN f.dt_emissao - a.dt_data END) AS dias_ate_faturar`

type Metricas = { exames: bigint; producao: number; faturavel: number; exames_convenio: bigint; exames_particular: bigint; faturados: bigint; faturado: number; pendente: number; exames_pendentes: bigint; glosa: number; exames_glosados: bigint; guias_faturadas: bigint; faturas: bigint; dias_ate_faturar: bigint | number | null }
export const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
const metr = (r: Metricas | undefined) => ({
  exames: num(r?.exames), producao: num(r?.producao), faturavel: num(r?.faturavel), examesConvenio: num(r?.exames_convenio), examesParticular: num(r?.exames_particular),
  faturados: num(r?.faturados), faturado: num(r?.faturado), pendente: num(r?.pendente), examesPendentes: num(r?.exames_pendentes), glosa: num(r?.glosa),
  examesGlosados: num(r?.exames_glosados), guiasFaturadas: num(r?.guias_faturadas), faturas: num(r?.faturas), diasAteFaturar: num(r?.dias_ate_faturar),
})

function periodoAnterior(inicio: string, fim: string) {
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1
  const d = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
  return { inicio: d(inicio, -dias), fim: d(inicio, -1) }
}

async function resumo(f: Filtros) {
  const w = onde(f)
  const ant = periodoAnterior(f.inicio, f.fim)
  const fim24 = f.fim, ini24 = `${Number(f.fim.slice(0, 4)) - 2}-${f.fim.slice(5, 7)}-01`
  const [totais, anterior, dias, convenios, modalidades, procedimentos, semana, mensal, faturas] = await Promise.all([
    prisma.$queryRaw<Metricas[]>`SELECT ${metricas} FROM ${exames} WHERE ${w}`,
    prisma.$queryRaw<Metricas[]>`SELECT ${metricas} FROM ${exames} WHERE ${onde({ ...f, ...ant })}`,
    prisma.$queryRaw<Array<Metricas & { dia: string }>>`
      SELECT to_char(${f.base === 'envio' ? Prisma.sql`f.dt_emissao` : Prisma.sql`a.dt_data`}, 'YYYY-MM-DD') AS dia, ${metricas} FROM ${exames} WHERE ${w} GROUP BY 1`,
    prisma.$queryRaw<Array<Metricas & { id: number | null }>>`SELECT pl.cd_fornecedor AS id, ${metricas} FROM ${exames} WHERE ${w} GROUP BY 1`,
    prisma.$queryRaw<Array<Metricas & { id: number | null }>>`SELECT COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS id, ${metricas} FROM ${exames} WHERE ${w} GROUP BY 1`,
    prisma.$queryRaw<Array<Metricas & { id: number | null }>>`
      SELECT e.cd_procedimento AS id, ${metricas} FROM ${exames} WHERE ${w} GROUP BY 1
      ORDER BY SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) DESC LIMIT 400`,
    // Dia da semana (0 = domingo) e turno pela hora da ficha (ou do agendamento).
    prisma.$queryRaw<Array<{ dow: number; turno: string; exames: bigint; producao: number }>>`
      SELECT EXTRACT(DOW FROM a.dt_data)::int AS dow,
             CASE WHEN EXTRACT(HOUR FROM COALESCE(a.dt_hora_ficha, a.dt_hora)) < 12 THEN 'manha'
                  WHEN EXTRACT(HOUR FROM COALESCE(a.dt_hora_ficha, a.dt_hora)) < 18 THEN 'tarde' ELSE 'noite' END AS turno,
             COUNT(*) AS exames, SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS producao
      FROM ${exames} WHERE ${w} GROUP BY 1, 2`,
    // Evolução mensal (24 meses até o fim do período) pela data do exame, com os mesmos filtros.
    prisma.$queryRaw<Array<Metricas & { mes: string }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, ${metricas} FROM ${exames}
      WHERE ${onde({ ...f, base: 'realizacao', inicio: ini24, fim: fim24 })} GROUP BY 1`,
    // Faturas (lotes) emitidas no período: valor do título, recebido e exames ligados.
    prisma.$queryRaw<Array<{ cd_fornecedor: number | null; faturas: bigint; valor: number; recebido: number; aberto: number }>>`
      SELECT l.cd_fornecedor, COUNT(DISTINCT l.cd_lancamento) AS faturas, SUM(COALESCE(p.nr_previsto, 0)) AS valor,
             SUM(CASE WHEN p.dt_realizacao IS NOT NULL THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS recebido,
             SUM(CASE WHEN p.dt_realizacao IS NULL THEN COALESCE(p.nr_previsto, 0) ELSE 0 END) AS aberto
      FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
      WHERE l.ds_tipo = 'F' AND l.dt_emissao BETWEEN ${f.inicio}::date AND ${f.fim}::date
        ${f.convenio ? Prisma.sql`AND l.cd_fornecedor = ${f.convenio}` : Prisma.empty}
      GROUP BY 1`,
  ])

  const ids = (l: Array<{ id: number | null }>) => [...new Set(l.map(x => x.id).filter((x): x is number => x !== null).map(Number))]
  const idsConv = [...new Set([...ids(convenios), ...faturas.map(x => x.cd_fornecedor).filter((x): x is number => x !== null).map(Number)])]
  const [nConv, nMod, nProc] = await Promise.all([
    idsConv.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${idsConv}::int[])` : [],
    ids(modalidades).length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${ids(modalidades)}::int[])` : [],
    ids(procedimentos).length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${ids(procedimentos)}::int[])` : [],
  ])
  const mapa = (l: Array<{ id: number; nome: string | null }>) => Object.fromEntries(l.map(x => [Number(x.id), x.nome ?? `Código ${x.id}`]))
  const grupo = (l: Array<Metricas & { id: number | null }>) => l.map(r => ({ id: r.id === null ? null : Number(r.id), ...metr(r) }))

  return {
    periodo: { inicio: f.inicio, fim: f.fim, base: f.base }, anterior: { ...ant, ...metr(anterior[0]) },
    totais: metr(totais[0]),
    dias: dias.map(d => ({ dia: d.dia, ...metr(d) })),
    convenios: grupo(convenios), modalidades: grupo(modalidades), procedimentos: grupo(procedimentos),
    semana: semana.map(s => ({ dow: Number(s.dow), turno: s.turno, exames: num(s.exames), producao: num(s.producao) })),
    mensal: mensal.map(m => ({ mes: m.mes, ...metr(m) })),
    faturas: faturas.map(x => ({ cdFornecedor: x.cd_fornecedor === null ? null : Number(x.cd_fornecedor), faturas: num(x.faturas), valor: num(x.valor), recebido: num(x.recebido), aberto: num(x.aberto) })),
    nomes: { convenios: mapa(nConv), modalidades: mapa(nMod), procedimentos: mapa(nProc) },
    atualizadoEm: new Date().toISOString(),
  }
}

// ---------------- Produção pendente ----------------

const filtrosPend = z.object({
  inicio: dataIso, fim: dataIso,
  convenio: z.coerce.number().int().positive().optional(), modalidade: z.coerce.number().int().positive().optional(),
  procedimento: z.coerce.number().int().positive().optional(), atualizar: z.string().optional(),
})

async function pendencias(f: z.infer<typeof filtrosPend>) {
  const w = Prisma.sql`a.dt_data BETWEEN ${f.inicio}::date AND ${f.fim}::date AND a.ds_status IS DISTINCT FROM 1
    AND f.cd_lancamento IS NULL AND COALESCE(e.nr_vl_convenio, 0) > 0
    ${f.convenio ? Prisma.sql`AND pl.cd_fornecedor = ${f.convenio}` : Prisma.empty}
    ${f.modalidade ? Prisma.sql`AND COALESCE(pr.cd_modalidade, sl.cd_modalidade) = ${f.modalidade}` : Prisma.empty}
    ${f.procedimento ? Prisma.sql`AND e.cd_procedimento = ${f.procedimento}` : Prisma.empty}`
  const [lista, evolucao] = await Promise.all([
    // Exames de convênio sem fatura, com a pendência ativa (motivo) quando houver.
    prisma.$queryRaw<Array<{ cd_exame: number; cd_atendimento: number; data: string; cd_convenio: number | null; convenio: string | null; cd_modalidade: number | null; modalidade: string | null; cd_procedimento: number | null; procedimento: string | null; valor: number; dias: number; guia: string | null; autorizacao: string | null; validade: string | null; motivo: string | null; pendencia_desde: string | null; obs: string | null }>>`
      SELECT e.cd_exame, a.cd_atendimento, to_char(a.dt_data, 'YYYY-MM-DD') AS data,
             pl.cd_fornecedor AS cd_convenio, TRIM(fo.ds_fornecedor) AS convenio,
             COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS cd_modalidade, TRIM(m.ds_modalidade) AS modalidade,
             e.cd_procedimento, TRIM(pr.ds_procedimento) AS procedimento,
             COALESCE(e.nr_vl_convenio, 0) AS valor, (current_date - a.dt_data) AS dias,
             NULLIF(TRIM(e.ds_guia), '') AS guia, NULLIF(TRIM(e.ds_autorizacao), '') AS autorizacao, to_char(e.dt_senha, 'YYYY-MM-DD') AS validade,
             COALESCE(TRIM(pe.ds_pendencia), NULLIF(TRIM(e.ds_pendencia_motivo), ''), TRIM(pe2.ds_pendencia)) AS motivo,
             to_char(COALESCE(ep.dt_entrada, e.dt_pendencia_entrada), 'YYYY-MM-DD') AS pendencia_desde,
             NULLIF(TRIM(e.ds_pendencia_observacao), '') AS obs
      FROM ${exames}
      LEFT JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor
      LEFT JOIN modalidades m ON m.cd_modalidade = COALESCE(pr.cd_modalidade, sl.cd_modalidade)
      LEFT JOIN LATERAL (SELECT x.cd_pendencia, x.dt_entrada FROM exames_pendencias x WHERE x.cd_exame = e.cd_exame AND x.dt_saida IS NULL ORDER BY x.dt_entrada DESC LIMIT 1) ep ON true
      LEFT JOIN pendencias pe ON pe.cd_pendencia = ep.cd_pendencia
      LEFT JOIN pendencias pe2 ON pe2.cd_pendencia = e.cd_pendencia
      WHERE ${w}
      ORDER BY a.dt_data, e.cd_exame
      LIMIT 20000`,
    // Evolução: produção de convênio ainda sem fatura no fim de cada um dos últimos 12 meses (exames de até 1 ano).
    prisma.$queryRaw<Array<{ mes: string; exames: bigint; valor: number }>>`
      WITH meses AS (
        SELECT (date_trunc('month', current_date) - (n || ' month')::interval + interval '1 month - 1 day')::date AS fim_mes FROM generate_series(0, 11) n
      )
      SELECT to_char(m.fim_mes, 'YYYY-MM') AS mes, COUNT(*) AS exames, SUM(COALESCE(e.nr_vl_convenio, 0)) AS valor
      FROM meses m
      JOIN atendimentos a ON a.dt_data <= m.fim_mes AND a.dt_data > m.fim_mes - 365 AND a.ds_status IS DISTINCT FROM 1
      JOIN exames e ON e.cd_atendimento = a.cd_atendimento AND COALESCE(e.nr_vl_convenio, 0) > 0
      LEFT JOIN lancamentos f ON f.cd_lancamento = e.cd_lancamento AND f.ds_tipo = 'F'
      WHERE f.cd_lancamento IS NULL OR f.dt_emissao > m.fim_mes
      GROUP BY 1`,
  ])
  return {
    periodo: { inicio: f.inicio, fim: f.fim },
    exames: lista.map(r => ({
      cdExame: Number(r.cd_exame), cdAtendimento: Number(r.cd_atendimento), data: r.data,
      cdConvenio: r.cd_convenio === null ? null : Number(r.cd_convenio), convenio: r.convenio, cdModalidade: r.cd_modalidade === null ? null : Number(r.cd_modalidade), modalidade: r.modalidade,
      cdProcedimento: r.cd_procedimento === null ? null : Number(r.cd_procedimento), procedimento: r.procedimento, valor: num(r.valor), dias: num(r.dias),
      guia: r.guia, autorizacao: r.autorizacao, validade: r.validade, motivo: r.motivo, pendenciaDesde: r.pendencia_desde, observacao: r.obs,
    })),
    limite: 20000,
    evolucao: evolucao.map(x => ({ mes: x.mes, exames: num(x.exames), valor: num(x.valor) })),
    atualizadoEm: new Date().toISOString(),
  }
}

// Listas para os filtros (convênios, modalidades e procedimentos com exame no último ano).
async function opcoes() {
  const [conv, mod, proc] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      SELECT DISTINCT fo.cd_fornecedor AS id, TRIM(fo.ds_fornecedor) AS nome FROM planos pl JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor ORDER BY 2`,
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades ORDER BY 2`,
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      SELECT pr.cd_procedimento AS id, TRIM(pr.ds_procedimento) AS nome FROM procedimentos pr
      WHERE EXISTS (SELECT 1 FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento WHERE e.cd_procedimento = pr.cd_procedimento AND a.dt_data >= current_date - 365)
      ORDER BY 2`,
  ])
  const l = (x: Array<{ id: number; nome: string | null }>) => x.map(i => ({ id: Number(i.id), nome: i.nome ?? `Código ${i.id}` }))
  return { convenios: l(conv), modalidades: l(mod), procedimentos: l(proc) }
}

const cache = new Map<string, { expira: number; valor: unknown }>()
export async function comCache<T>(chave: string, atualizar: boolean, calc: () => Promise<T>) {
  const g = cache.get(chave)
  if (!atualizar && g && g.expira > Date.now()) return g.valor as T
  const valor = await calc()
  cache.delete(chave)
  cache.set(chave, { expira: Date.now() + 10 * 60_000, valor })
  while (cache.size > 30) cache.delete(cache.keys().next().value as string)
  return valor
}
export const erro = (err: unknown) => `Erro ao consultar o faturamento: ${err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)}`

export async function faturamentoRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/faturamento/resumo', async (request, reply) => {
    const p = filtros.safeParse(request.query)
    if (!p.success) return reply.code(400).send({ error: p.error.issues[0]?.message ?? 'Filtros inválidos.' })
    try { return await comCache(`r|${JSON.stringify({ ...p.data, atualizar: undefined })}`, Boolean(p.data.atualizar), () => resumo(p.data)) }
    catch (err) { request.log.error({ err }, 'faturamento resumo'); return reply.code(500).send({ error: erro(err) }) }
  })
  fastify.get('/clinux/faturamento/pendencias', async (request, reply) => {
    const p = filtrosPend.safeParse(request.query)
    if (!p.success) return reply.code(400).send({ error: 'Filtros inválidos.' })
    try { return await comCache(`p|${JSON.stringify({ ...p.data, atualizar: undefined })}`, Boolean(p.data.atualizar), () => pendencias(p.data)) }
    catch (err) { request.log.error({ err }, 'faturamento pendências'); return reply.code(500).send({ error: erro(err) }) }
  })
  fastify.get('/clinux/faturamento/opcoes', async () => comCache('opcoes', false, opcoes))
}
