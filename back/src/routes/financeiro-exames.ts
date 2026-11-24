import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { exames, num, onde } from './faturamento'

// Financeiro · Exames e auditoria (somente leitura).
//   Valor do exame = convênio + particular (exames.nr_vl_convenio + nr_vl_particular), exames de atendimentos não
//   cancelados realizados no período, como na produção do Faturamento.
//   Ticket médio por modalidade = valor dos exames da modalidade ÷ atendimentos com exame dela (e também por exame).
//   Valores fora do padrão: cada exame é comparado com os exames do MESMO procedimento no MESMO convênio no período
//   (preço de tabela diferente entre convênios não é erro). Com ao menos MINIMO_GRUPO exames no grupo, fica fora do
//   padrão o valor abaixo de Q1 − k·IQR ou acima de Q3 + k·IQR (regra de Tukey: não é distorcida pelos próprios
//   valores errados, como a média e o desvio padrão são) e que difere da mediana em pelo menos 5% (mínimo R$ 1),
//   para centavos de arredondamento não virarem alerta. Média, desvio padrão e quantos desvios o valor está da média
//   vão junto, para quem for auditar.

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({
  inicio: dataIso, fim: dataIso,
  rigor: z.enum(['normal', 'extremo']).default('normal'),
  atualizar: z.string().optional(),
}).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 366) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O período máximo é de 1 ano.' })
})

export const MINIMO_GRUPO = 5
export const LIMITE_LISTA = 1000
const K = { normal: 1.5, extremo: 3 } as const

const valor = Prisma.sql`(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0))`
const modalidade = Prisma.sql`COALESCE(pr.cd_modalidade, sl.cd_modalidade)`

function periodoAnterior(inicio: string, fim: string) {
  const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1
  const d = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
  return { inicio: d(inicio, -dias), fim: d(inicio, -1) }
}

type LinhaTicket = { id: number | null; exames: bigint; atendimentos: bigint; valor: number; convenio: number; particular: number; atend_convenio: bigint; atend_particular: bigint; mediana: number | null }
type LinhaFora = {
  cd_exame: number; cd_atendimento: number; cd_paciente: number | null; data: string; cd_procedimento: number | null; cd_modalidade: number | null
  cd_fornecedor: number | null; valor: number; convenio: number; particular: number; n: bigint; media: number; desvio: number | null; q1: number; mediana: number; q3: number; total: bigint; impacto: number
}

