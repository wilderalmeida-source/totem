import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { competencia, parcelas, semAjuste } from '../lib/financeiro-sql'

// Dashboard Financeiro (visão geral + contas a receber), a partir do financeiro do Clinux.
//   Títulos (lancamentos.ds_tipo): U = recebimento do paciente no atendimento (particular/coparticipação),
//   F = fatura de convênio, L = lançamento avulso (receita ou despesa), C = compra de material.
//   Receita x despesa: grupo da conta (contas_grupos.sn_despesa). A conta "AJUSTE DE SALDO" fica fora.
//   Saldos: o saldo cadastrado do banco (bancos.nr_saldo) é a soma de todos os movimentos (parcelas realizadas com
//   banco + transferências). Saldo final do período = saldo atual - movimentos depois do fim; saldo inicial =
//   saldo final - movimentos do período.
//   Competência do título: mês/ano do título; sem eles, a competência escrita no histórico ("COMPETENCIA JUNHO 2026",
//   "COMPETENCIA 02/2026"); sem ela, o mês de emissão.
//   Recebimento a menor por taxa de cartão (lancamentos_formas.nr_taxa) não conta como recebimento parcial.

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({ inicio: dataIso, fim: dataIso, atualizar: z.string().optional() }).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 366) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O período máximo é de 1 ano.' })
})

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
const id = (v: unknown) => (v === null || v === undefined ? null : Number(v))

// Faixa de vencimento em relação a hoje.
const faixa = Prisma.sql`CASE
  WHEN p.dt_vencimento < current_date - 180 THEN 'v181'
  WHEN p.dt_vencimento < current_date - 90 THEN 'v91'
  WHEN p.dt_vencimento < current_date - 60 THEN 'v61'
  WHEN p.dt_vencimento < current_date - 30 THEN 'v31'
  WHEN p.dt_vencimento < current_date - 15 THEN 'v16'
  WHEN p.dt_vencimento < current_date THEN 'v1'
  WHEN p.dt_vencimento <= current_date + 30 THEN 'a30'
  WHEN p.dt_vencimento <= current_date + 60 THEN 'a60'
  WHEN p.dt_vencimento <= current_date + 90 THEN 'a90'
  ELSE 'a91' END`

