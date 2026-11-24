import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { competencia } from '../lib/financeiro-sql'
import { ESTRUTURA_DRE, FOLHAS, FORA, associacaoSchema, lerDreSalva, salvarAssociacoes, sugerirFolha, type ContaClinux } from '../lib/dre'
import {
  aprovar, atualizarAjustes, criarVersao, decidir, lerOrcamento, novoIdAjuste, salvarConciliacao, salvarOrcamento, situacao, versoesDoMes,
  versoesDoPeriodo, type Versao,
} from '../lib/dre-fechamento'

// Módulo DRE: estrutura (associação das contas do Clinux às linhas da DRE), valores mensais por competência e
// detalhamento até o lançamento de origem. A DRE segue o regime de competência: mês/ano do título, ou a competência
// escrita no histórico, ou o mês de emissão; valor = parcelas previstas do título.

const mesIso = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const periodo = z.object({ de: mesIso, ate: mesIso, atualizar: z.string().optional() }).refine(p => p.de <= p.ate, 'Período inválido.')
  .refine(p => (Number(p.ate.slice(0, 4)) * 12 + Number(p.ate.slice(5))) - (Number(p.de.slice(0, 4)) * 12 + Number(p.de.slice(5))) < 48, 'O período máximo é de 4 anos.')

const primeiroDia = (mes: string) => `${mes}-01`

async function lerContas(): Promise<ContaClinux[]> {
  const rows = await prisma.$queryRaw<Array<{ cd_conta: number; conta: string | null; grupo: string | null; despesa: boolean | null; linha: string | null }>>`
    SELECT c.cd_conta, TRIM(c.ds_conta) AS conta, TRIM(g.ds_grupo) AS grupo, g.sn_despesa AS despesa, TRIM(r.ds_resultado) AS linha
    FROM contas c
    LEFT JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
    LEFT JOIN contas_resultados r ON r.cd_resultado = c.cd_resultado
    ORDER BY 3, 2`
  return rows.map(r => ({ cdConta: Number(r.cd_conta), conta: r.conta ?? `Conta ${r.cd_conta}`, grupo: r.grupo, despesa: r.despesa === true, linha: r.linha || null }))
}

/** Associação em vigor de cada conta: a salva ou a sugerida. */
async function associacoes(contas: ContaClinux[]) {
  const salva = await lerDreSalva()
  return {
    historico: salva.historico,
    porConta: Object.fromEntries(contas.map(c => {
      const s = salva.mapeamento[String(c.cdConta)]
      const sugerida = sugerirFolha(c)
      return [c.cdConta, { itens: s ?? (sugerida ? [{ folha: sugerida, pct: 100 }] : []), salvo: Boolean(s), sugerida }]
    })) as Record<number, { itens: Array<{ folha: string; pct: number }>; salvo: boolean; sugerida: string | null }>,
  }
}

const cache = new Map<string, { expira: number; valor: unknown }>()