async function calcular(inicio: string, fim: string, rigor: keyof typeof K) {
  const w = onde({ inicio, fim, base: 'realizacao' })
  const ant = periodoAnterior(inicio, fim)
  const k = K[rigor]
  const [ticket, anterior, fora, grupos] = await Promise.all([
    prisma.$queryRaw<LinhaTicket[]>`
      SELECT ${modalidade} AS id, COUNT(*) AS exames, COUNT(DISTINCT e.cd_atendimento) AS atendimentos,
             SUM(${valor}) AS valor, SUM(COALESCE(e.nr_vl_convenio, 0)) AS convenio, SUM(COALESCE(e.nr_vl_particular, 0)) AS particular,
             COUNT(DISTINCT e.cd_atendimento) FILTER (WHERE COALESCE(e.nr_vl_convenio, 0) > 0) AS atend_convenio,
             COUNT(DISTINCT e.cd_atendimento) FILTER (WHERE COALESCE(e.nr_vl_particular, 0) > 0) AS atend_particular,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY ${valor}) AS mediana
      FROM ${exames} WHERE ${w} GROUP BY 1`,
    prisma.$queryRaw<Array<{ id: number | null; atendimentos: bigint; valor: number }>>`
      SELECT ${modalidade} AS id, COUNT(DISTINCT e.cd_atendimento) AS atendimentos, SUM(${valor}) AS valor
      FROM ${exames} WHERE ${onde({ ...ant, base: 'realizacao' })} GROUP BY 1`,
    prisma.$queryRaw<LinhaFora[]>`
      WITH base AS (
        SELECT e.cd_exame, e.cd_atendimento, a.cd_paciente, a.dt_data, e.cd_procedimento, ${modalidade} AS cd_modalidade,
               pl.cd_fornecedor, ${valor} AS valor, COALESCE(e.nr_vl_convenio, 0) AS convenio, COALESCE(e.nr_vl_particular, 0) AS particular
        FROM ${exames} WHERE ${w} AND e.cd_procedimento IS NOT NULL
      ), est AS (
        SELECT cd_procedimento, cd_fornecedor, COUNT(*) AS n, AVG(valor) AS media, STDDEV_SAMP(valor) AS desvio,
               percentile_cont(0.25) WITHIN GROUP (ORDER BY valor) AS q1,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY valor) AS mediana,
               percentile_cont(0.75) WITHIN GROUP (ORDER BY valor) AS q3
        FROM base GROUP BY 1, 2 HAVING COUNT(*) >= ${MINIMO_GRUPO}
      ), fora AS (
        SELECT b.*, s.n, s.media, s.desvio, s.q1, s.mediana, s.q3
        FROM base b
        JOIN est s ON s.cd_procedimento = b.cd_procedimento AND s.cd_fornecedor IS NOT DISTINCT FROM b.cd_fornecedor
        WHERE (b.valor < s.q1 - ${k}::float8 * (s.q3 - s.q1) OR b.valor > s.q3 + ${k}::float8 * (s.q3 - s.q1))
          AND ABS(b.valor - s.mediana) >= GREATEST(1, ABS(s.mediana) * 0.05)
      )
      SELECT cd_exame, cd_atendimento, cd_paciente, to_char(dt_data, 'YYYY-MM-DD') AS data, cd_procedimento, cd_modalidade, cd_fornecedor,
             valor, convenio, particular, n, media, desvio, q1, mediana, q3,
             COUNT(*) OVER () AS total, SUM(valor - mediana) OVER () AS impacto
      FROM fora ORDER BY ABS(valor - mediana) DESC, cd_exame LIMIT ${LIMITE_LISTA}`,
    // Quantos grupos (procedimento × convênio) tiveram exames suficientes para a comparação.
    prisma.$queryRaw<Array<{ grupos: bigint; exames: bigint }>>`
      SELECT COUNT(*) AS grupos, COALESCE(SUM(n), 0) AS exames FROM (
        SELECT COUNT(*) AS n FROM ${exames} WHERE ${w} AND e.cd_procedimento IS NOT NULL
        GROUP BY e.cd_procedimento, pl.cd_fornecedor HAVING COUNT(*) >= ${MINIMO_GRUPO}
      ) g`,
  ])

  const unicos = (l: Array<number | null>) => [...new Set(l.filter((x): x is number => x !== null && x !== undefined).map(Number))]
  const idsMod = unicos([...ticket.map(t => t.id), ...fora.map(f => f.cd_modalidade)])
  const idsProc = unicos(fora.map(f => f.cd_procedimento))
  const idsConv = unicos(fora.map(f => f.cd_fornecedor))
  const idsPac = unicos(fora.map(f => f.cd_paciente))
  const nomes = async (sql: Prisma.Sql | null) => sql ? Object.fromEntries((await prisma.$queryRaw<Array<{ id: number; nome: string | null }>>(sql)).map(x => [Number(x.id), x.nome ?? `Código ${x.id}`])) : {}
  const [nMod, nProc, nConv, nPac] = await Promise.all([
    nomes(idsMod.length ? Prisma.sql`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${idsMod}::int[])` : null),
    nomes(idsProc.length ? Prisma.sql`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${idsProc}::int[])` : null),
    nomes(idsConv.length ? Prisma.sql`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${idsConv}::int[])` : null),
    nomes(idsPac.length ? Prisma.sql`SELECT cd_paciente AS id, TRIM(ds_paciente) AS nome FROM pacientes WHERE cd_paciente = ANY(${idsPac}::int[])` : null),
  ])

  const antPorId = new Map(anterior.map(a => [a.id === null ? null : Number(a.id), a]))
  return {
    periodo: { inicio, fim }, anterior: ant, rigor, minimoGrupo: MINIMO_GRUPO,
    ticket: ticket.map(t => {
      const id = t.id === null ? null : Number(t.id)
      const a = antPorId.get(id)
      return {
        cdModalidade: id, exames: num(t.exames), atendimentos: num(t.atendimentos), valor: num(t.valor), convenio: num(t.convenio), particular: num(t.particular),
        atendConvenio: num(t.atend_convenio), atendParticular: num(t.atend_particular), medianaExame: num(t.mediana),
        anterior: a ? { atendimentos: num(a.atendimentos), valor: num(a.valor) } : null,
      }
    }),
    foraDoPadrao: {
      total: num(fora[0]?.total), impacto: num(fora[0]?.impacto), limite: LIMITE_LISTA,
      gruposAnalisados: num(grupos[0]?.grupos), examesAnalisados: num(grupos[0]?.exames),
      itens: fora.map(f => ({
        cdExame: Number(f.cd_exame), cdAtendimento: Number(f.cd_atendimento), cdPaciente: f.cd_paciente === null ? null : Number(f.cd_paciente), data: f.data,
        cdProcedimento: f.cd_procedimento === null ? null : Number(f.cd_procedimento), cdModalidade: f.cd_modalidade === null ? null : Number(f.cd_modalidade),
        cdConvenio: f.cd_fornecedor === null ? null : Number(f.cd_fornecedor),
        valor: num(f.valor), convenio: num(f.convenio), particular: num(f.particular),
        grupo: { exames: num(f.n), media: num(f.media), desvio: f.desvio === null ? null : num(f.desvio), q1: num(f.q1), mediana: num(f.mediana), q3: num(f.q3) },
      })),
    },
    nomes: { modalidades: nMod, procedimentos: nProc, convenios: nConv, pacientes: nPac },
    atualizadoEm: new Date().toISOString(),
  }
}

const cache = new Map<string, { expira: number; valor: unknown }>()
const MAX_CACHE = 12

export async function financeiroExamesRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/financeiro/exames', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, rigor, atualizar } = parsed.data
    const chave = `${inicio}|${fim}|${rigor}`
    const guardado = cache.get(chave)
    if (!atualizar && guardado && guardado.expira > Date.now()) return guardado.valor
    try {
      const valor = await calcular(inicio, fim, rigor)
      cache.delete(chave)
      cache.set(chave, { expira: Date.now() + 10 * 60_000, valor })
      while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
      return valor
    } catch (err) {
      request.log.error({ err }, 'financeiro exames')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar os exames: ${msg}` })
    }
  })
}