async function calcular(inicio: string, fim: string) {
  const [contas, bancos, fluxo, fin, abertos, recebidos, atrasos, receita90, conciliacao, pagarAbertos, pagos, recorrentes] = await Promise.all([
    prisma.$queryRaw<Array<{ cd_conta: number; conta: string | null; grupo: string | null; despesa: boolean | null; linha: string | null; variavel: boolean | null }>>`
      SELECT c.cd_conta, TRIM(c.ds_conta) AS conta, TRIM(g.ds_grupo) AS grupo, g.sn_despesa AS despesa,
             TRIM(r.ds_resultado) AS linha, c.sn_variavel AS variavel
      FROM contas c
      LEFT JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
      LEFT JOIN contas_resultados r ON r.cd_resultado = c.cd_resultado`,

    // Saldo de cada banco no início e no fim do período, entradas, saídas e transferências do período.
    prisma.$queryRaw<Array<{ cd_banco: number; banco: string; saldo: number | null; depois: number; periodo: number; entradas: number; saidas: number; transf_entrada: number; transf_saida: number }>>`
      WITH mov AS (
        SELECT p.cd_banco, p.dt_realizacao AS dia,
               CASE WHEN g.sn_despesa THEN -COALESCE(p.nr_realizado, 0) ELSE COALESCE(p.nr_realizado, 0) END AS v, false AS transf
        FROM ${parcelas}
        WHERE p.dt_realizacao IS NOT NULL AND p.cd_banco IS NOT NULL
        UNION ALL
        SELECT cd_banco_dst, COALESCE(dt_emissao, dt_lancamento)::date, COALESCE(nr_valor, 0), true FROM bancos_transfere
        UNION ALL
        SELECT cd_banco_src, COALESCE(dt_emissao, dt_lancamento)::date, -COALESCE(nr_valor, 0), true FROM bancos_transfere
      )
      SELECT b.cd_banco, TRIM(b.ds_banco) AS banco, b.nr_saldo AS saldo,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia > ${fim}::date), 0) AS depois,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date), 0) AS periodo,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND NOT m.transf AND m.v > 0), 0) AS entradas,
             COALESCE(-SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND NOT m.transf AND m.v < 0), 0) AS saidas,
             COALESCE(SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND m.transf AND m.v > 0), 0) AS transf_entrada,
             COALESCE(-SUM(m.v) FILTER (WHERE m.dia BETWEEN ${inicio}::date AND ${fim}::date AND m.transf AND m.v < 0), 0) AS transf_saida
      FROM bancos b LEFT JOIN mov m ON m.cd_banco = b.cd_banco
      WHERE b.sn_ativo IS TRUE
      GROUP BY 1, 2, 3 ORDER BY 2`,

    // Entradas e saídas por dia: realizadas (data do pagamento) e previstas (vencimento), sem transferências.
    prisma.$queryRaw<Array<{ dia: string; tipo: string; realizado: number; previsto: number }>>`
      SELECT to_char(dia, 'YYYY-MM-DD') AS dia, tipo, SUM(realizado) AS realizado, SUM(previsto) AS previsto FROM (
        SELECT p.dt_realizacao AS dia, CASE WHEN g.sn_despesa THEN 'saida' ELSE 'entrada' END AS tipo, COALESCE(p.nr_realizado, 0) AS realizado, 0 AS previsto
        FROM ${parcelas}
        WHERE p.dt_realizacao BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
        UNION ALL
        SELECT p.dt_vencimento, CASE WHEN g.sn_despesa THEN 'saida' ELSE 'entrada' END, 0, COALESCE(p.nr_previsto, 0)
        FROM ${parcelas}
        WHERE p.dt_vencimento BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
      ) x GROUP BY 1, 2`,

    // Valores por conta e mês: competência do título (valor previsto) e caixa (realizado).
    prisma.$queryRaw<Array<{ regime: string; mes: string; cd_conta: number; valor: number }>>`
      SELECT 'competencia' AS regime, to_char(${competencia}, 'YYYY-MM') AS mes, l.cd_conta, SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0)) AS valor
      FROM ${parcelas}
      WHERE ${competencia} BETWEEN date_trunc('month', ${inicio}::date) AND ${fim}::date
        AND l.dt_emissao >= ${inicio}::date - 400
      GROUP BY 2, 3
      UNION ALL
      SELECT 'caixa', to_char(p.dt_realizacao, 'YYYY-MM'), l.cd_conta, SUM(COALESCE(p.nr_realizado, 0))
      FROM ${parcelas}
      WHERE p.dt_realizacao BETWEEN ${inicio}::date AND ${fim}::date
      GROUP BY 2, 3`,

    // Parcelas em aberto (receber e pagar), por faixa de vencimento, convênio/fornecedor, mês de vencimento e competência.
    prisma.$queryRaw<Array<{ receita: boolean; tipo: string | null; cd_conta: number; cd_fornecedor: number | null; faixa: string; mes_venc: string; mes_comp: string; valor: number; parcelas: bigint }>>`
      SELECT g.sn_despesa IS NOT TRUE AS receita, l.ds_tipo AS tipo, l.cd_conta,
             CASE WHEN l.ds_tipo = 'U' THEN NULL ELSE l.cd_fornecedor END AS cd_fornecedor,
             ${faixa} AS faixa, to_char(p.dt_vencimento, 'YYYY-MM') AS mes_venc, to_char(${competencia}, 'YYYY-MM') AS mes_comp,
             SUM(COALESCE(p.nr_previsto, 0)) AS valor, COUNT(*) AS parcelas
      FROM ${parcelas}
      WHERE p.dt_realizacao IS NULL AND p.dt_vencimento IS NOT NULL AND COALESCE(p.nr_previsto, 0) <> 0 AND ${semAjuste}
      GROUP BY 1, 2, 3, 4, 5, 6, 7`,

    // Recebimentos do período: no prazo, depois do vencimento (recuperação), antecipados, parciais, prazos.
    prisma.$queryRaw<Array<{ tipo: string | null; cd_fornecedor: number | null; parcelas: bigint; recebido: number; previsto: number; no_prazo: number; atrasado: number; antecipado: number; parciais: bigint; parcial_valor: number; perda: number; dias_emissao: number; dias_atraso: number }>>`
      SELECT l.ds_tipo AS tipo, CASE WHEN l.ds_tipo = 'U' THEN NULL ELSE l.cd_fornecedor END AS cd_fornecedor,
             COUNT(*) AS parcelas,
             SUM(COALESCE(p.nr_realizado, 0)) AS recebido,
             SUM(COALESCE(p.nr_previsto, 0)) AS previsto,
             SUM(CASE WHEN p.dt_realizacao <= p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS no_prazo,
             SUM(CASE WHEN p.dt_realizacao > p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS atrasado,
             SUM(CASE WHEN p.dt_realizacao < p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) ELSE 0 END) AS antecipado,
             COUNT(*) FILTER (WHERE COALESCE(p.nr_realizado, 0) < COALESCE(p.nr_previsto, 0) * (1 - COALESCE(fo.nr_taxa, 0) / 100.0) - 0.05) AS parciais,
             SUM(CASE WHEN COALESCE(p.nr_realizado, 0) < COALESCE(p.nr_previsto, 0) * (1 - COALESCE(fo.nr_taxa, 0) / 100.0) - 0.05
                      THEN COALESCE(p.nr_previsto, 0) - COALESCE(p.nr_realizado, 0) ELSE 0 END) AS parcial_valor,
             SUM(COALESCE(p.nr_perda, 0)) AS perda,
             SUM((p.dt_realizacao - l.dt_emissao) * COALESCE(p.nr_realizado, 0)) AS dias_emissao,
             SUM(GREATEST(p.dt_realizacao - p.dt_vencimento, 0) * COALESCE(p.nr_realizado, 0)) AS dias_atraso
      FROM ${parcelas}
      LEFT JOIN lancamentos_formas fo ON fo.cd_forma = p.cd_forma
      WHERE g.sn_despesa IS NOT TRUE AND p.dt_realizacao BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
      GROUP BY 1, 2`,

    // Evolução dos atrasos: a receber vencido (até 1 ano) no fim de cada um dos últimos 12 meses.
    prisma.$queryRaw<Array<{ mes: string; tipo: string | null; valor: number }>>`
      WITH meses AS (
        SELECT (date_trunc('month', ${fim}::date) - (n || ' month')::interval + interval '1 month - 1 day')::date AS fim_mes
        FROM generate_series(0, 11) n
      )
      SELECT to_char(m.fim_mes, 'YYYY-MM') AS mes, l.ds_tipo AS tipo, SUM(COALESCE(p.nr_previsto, 0)) AS valor
      FROM meses m
      JOIN pagamentos p ON p.dt_vencimento < m.fim_mes AND p.dt_vencimento >= m.fim_mes - 365
                       AND (p.dt_realizacao IS NULL OR p.dt_realizacao > m.fim_mes)
      JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      JOIN contas c ON c.cd_conta = l.cd_conta
      JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
      WHERE g.sn_despesa IS NOT TRUE AND ${semAjuste}
      GROUP BY 1, 2`,

    // Receita emitida nos últimos 90 dias (base do DSO).
    prisma.$queryRaw<Array<{ valor: number }>>`
      SELECT SUM(COALESCE(p.nr_previsto, 0)) AS valor FROM ${parcelas}
      WHERE g.sn_despesa IS NOT TRUE AND l.dt_emissao > current_date - 90 AND l.dt_emissao <= current_date AND ${semAjuste}`,

    // Recebimentos dos últimos 90 dias ainda não conciliados com o extrato.
    prisma.$queryRaw<Array<{ parcelas: bigint; valor: number }>>`
      SELECT COUNT(*) AS parcelas, SUM(COALESCE(p.nr_realizado, 0)) AS valor FROM ${parcelas}
      WHERE g.sn_despesa IS NOT TRUE AND p.dt_realizacao > current_date - 90 AND p.dt_conciliacao IS NULL AND ${semAjuste}`,
    // ---- Contas a pagar ----
    // Em aberto por fornecedor, conta, centro de custo e prazo (vencido, até 7, 15, 30, 60, 90 dias, depois).
    prisma.$queryRaw<Array<{ cd_fornecedor: number | null; cd_conta: number; cd_centro: number | null; prazo: string; valor: number; parcelas: bigint }>>`
      SELECT l.cd_fornecedor, l.cd_conta, l.cd_centro,
        CASE
          WHEN p.dt_vencimento < current_date THEN 'vencido'
          WHEN p.dt_vencimento <= current_date + 7 THEN 'd7'
          WHEN p.dt_vencimento <= current_date + 15 THEN 'd15'
          WHEN p.dt_vencimento <= current_date + 30 THEN 'd30'
          WHEN p.dt_vencimento <= current_date + 60 THEN 'd60'
          WHEN p.dt_vencimento <= current_date + 90 THEN 'd90'
          ELSE 'd91' END AS prazo,
        SUM(COALESCE(p.nr_previsto, 0)) AS valor, COUNT(*) AS parcelas
      FROM ${parcelas}
      WHERE g.sn_despesa IS TRUE AND p.dt_realizacao IS NULL AND p.dt_vencimento IS NOT NULL
        AND COALESCE(p.nr_previsto, 0) <> 0 AND ${semAjuste}
      GROUP BY 1, 2, 3, 4`,

    // Pagos no período por fornecedor, conta, centro (rateio do título) e forma de pagamento.
    prisma.$queryRaw<Array<{ cd_fornecedor: number | null; cd_conta: number; cd_centro: number | null; forma: string | null; parcelas: number; pago: number; previsto: number; juros: number; multa: number; desconto: number; antecipado: number; atrasado: number; no_prazo: number; dias_prazo: number; dias_atraso: number; vencido_antes: number }>>`
      WITH rt AS (SELECT cd_lancamento, cd_centro, COALESCE(NULLIF(nr_valor, 0), nr_rateio, 0) AS peso FROM lancamentos_rateios),
           tot AS (SELECT cd_lancamento, SUM(peso) AS total FROM rt GROUP BY 1)
      SELECT l.cd_fornecedor, l.cd_conta, COALESCE(rt.cd_centro, l.cd_centro) AS cd_centro, TRIM(fo.ds_forma) AS forma,
        SUM(w.f) AS parcelas,
        SUM(COALESCE(p.nr_realizado, 0) * w.f) AS pago,
        SUM(COALESCE(p.nr_previsto, 0) * w.f) AS previsto,
        SUM(COALESCE(p.nr_juro, 0) * w.f) AS juros,
        SUM(COALESCE(p.nr_mora, 0) * w.f) AS multa,
        SUM(COALESCE(p.nr_desconto, 0) * w.f) AS desconto,
        SUM(CASE WHEN p.dt_realizacao < p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) * w.f ELSE 0 END) AS antecipado,
        SUM(CASE WHEN p.dt_realizacao > p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) * w.f ELSE 0 END) AS atrasado,
        SUM(CASE WHEN p.dt_realizacao <= p.dt_vencimento THEN COALESCE(p.nr_realizado, 0) * w.f ELSE 0 END) AS no_prazo,
        SUM(GREATEST(p.dt_realizacao - l.dt_emissao, 0) * COALESCE(p.nr_realizado, 0) * w.f) AS dias_prazo,
        SUM(GREATEST(p.dt_realizacao - p.dt_vencimento, 0) * COALESCE(p.nr_realizado, 0) * w.f) AS dias_atraso,
        SUM(CASE WHEN p.dt_vencimento < ${inicio}::date THEN COALESCE(p.nr_realizado, 0) * w.f ELSE 0 END) AS vencido_antes
      FROM ${parcelas}
      LEFT JOIN lancamentos_formas fo ON fo.cd_forma = p.cd_forma
      LEFT JOIN tot ON tot.cd_lancamento = l.cd_lancamento
      LEFT JOIN rt ON rt.cd_lancamento = l.cd_lancamento
      CROSS JOIN LATERAL (SELECT CASE WHEN tot.cd_lancamento IS NULL THEN 1.0 ELSE COALESCE(rt.peso / NULLIF(tot.total, 0), 0) END AS f) w
      WHERE g.sn_despesa IS TRUE AND p.dt_realizacao BETWEEN ${inicio}::date AND ${fim}::date AND ${semAjuste}
      GROUP BY 1, 2, 3, 4`,

    // Despesas recorrentes: fornecedor + conta pagos em 3 ou mais meses diferentes nos 6 meses até o fim do período.
    prisma.$queryRaw<Array<{ cd_fornecedor: number | null; cd_conta: number; meses: bigint }>>`
      SELECT l.cd_fornecedor, l.cd_conta, COUNT(DISTINCT to_char(p.dt_realizacao, 'YYYY-MM')) AS meses
      FROM ${parcelas}
      WHERE g.sn_despesa IS TRUE AND p.dt_realizacao > ${fim}::date - 183 AND p.dt_realizacao <= ${fim}::date AND ${semAjuste}
      GROUP BY 1, 2
      HAVING COUNT(DISTINCT to_char(p.dt_realizacao, 'YYYY-MM')) >= 3`,
  ])

  const unicos = (l: Array<number | null>) => [...new Set(l.filter((x): x is number => x !== null))]
  const idsFornecedores = unicos([...abertos.map(a => id(a.cd_fornecedor)), ...recebidos.map(r => id(r.cd_fornecedor)),
    ...pagarAbertos.map(a => id(a.cd_fornecedor)), ...pagos.map(a => id(a.cd_fornecedor))])
  const idsCentros = unicos([...pagarAbertos.map(a => id(a.cd_centro)), ...pagos.map(a => id(a.cd_centro))])
  const centros = idsCentros.length
    ? await prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_centro AS id, TRIM(ds_centro) AS nome FROM centro_custos WHERE cd_centro = ANY(${idsCentros}::int[])`
    : []
  const nomes = idsFornecedores.length
    ? await prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${idsFornecedores}::int[])`
    : []

  return {
    periodo: { inicio, fim },
    contas: contas.map(c => ({ cdConta: Number(c.cd_conta), conta: c.conta ?? `Conta ${c.cd_conta}`, grupo: c.grupo, despesa: c.despesa === true, linha: c.linha || null, variavel: c.variavel === true })),
    bancos: bancos.map(b => {
      const saldoFinal = num(b.saldo) - num(b.depois)
      return {
        cdBanco: Number(b.cd_banco), banco: b.banco, saldoAtual: num(b.saldo), saldoFinal, saldoInicial: saldoFinal - num(b.periodo),
        entradas: num(b.entradas), saidas: num(b.saidas), transfEntrada: num(b.transf_entrada), transfSaida: num(b.transf_saida),
      }
    }),
    fluxo: fluxo.map(f => ({ dia: f.dia, tipo: f.tipo as 'entrada' | 'saida', realizado: num(f.realizado), previsto: num(f.previsto) })),
    financeiro: fin.map(r => ({ regime: r.regime as 'caixa' | 'competencia', mes: r.mes, cdConta: Number(r.cd_conta), valor: num(r.valor) })),
    abertos: abertos.map(a => ({
      receita: a.receita === true, tipo: a.tipo, cdConta: Number(a.cd_conta), cdFornecedor: id(a.cd_fornecedor), faixa: a.faixa,
      mesVencimento: a.mes_venc, mesCompetencia: a.mes_comp, valor: num(a.valor), parcelas: num(a.parcelas),
    })),
    recebidos: recebidos.map(r => ({
      tipo: r.tipo, cdFornecedor: id(r.cd_fornecedor), parcelas: num(r.parcelas), recebido: num(r.recebido), previsto: num(r.previsto),
      noPrazo: num(r.no_prazo), atrasado: num(r.atrasado), antecipado: num(r.antecipado), parciais: num(r.parciais), parcialValor: num(r.parcial_valor),
      perda: num(r.perda), diasEmissao: num(r.dias_emissao), diasAtraso: num(r.dias_atraso),
    })),
    atrasosMensais: atrasos.map(a => ({ mes: a.mes, tipo: a.tipo, valor: num(a.valor) })),
    receita90: num(receita90[0]?.valor),
    naoConciliado: { parcelas: num(conciliacao[0]?.parcelas), valor: num(conciliacao[0]?.valor) },
    pagar: {
      abertos: pagarAbertos.map(a => ({ cdFornecedor: id(a.cd_fornecedor), cdConta: Number(a.cd_conta), cdCentro: id(a.cd_centro), prazo: a.prazo, valor: num(a.valor), parcelas: num(a.parcelas) })),
      pagos: pagos.map(r => ({
        cdFornecedor: id(r.cd_fornecedor), cdConta: Number(r.cd_conta), cdCentro: id(r.cd_centro), forma: r.forma || null,
        parcelas: num(r.parcelas), pago: num(r.pago), previsto: num(r.previsto), juros: num(r.juros), multa: num(r.multa), desconto: num(r.desconto),
        antecipado: num(r.antecipado), atrasado: num(r.atrasado), noPrazo: num(r.no_prazo), diasPrazo: num(r.dias_prazo), diasAtraso: num(r.dias_atraso),
        vencidoAntes: num(r.vencido_antes),
      })),
      recorrentes: recorrentes.map(r => `${id(r.cd_fornecedor) ?? '-'}|${Number(r.cd_conta)}`),
    },
    nomes: {
      fornecedores: Object.fromEntries(nomes.map(n => [Number(n.id), n.nome ?? `Código ${n.id}`])),
      centros: Object.fromEntries(centros.map(n => [Number(n.id), n.nome ?? `Centro ${n.id}`])),
    },
    atualizadoEm: new Date().toISOString(),
  }
}

const cache = new Map<string, { expira: number; valor: unknown }>()
const MAX_CACHE = 12

export async function financeiroRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/financeiro/resumo', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, atualizar } = parsed.data
    const chave = `${inicio}|${fim}`
    const guardado = cache.get(chave)
    if (!atualizar && guardado && guardado.expira > Date.now()) return guardado.valor
    try {
      const valor = await calcular(inicio, fim)
      cache.delete(chave)
      cache.set(chave, { expira: Date.now() + 10 * 60_000, valor })
      while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
      return valor
    } catch (err) {
      request.log.error({ err }, 'dashboard financeiro')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar o financeiro: ${msg}` })
    }
  })
}