/** Valores atuais do Clinux por mês de competência e conta. Com centro: só a parte do centro (rateio do título). */
async function valoresVivos(de: string, ate: string, centro: number | null) {
  const rows = centro === null
    ? await prisma.$queryRaw<Array<{ mes: string; cd_conta: number | null; valor: number; titulos: bigint }>>`
        SELECT to_char(${competencia}, 'YYYY-MM') AS mes, l.cd_conta,
               SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0)) AS valor, COUNT(DISTINCT l.cd_lancamento) AS titulos
        FROM pagamentos p JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
        WHERE l.dt_emissao >= ${primeiroDia(de)}::date - 400
          AND ${competencia} >= ${primeiroDia(de)}::date
          AND ${competencia} < (${primeiroDia(ate)}::date + interval '1 month')
        GROUP BY 1, 2`
    : await prisma.$queryRaw<Array<{ mes: string; cd_conta: number | null; valor: number; titulos: bigint }>>`
        WITH rt AS (SELECT cd_lancamento, cd_centro, COALESCE(NULLIF(nr_valor, 0), nr_rateio, 0) AS peso FROM lancamentos_rateios),
             tot AS (SELECT cd_lancamento, SUM(peso) AS total FROM rt GROUP BY 1)
        SELECT to_char(${competencia}, 'YYYY-MM') AS mes, l.cd_conta,
               SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0) *
                   CASE WHEN tot.cd_lancamento IS NOT NULL THEN COALESCE(rt.peso / NULLIF(tot.total, 0), 0) ELSE 1 END) AS valor,
               COUNT(DISTINCT l.cd_lancamento) AS titulos
        FROM pagamentos p
        JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
        LEFT JOIN tot ON tot.cd_lancamento = l.cd_lancamento
        LEFT JOIN rt ON rt.cd_lancamento = l.cd_lancamento AND rt.cd_centro = ${centro}
        WHERE l.dt_emissao >= ${primeiroDia(de)}::date - 400
          AND ${competencia} >= ${primeiroDia(de)}::date
          AND ${competencia} < (${primeiroDia(ate)}::date + interval '1 month')
          AND (rt.cd_lancamento IS NOT NULL OR (tot.cd_lancamento IS NULL AND l.cd_centro = ${centro}))
        GROUP BY 1, 2`
  return rows.map(r => ({ mes: r.mes, cdConta: r.cd_conta === null ? null : Number(r.cd_conta), valor: Number(r.valor ?? 0), titulos: Number(r.titulos) }))
}

const ator = (headers: Record<string, unknown>) => {
  const a = headers['x-admin-actor']
  return typeof a === 'string' && /^[a-zA-Z0-9_.@-]{1,100}$/.test(a) ? a : 'nao_identificado'
}

