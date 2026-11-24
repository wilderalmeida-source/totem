import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { parcelas, semAjuste } from '../lib/financeiro-sql'

// Fluxo de caixa: histórico (realizado x previsto), saldos por conta, projeção pelos títulos já lançados e base
// para estimar o que ainda não foi lançado (média dos últimos meses), previsto x realizado e confiabilidade.
// A tela classifica cada conta em operacional, investimento ou financiamento e monta cenários e simulações.

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({ inicio: dataIso, fim: dataIso, agrupar: z.enum(['dia', 'mes']).default('dia'), atualizar: z.string().optional() })
  .superRefine((f, ctx) => {
    if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
    const dias = (Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000
    if (f.agrupar === 'dia' && dias > 400) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Período diário máximo de 400 dias.' })
    if (dias > 366 * 5) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O período máximo é de 5 anos.' })
  })

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))

async function calcular(inicio: string, fim: string, agrupar: 'dia' | 'mes') {
  const unidade = Prisma.raw(agrupar === 'mes' ? "'month'" : "'day'")
  const [contas, bancos, historico, projecao, vencidos, base, previsao] = await Promise.all([
    prisma.$queryRaw<Array<{ cd_conta: number; conta: string | null; grupo: string | null; despesa: boolean | null; linha: string | null; variavel: boolean | null }>>`
      SELECT c.cd_conta, TRIM(c.ds_conta) AS conta, TRIM(g.ds_grupo) AS grupo, g.sn_despesa AS despesa, TRIM(r.ds_resultado) AS linha, c.sn_variavel AS variavel
      FROM contas c LEFT JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo LEFT JOIN contas_resultados r ON r.cd_resultado = c.cd_resultado`,

    prisma.$queryRaw<Array<{ cd_banco: number; banco: string; saldo: number | null; depois: number; periodo: number; entradas: number; saidas: number; transf: number }>>`
      WITH mov AS (
        SELECT p.cd_banco, p.dt_realizacao AS dia,
               CASE WHEN g.sn_despesa THEN -COALESCE(p.nr_realizado, 0) ELSE COALESCE(p.nr_realizado, 0) END AS v, false AS transf
        FROM ${parcelas}
        WHERE p.dt_realizacao IS NOT NULL AND p.cd_banco IS NOT NULL
        UNION ALL SELECT cd_banco_dst, COALESCE(dt_emissao, dt_lancamento)::date, COALESCE(nr_valor, 0), true FROM bancos_transfere
        UNION ALL SELECT cd_banco_src, COALESCE(dt_emissao, dt_lancamento)::date, -COALESCE(nr_valor, 0), true FROM bancos_transfere
      )
      SELECT b.cd_banco, TRIM(b.ds_banco) AS banco, b.nr_saldo AS saldo,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia > ${fim}::date), 0) AS depois,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date), 0) AS periodo,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND NOT m.transf AND m.v > 0), 0) AS entradas,
             COALESCE(-SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND NOT m.transf AND m.v < 0), 0) AS saidas,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND m.transf), 0) AS transf
      FROM bancos b LEFT JOIN mov m ON m.cd_banco = b.cd_banco
      WHERE b.sn_ativo IS TRUE
      GROUP BY 1, 2, 3`,

    // Histórico por período (dia ou mês) e conta: realizado (pagamento) e previsto (vencimento).
    prisma.$queryRaw<Array<{ periodo: string; cd_conta: number; realizado: number; previsto: number }>>`
      SELECT to_char(date_trunc(${unidade}, dia), 'YYYY-MM-DD') AS periodo, cd_conta, SUM(realizado) AS realizado, SUM(previsto) AS previsto FROM (
        SELECT p.dt_realizacao AS dia, l.cd_conta, COALESCE(p.nr_realizado, 0) AS realizado, 0 AS previsto
        FROM ${parcelas} WHERE p.dt_realizacao BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
        UNION ALL
        SELECT p.dt_vencimento, l.cd_conta, 0, COALESCE(p.nr_previsto, 0)
        FROM ${parcelas} WHERE p.dt_vencimento BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
      ) x GROUP BY 1, 2`,

    // Títulos já lançados a vencer nos próximos 12 meses (por dia, conta e tipo do título).
    prisma.$queryRaw<Array<{ dia: string; cd_conta: number; tipo: string | null; valor: number }>>`
      SELECT to_char(p.dt_vencimento, 'YYYY-MM-DD') AS dia, l.cd_conta, l.ds_tipo AS tipo, SUM(COALESCE(p.nr_previsto, 0)) AS valor
      FROM ${parcelas}
      WHERE p.dt_realizacao IS NULL AND p.dt_vencimento >= current_date AND p.dt_vencimento <= current_date + 366 AND ${semAjuste}
      GROUP BY 1, 2, 3`,

    // Em aberto e vencido há até 1 ano (pode entrar ou sair a qualquer momento).
    prisma.$queryRaw<Array<{ cd_conta: number; tipo: string | null; valor: number }>>`
      SELECT l.cd_conta, l.ds_tipo AS tipo, SUM(COALESCE(p.nr_previsto, 0)) AS valor
      FROM ${parcelas}
      WHERE p.dt_realizacao IS NULL AND p.dt_vencimento < current_date AND p.dt_vencimento >= current_date - 365 AND ${semAjuste}
      GROUP BY 1, 2`,

    // Realizado por mês e conta nos últimos 6 meses completos (base da estimativa do que ainda não foi lançado).
    prisma.$queryRaw<Array<{ mes: string; cd_conta: number; valor: number }>>`
      SELECT to_char(p.dt_realizacao, 'YYYY-MM') AS mes, l.cd_conta, SUM(COALESCE(p.nr_realizado, 0)) AS valor
      FROM ${parcelas}
      WHERE p.dt_realizacao >= date_trunc('month', current_date) - interval '6 months' AND p.dt_realizacao < date_trunc('month', current_date)
        AND ${semAjuste}
      GROUP BY 1, 2`,

    // Previsto x realizado nos últimos 12 meses completos. Previsto = parcelas com vencimento no mês já lançadas antes do
    // início do mês (o que se sabia ao abrir o mês); realizado = pago/recebido no mês.
    prisma.$queryRaw<Array<{ mes: string; despesa: boolean; previsto: number; realizado: number }>>`
      WITH meses AS (
        SELECT (date_trunc('month', current_date) - (n || ' month')::interval)::date AS ini FROM generate_series(1, 12) n
      )
      SELECT to_char(m.ini, 'YYYY-MM') AS mes, g.sn_despesa IS TRUE AS despesa,
             SUM(CASE WHEN p.dt_vencimento >= m.ini AND p.dt_vencimento < (m.ini + interval '1 month')
                       AND COALESCE(p.dt_cadastro::date, l.dt_emissao) < m.ini THEN COALESCE(p.nr_previsto, 0) ELSE 0 END) AS previsto,
             SUM(CASE WHEN p.dt_realizacao >= m.ini AND p.dt_realizacao < (m.ini + interval '1 month') THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS realizado
      FROM meses m
      JOIN pagamentos p ON (p.dt_vencimento >= m.ini AND p.dt_vencimento < (m.ini + interval '1 month'))
                        OR (p.dt_realizacao >= m.ini AND p.dt_realizacao < (m.ini + interval '1 month'))
      JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      JOIN contas c ON c.cd_conta = l.cd_conta
      JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
      WHERE ${semAjuste}
      GROUP BY 1, 2`,
  ])

  return {
    periodo: { inicio, fim, agrupar },
    hoje: new Date().toISOString().slice(0, 10),
    contas: contas.map(c => ({ cdConta: Number(c.cd_conta), conta: c.conta ?? `Conta ${c.cd_conta}`, grupo: c.grupo, despesa: c.despesa === true, linha: c.linha || null, variavel: c.variavel === true })),
    bancos: bancos.map(b => {
      const saldoFinal = num(b.saldo) - num(b.depois)
      return { cdBanco: Number(b.cd_banco), banco: b.banco, saldoAtual: num(b.saldo), saldoFinal, saldoInicial: saldoFinal - num(b.periodo), entradas: num(b.entradas), saidas: num(b.saidas), transferencias: num(b.transf) }
    }),
    historico: historico.map(h => ({ periodo: h.periodo, cdConta: Number(h.cd_conta), realizado: num(h.realizado), previsto: num(h.previsto) })),
    projecao: projecao.map(p => ({ dia: p.dia, cdConta: Number(p.cd_conta), tipo: p.tipo, valor: num(p.valor) })),
    vencidos: vencidos.map(v => ({ cdConta: Number(v.cd_conta), tipo: v.tipo, valor: num(v.valor) })),
    base: base.map(b => ({ mes: b.mes, cdConta: Number(b.cd_conta), valor: num(b.valor) })),
    previsao: previsao.map(p => ({ mes: p.mes, despesa: p.despesa, previsto: num(p.previsto), realizado: num(p.realizado) })),
    atualizadoEm: new Date().toISOString(),
  }
}

const cache = new Map<string, { expira: number; valor: unknown }>()

export async function fluxoCaixaRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/financeiro/fluxo', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, agrupar, atualizar } = parsed.data
    const chave = `${inicio}|${fim}|${agrupar}`
    const guardado = cache.get(chave)
    if (!atualizar && guardado && guardado.expira > Date.now()) return guardado.valor
    try {
      const valor = await calcular(inicio, fim, agrupar)
      cache.set(chave, { expira: Date.now() + 10 * 60_000, valor })
      while (cache.size > 12) cache.delete(cache.keys().next().value as string)
      return valor
    } catch (err) {
      request.log.error({ err }, 'fluxo de caixa')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar o fluxo de caixa: ${msg}` })
    }
  })
}