export async function dreRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dre/estrutura', async () => {
    const contas = await lerContas()
    // Contas com movimento nos últimos 2 anos (para a tela destacar as que importam).
    const uso = await prisma.$queryRaw<Array<{ cd_conta: number; titulos: bigint; valor: number }>>`
      SELECT l.cd_conta, COUNT(DISTINCT l.cd_lancamento) AS titulos, SUM(COALESCE(p.nr_previsto, 0)) AS valor
      FROM lancamentos l JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
      WHERE l.dt_emissao >= current_date - 730 AND l.cd_conta IS NOT NULL
      GROUP BY 1`
    const usoPorConta = new Map(uso.map(u => [Number(u.cd_conta), { titulos: Number(u.titulos), valor: Number(u.valor ?? 0) }]))
    const a = await associacoes(contas)
    return {
      estrutura: ESTRUTURA_DRE, fora: FORA,
      contas: contas.map(c => ({ ...c, ...a.porConta[c.cdConta], uso: usoPorConta.get(c.cdConta) ?? { titulos: 0, valor: 0 } })),
      historico: a.historico.slice(-200).reverse(),
    }
  })

  fastify.put('/clinux/dre/estrutura', async (request, reply) => {
    // Corpo: { "123": [{ folha, pct }], "456": null (volta à sugestão) }
    const corpo = z.record(z.string().regex(/^\d+$/), associacaoSchema.nullable()).safeParse((request.body as { alteracoes?: unknown })?.alteracoes)
    if (!corpo.success) return reply.code(400).send({ error: corpo.error.issues[0]?.message ?? 'Associação inválida.' })
    if (!Object.keys(corpo.data).length) return { ok: true }
    const contas = new Map((await lerContas()).map(c => [c.cdConta, c]))
    const desconhecida = Object.keys(corpo.data).find(k => !contas.has(Number(k)))
    if (desconhecida) return reply.code(400).send({ error: `Conta ${desconhecida} não existe no plano de contas.` })
    const ator = request.headers['x-admin-actor']
    const por = typeof ator === 'string' && /^[a-zA-Z0-9_.@-]{1,100}$/.test(ator) ? ator : 'nao_identificado'
    await salvarAssociacoes(corpo.data, contas, por)
    cache.clear()
    return { ok: true }
  })

  // Valores por mês e conta (conta null = lançamento sem conta). Meses fechados (versão aprovada) usam a fotografia
  // do fechamento e a associação daquele momento; ajustes posteriores entram como contas sintéticas (ids negativos).
  // Com ?centro=ID, a DRE é só daquele centro de custo/resultado (valores atuais, sem fotografia).
  fastify.get('/clinux/dre/valores', async (request, reply) => {
    const parsed = periodo.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Período inválido.' })
    const { de, ate, atualizar } = parsed.data
    const centroTxt = (request.query as { centro?: string }).centro
    const centro = centroTxt && /^\d+$/.test(centroTxt) ? Number(centroTxt) : null
    const chave = `${de}|${ate}|${centro ?? ''}`
    const guardado = cache.get(chave)
    if (!atualizar && guardado && guardado.expira > Date.now()) return guardado.valor
    try {
      const [vivos, contas, versoes] = await Promise.all([valoresVivos(de, ate, centro), lerContas(), versoesDoPeriodo(de, ate)])
      const a = await associacoes(contas)
      const porMes = new Map<string, Versao[]>()
      for (const v of versoes) porMes.set(v.mes, [...(porMes.get(v.mes) ?? []), v])
      const fechamentos: Record<string, { status: string; versao: number | null; aguardando: number | null }> = {}
      for (const [mes, vs] of porMes) {
        const s = situacao(vs)
        fechamentos[mes] = { status: s.status, versao: s.aprovada?.versao ?? null, aguardando: s.aguardando?.versao ?? null }
      }
      let valores = vivos
      const mapeamentoMes: Record<string, Versao['mapeamento']> = {}
      const extras: Array<{ cdConta: number; conta: string; grupo: string | null; despesa: boolean; itens: Array<{ folha: string; pct: number }>; salvo: boolean; ajuste: true }> = []
      if (centro === null) {
        for (const [mes, vs] of porMes) {
          const aprovada = situacao(vs).aprovada
          if (!aprovada) continue
          valores = valores.filter(v => v.mes !== mes).concat(aprovada.valores.map(f => ({ mes, cdConta: f.cdConta, valor: f.valor, titulos: f.titulos })))
          mapeamentoMes[mes] = aprovada.mapeamento
          for (const aj of aprovada.ajustes) {
            extras.push({ cdConta: aj.id, conta: `Ajuste posterior: ${aj.descricao}`, grupo: null, despesa: false, itens: [{ folha: aj.folha, pct: 100 }], salvo: true, ajuste: true })
            valores.push({ mes, cdConta: aj.id, valor: aj.valor, titulos: 0 })
          }
        }
      }
      const valor = {
        de, ate, centro,
        contas: [...contas.map(c => ({ cdConta: c.cdConta, conta: c.conta, grupo: c.grupo, despesa: c.despesa, itens: a.porConta[c.cdConta].itens, salvo: a.porConta[c.cdConta].salvo })), ...extras],
        valores, mapeamentoMes, fechamentos,
        atualizadoEm: new Date().toISOString(),
      }
      cache.set(chave, { expira: Date.now() + 10 * 60_000, valor })
      while (cache.size > 12) cache.delete(cache.keys().next().value as string)
      return valor
    } catch (err) {
      request.log.error({ err }, 'DRE valores')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar a DRE: ${msg}` })
    }
  })

  // Centros de custo/resultado com movimento nos últimos 2 anos (DRE por centro e por modalidade).
  fastify.get('/clinux/dre/centros', async () => {
    const rows = await prisma.$queryRaw<Array<{ cd_centro: number; centro: string | null; titulos: bigint }>>`
      SELECT cc.cd_centro, TRIM(cc.ds_centro) AS centro, COUNT(DISTINCT x.cd_lancamento) AS titulos
      FROM centro_custos cc
      JOIN (
        SELECT cd_lancamento, cd_centro FROM lancamentos WHERE cd_centro IS NOT NULL AND dt_emissao >= current_date - 730
        UNION
        SELECT r.cd_lancamento, r.cd_centro FROM lancamentos_rateios r JOIN lancamentos l2 ON l2.cd_lancamento = r.cd_lancamento
        WHERE l2.dt_emissao >= current_date - 730
      ) x ON x.cd_centro = cc.cd_centro
      GROUP BY 1, 2 ORDER BY 3 DESC`
    return { centros: rows.map(r => ({ cdCentro: Number(r.cd_centro), centro: r.centro ?? `Centro ${r.cd_centro}`, titulos: Number(r.titulos) })) }
  })

  // Lançamentos de origem de uma ou mais contas no período (contas=0 = lançamentos sem conta).
  fastify.get('/clinux/dre/lancamentos', async (request, reply) => {
    const q = z.object({ de: mesIso, ate: mesIso, contas: z.string().regex(/^\d+(,\d+){0,200}$/) }).safeParse(request.query)
    if (!q.success) return reply.code(400).send({ error: 'Filtro inválido.' })
    const { de, ate } = q.data
    const ids = q.data.contas.split(',').map(Number)
    const semConta = ids.includes(0)
    const rows = await prisma.$queryRaw<Array<{ cd_lancamento: number; tipo: string | null; cd_conta: number | null; emissao: string; competencia: string; documento: string | null; historico: string | null; fornecedor: string | null; valor: number; parcelas: bigint; realizado: number }>>`
      SELECT l.cd_lancamento, l.ds_tipo AS tipo, l.cd_conta, to_char(l.dt_emissao, 'YYYY-MM-DD') AS emissao,
             to_char(${competencia}, 'YYYY-MM') AS competencia, TRIM(l.ds_documento) AS documento, TRIM(l.ds_historico) AS historico,
             TRIM(f.ds_fornecedor) AS fornecedor,
             SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0)) AS valor, COUNT(*) AS parcelas, SUM(COALESCE(p.nr_realizado, 0)) AS realizado
      FROM lancamentos l
      JOIN pagamentos p ON p.cd_lancamento = l.cd_lancamento
      LEFT JOIN fornecedores f ON f.cd_fornecedor = l.cd_fornecedor
      WHERE l.dt_emissao >= ${primeiroDia(de)}::date - 400
        AND ${competencia} >= ${primeiroDia(de)}::date
        AND ${competencia} < (${primeiroDia(ate)}::date + interval '1 month')
        AND (l.cd_conta = ANY(${ids}::int[]) OR (${semConta} AND l.cd_conta IS NULL))
      GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
      ORDER BY ABS(SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0))) DESC
      LIMIT 500`
    return {
      lancamentos: rows.map(r => ({
        cdLancamento: Number(r.cd_lancamento), tipo: r.tipo, cdConta: r.cd_conta === null ? null : Number(r.cd_conta), emissao: r.emissao,
        competencia: r.competencia, documento: r.documento, historico: r.historico, fornecedor: r.fornecedor,
        valor: Number(r.valor ?? 0), parcelas: Number(r.parcelas), realizado: Number(r.realizado ?? 0),
      })),
      limite: 500,
    }
  })
  // ---------------- Fechamento mensal ----------------

  const mesParam = (request: { params: unknown }) => {
    const mes = (request.params as { mes?: string }).mes ?? ''
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : null
  }
  const mesCorrente = () => new Date().toISOString().slice(0, 7)

  // Situação de cada mês do ano, versões e diferença entre o fechado e o Clinux atual.
  fastify.get('/clinux/dre/fechamentos', async (request, reply) => {
    const ano = Number((request.query as { ano?: string }).ano)
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return reply.code(400).send({ error: 'Ano inválido.' })
    const de = `${ano}-01`, ate = `${ano}-12`
    const [versoes, vivos] = await Promise.all([versoesDoPeriodo(de, ate), valoresVivos(de, ate, null)])
    const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`).map(mes => {
      const vs = versoes.filter(v => v.mes === mes)
      const s = situacao(vs)
      let diferenca: { contas: number; valor: number } | null = null
      if (s.aprovada) {
        const atual = new Map<string, number>(), foto = new Map<string, number>()
        for (const v of vivos) if (v.mes === mes) atual.set(String(v.cdConta), (atual.get(String(v.cdConta)) ?? 0) + v.valor)
        for (const f of s.aprovada.valores) foto.set(String(f.cdConta), (foto.get(String(f.cdConta)) ?? 0) + f.valor)
        let contas = 0, valor = 0
        for (const k of new Set([...atual.keys(), ...foto.keys()])) {
          const d = Math.abs((atual.get(k) ?? 0) - (foto.get(k) ?? 0))
          if (d > 0.01) { contas++; valor += d }
        }
        diferenca = { contas, valor: Math.round(valor * 100) / 100 }
      }
      return { mes, status: s.status, aberto: mes >= mesCorrente(), diferenca, versoes: vs }
    })
    return { ano, meses }
  })

  fastify.post('/clinux/dre/fechamentos/:mes/fechar', async (request, reply) => {
    const mes = mesParam(request)
    if (!mes) return reply.code(400).send({ error: 'Mês inválido.' })
    if (mes >= mesCorrente()) return reply.code(409).send({ error: 'Só é possível fechar meses já encerrados.' })
    const motivo = z.string().trim().max(500).optional().safeParse((request.body as { motivo?: unknown })?.motivo)
    const vs = await versoesDoMes(mes)
    const s = situacao(vs)
    if (s.aguardando) return reply.code(409).send({ error: `A versão ${s.aguardando.versao} deste mês ainda aguarda aprovação.` })
    if (s.aprovada && !(motivo.success && motivo.data && motivo.data.length >= 3)) return reply.code(400).send({ error: 'O mês já está fechado: informe o motivo da nova versão.' })
    const contas = await lerContas()
    const a = await associacoes(contas)
    const valores = (await valoresVivos(mes, mes, null)).map(v => ({ cdConta: v.cdConta, valor: v.valor, titulos: v.titulos }))
    const mapeamento = Object.fromEntries(contas.filter(c => a.porConta[c.cdConta].itens.length).map(c => [String(c.cdConta), a.porConta[c.cdConta].itens]))
    const versao = await criarVersao({ mes, valores, mapeamento, ajustes: s.aprovada?.ajustes ?? [], motivo: motivo.success ? motivo.data ?? null : null, criadoPor: ator(request.headers) })
    cache.clear()
    return { ok: true, versao }
  })

  fastify.post('/clinux/dre/fechamentos/:mes/aprovar', async (request, reply) => {
    const mes = mesParam(request)
    const versao = Number((request.body as { versao?: unknown })?.versao)
    if (!mes || !Number.isInteger(versao)) return reply.code(400).send({ error: 'Pedido inválido.' })
    const alvo = (await versoesDoMes(mes)).find(v => v.versao === versao)
    if (!alvo || alvo.status !== 'aguardando') return reply.code(409).send({ error: 'Esta versão não está aguardando aprovação.' })
    await aprovar(mes, versao, ator(request.headers))
    cache.clear()
    return { ok: true, mesmoUsuario: alvo.criadoPor === ator(request.headers) }
  })

  fastify.post('/clinux/dre/fechamentos/:mes/rejeitar', async (request, reply) => {
    const mes = mesParam(request)
    const corpo = z.object({ versao: z.number().int(), motivo: z.string().trim().min(3).max(500) }).safeParse(request.body)
    if (!mes || !corpo.success) return reply.code(400).send({ error: 'Informe a versão e o motivo da rejeição.' })
    const alvo = (await versoesDoMes(mes)).find(v => v.versao === corpo.data.versao)
    if (!alvo || alvo.status !== 'aguardando') return reply.code(409).send({ error: 'Esta versão não está aguardando aprovação.' })
    await decidir(mes, corpo.data.versao, 'rejeitado', ator(request.headers), corpo.data.motivo)
    return { ok: true }
  })

  fastify.post('/clinux/dre/fechamentos/:mes/reabrir', async (request, reply) => {
    const mes = mesParam(request)
    const motivo = z.string().trim().min(3).max(500).safeParse((request.body as { motivo?: unknown })?.motivo)
    if (!mes || !motivo.success) return reply.code(400).send({ error: 'Informe o motivo da reabertura.' })
    const s = situacao(await versoesDoMes(mes))
    if (!s.aprovada) return reply.code(409).send({ error: 'O mês não está fechado.' })
    if (s.aguardando) return reply.code(409).send({ error: 'Há uma versão aguardando aprovação: aprove ou rejeite antes de reabrir.' })
    await decidir(mes, s.aprovada.versao, 'reaberto', ator(request.headers), motivo.data)
    cache.clear()
    return { ok: true }
  })

  // Ajuste posterior: entra na versão aguardando ou cria uma nova versão a partir da fotografia aprovada.
  fastify.post('/clinux/dre/fechamentos/:mes/ajustes', async (request, reply) => {
    const mes = mesParam(request)
    const corpo = z.object({
      folha: z.enum(FOLHAS as [string, ...string[]]), valor: z.number().refine(v => v !== 0 && Math.abs(v) < 1e10, 'Valor inválido.'),
      descricao: z.string().trim().min(3).max(200),
    }).safeParse(request.body)
    if (!mes || !corpo.success) return reply.code(400).send({ error: corpo.success ? 'Mês inválido.' : corpo.error.issues[0]?.message ?? 'Ajuste inválido.' })
    const s = situacao(await versoesDoMes(mes))
    const por = ator(request.headers)
    const ajuste = { id: novoIdAjuste(), ...corpo.data, valor: Math.round(corpo.data.valor * 100) / 100, em: new Date().toISOString(), por }
    if (s.aguardando) {
      await atualizarAjustes(mes, s.aguardando.versao, [...s.aguardando.ajustes, ajuste])
      return { ok: true, versao: s.aguardando.versao }
    }
    if (!s.aprovada) return reply.code(409).send({ error: 'Mês aberto: corrija no Clinux ou feche o mês antes de registrar ajustes.' })
    const versao = await criarVersao({
      mes, valores: s.aprovada.valores, mapeamento: s.aprovada.mapeamento, ajustes: [...s.aprovada.ajustes, ajuste],
      motivo: `Ajuste posterior: ${corpo.data.descricao}`, criadoPor: por,
    })
    return { ok: true, versao }
  })

  // Conciliação com a contabilidade: valores contábeis por linha da DRE na versão fechada.
  fastify.put('/clinux/dre/fechamentos/:mes/conciliacao', async (request, reply) => {
    const mes = mesParam(request)
    const ids = ESTRUTURA_DRE.flatMap(l => (l.tipo === 'grupo' ? [l.id, ...l.folhas.map(f => f.id)] : [l.id]))
    const corpo = z.object({
      versao: z.number().int(), linhas: z.record(z.enum(ids as [string, ...string[]]), z.number().finite()), observacao: z.string().trim().max(1000).optional(),
    }).safeParse(request.body)
    if (!mes || !corpo.success) return reply.code(400).send({ error: 'Conciliação inválida.' })
    const alvo = (await versoesDoMes(mes)).find(v => v.versao === corpo.data.versao)
    if (!alvo || (alvo.status !== 'aprovado' && alvo.status !== 'aguardando')) return reply.code(409).send({ error: 'Concilie a versão fechada (aprovada ou aguardando).' })
    await salvarConciliacao(mes, corpo.data.versao, { linhas: corpo.data.linhas, observacao: corpo.data.observacao, em: new Date().toISOString(), por: ator(request.headers) })
    return { ok: true }
  })

  // ---------------- Orçamento ----------------

  fastify.get('/clinux/dre/orcamento', async (request, reply) => {
    const ano = Number((request.query as { ano?: string }).ano)
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return reply.code(400).send({ error: 'Ano inválido.' })
    return lerOrcamento(ano)
  })

  fastify.put('/clinux/dre/orcamento/:ano', async (request, reply) => {
    const ano = Number((request.params as { ano?: string }).ano)
    const corpo = z.record(z.enum(FOLHAS as [string, ...string[]]), z.array(z.number().finite()).length(12)).safeParse((request.body as { valores?: unknown })?.valores)
    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100 || !corpo.success) return reply.code(400).send({ error: 'Orçamento inválido.' })
    await salvarOrcamento(ano, corpo.data, ator(request.headers))
    return { ok: true }
  })

}

