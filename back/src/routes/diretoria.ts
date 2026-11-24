import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'

// Dashboard da Diretoria: indicadores executivos do Financeiro e do Faturamento do Clinux.
// A rota devolve agregados MENSAIS (de janeiro do ano anterior até o mês de referência); a tela calcula mês,
// comparativos (mês anterior, mesmo mês do ano anterior, acumulado do ano) e rankings a partir deles.
//
// Financeiro (lancamentos = título, pagamentos = parcelas):
//   - receita x despesa: grupo da conta (contas_grupos.sn_despesa);
//   - linha do DRE: contas.cd_resultado -> contas_resultados (classificação do próprio plano de contas);
//   - regime de caixa: parcelas realizadas (dt_realizacao, nr_realizado);
//   - regime de competência: emissão do título (lancamentos.dt_emissao, nr_previsto da parcela);
//   - em aberto: parcelas sem dt_realizacao, por faixa de vencimento.
// Faturamento/produção (exames do atendimento, sem cancelados):
//   - produção = nr_vl_convenio + nr_vl_particular; faturado = nr_ft_convenio (com dt_faturamento);
//   - repasse médico = nr_rp_convenio + nr_rp_particular; glosa = nr_vl_glosa; perda = exames com sn_perda.
// Saldos: bancos ativos (nr_saldo).

const filtros = z.object({ mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), atualizar: z.string().optional() })

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v))
const id = (v: unknown) => (v === null || v === undefined ? null : Number(v))

function intervalo(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  const desde = `${a - 1}-01-01`
  const ate = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
  return { desde, ate, inicioMes: `${mes}-01`, inicioAno: `${a}-01-01` }
}

async function calcular(mes: string) {
  const { desde, ate, inicioMes, inicioAno } = intervalo(mes)

  const [contas, fin, abertos, bancos, producao, faturamento, naoFaturado, glosasRec, fornecedores, centros, procedimentos, perdas, perdasTitulos] = await Promise.all([
    prisma.$queryRaw<Array<{ cd_conta: number; conta: string | null; grupo: string | null; despesa: boolean | null; linha: string | null; variavel: boolean | null }>>`
      SELECT c.cd_conta, TRIM(c.ds_conta) AS conta, TRIM(g.ds_grupo) AS grupo, g.sn_despesa AS despesa,
             TRIM(r.ds_resultado) AS linha, c.sn_variavel AS variavel
      FROM contas c
      LEFT JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
      LEFT JOIN contas_resultados r ON r.cd_resultado = c.cd_resultado`,

    prisma.$queryRaw<Array<{ regime: string; mes: string; cd_conta: number; valor: number }>>`
      SELECT 'caixa' AS regime, to_char(p.dt_realizacao, 'YYYY-MM') AS mes, l.cd_conta, SUM(COALESCE(p.nr_realizado, 0)) AS valor
      FROM pagamentos p JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      WHERE p.dt_realizacao >= ${desde}::date AND p.dt_realizacao < ${ate}::date AND l.cd_conta IS NOT NULL
      GROUP BY 2, 3
      UNION ALL
      SELECT 'competencia', to_char(l.dt_emissao, 'YYYY-MM'), l.cd_conta, SUM(COALESCE(p.nr_previsto, p.nr_realizado, 0))
      FROM pagamentos p JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      WHERE l.dt_emissao >= ${desde}::date AND l.dt_emissao < ${ate}::date AND l.cd_conta IS NOT NULL
      GROUP BY 2, 3`,

    // Parcelas em aberto por faixa de vencimento (em relação a hoje).
    prisma.$queryRaw<Array<{ cd_conta: number | null; cd_fornecedor: number | null; faixa: string; valor: number; parcelas: bigint }>>`
      SELECT l.cd_conta, l.cd_fornecedor,
        CASE
          WHEN p.dt_vencimento < current_date - 365 THEN 'v365'
          WHEN p.dt_vencimento < current_date - 90 THEN 'v91'
          WHEN p.dt_vencimento < current_date - 30 THEN 'v31'
          WHEN p.dt_vencimento < current_date THEN 'v1'
          WHEN p.dt_vencimento <= current_date + 30 THEN 'a30'
          WHEN p.dt_vencimento <= current_date + 60 THEN 'a60'
          WHEN p.dt_vencimento <= current_date + 90 THEN 'a90'
          ELSE 'a91'
        END AS faixa,
        SUM(COALESCE(p.nr_previsto, 0)) AS valor, COUNT(*) AS parcelas
      FROM pagamentos p JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      WHERE p.dt_realizacao IS NULL AND p.dt_vencimento IS NOT NULL AND COALESCE(p.nr_previsto, 0) <> 0
      GROUP BY 1, 2, 3`,

    prisma.$queryRaw<Array<{ cd_banco: number; banco: string; saldo: number | null }>>`
      SELECT cd_banco, TRIM(ds_banco) AS banco, nr_saldo AS saldo FROM bancos WHERE sn_ativo IS TRUE ORDER BY 2`,

    // Produção por mês do exame: total, por convênio e por modalidade.
    prisma.$queryRaw<Array<{ mes: string; cd_convenio: number | null; cd_modalidade: number | null; nivel: number; exames: bigint; valor: number; convenio: number; particular: number; faturado: number; nao_faturado: number; repasse: number; glosa: number; perda: number }>>`
      SELECT to_char(a.dt_data, 'YYYY-MM') AS mes, pl.cd_fornecedor AS cd_convenio,
             COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS cd_modalidade,
             GROUPING(pl.cd_fornecedor, COALESCE(pr.cd_modalidade, sl.cd_modalidade)) AS nivel,
             COUNT(*) AS exames,
             SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS valor,
             SUM(COALESCE(e.nr_vl_convenio, 0)) AS convenio,
             SUM(COALESCE(e.nr_vl_particular, 0)) AS particular,
             SUM(COALESCE(e.nr_ft_convenio, 0)) AS faturado,
             SUM(CASE WHEN e.dt_faturamento IS NULL AND COALESCE(e.nr_ft_convenio, 0) = 0 THEN COALESCE(e.nr_vl_convenio, 0) ELSE 0 END) AS nao_faturado,
             SUM(COALESCE(e.nr_rp_convenio, 0) + COALESCE(e.nr_rp_particular, 0)) AS repasse,
             SUM(COALESCE(e.nr_vl_glosa, 0)) AS glosa,
             SUM(CASE WHEN e.sn_perda THEN COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0) ELSE 0 END) AS perda
      FROM exames e
      JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
      LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
      LEFT JOIN planos pl ON pl.cd_plano = e.cd_plano
      WHERE a.dt_data >= ${desde}::date AND a.dt_data < ${ate}::date AND a.ds_status IS DISTINCT FROM 1
      GROUP BY GROUPING SETS ((to_char(a.dt_data, 'YYYY-MM')), (to_char(a.dt_data, 'YYYY-MM'), pl.cd_fornecedor), (to_char(a.dt_data, 'YYYY-MM'), COALESCE(pr.cd_modalidade, sl.cd_modalidade)))`,

    // Faturamento enviado aos convênios, pela data do faturamento.
    prisma.$queryRaw<Array<{ mes: string; faturado: number; exames: bigint }>>`
      SELECT to_char(e.dt_faturamento, 'YYYY-MM') AS mes, SUM(COALESCE(e.nr_ft_convenio, 0)) AS faturado, COUNT(*) AS exames
      FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      WHERE a.dt_data >= ${desde}::date - 365 AND e.dt_faturamento >= ${desde}::date AND e.dt_faturamento < ${ate}::date
        AND a.ds_status IS DISTINCT FROM 1
      GROUP BY 1`,

    // Produção de convênio ainda não faturada (exames dos últimos 12 meses até hoje).
    prisma.$queryRaw<Array<{ valor: number; exames: bigint }>>`
      SELECT SUM(COALESCE(e.nr_vl_convenio, 0)) AS valor, COUNT(*) AS exames
      FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      WHERE a.dt_data >= current_date - 365 AND a.dt_data <= current_date AND a.ds_status IS DISTINCT FROM 1
        AND e.dt_faturamento IS NULL AND COALESCE(e.nr_ft_convenio, 0) = 0 AND COALESCE(e.nr_vl_convenio, 0) > 0`,

    // Glosas recuperadas (recurso), pela data do recurso.
    prisma.$queryRaw<Array<{ mes: string; recuperado: number }>>`
      SELECT to_char(dt_recurso, 'YYYY-MM') AS mes, SUM(COALESCE(nr_recurso, 0)) AS recuperado
      FROM exames_glosas WHERE dt_recurso >= ${desde}::date AND dt_recurso < ${ate}::date GROUP BY 1`,

    // Despesas pagas por fornecedor (regime de caixa).
    prisma.$queryRaw<Array<{ mes: string; cd_fornecedor: number | null; valor: number }>>`
      SELECT to_char(p.dt_realizacao, 'YYYY-MM') AS mes, l.cd_fornecedor, SUM(COALESCE(p.nr_realizado, 0)) AS valor
      FROM pagamentos p
      JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
      JOIN contas c ON c.cd_conta = l.cd_conta
      JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
      WHERE g.sn_despesa IS TRUE AND p.dt_realizacao >= ${desde}::date AND p.dt_realizacao < ${ate}::date
      GROUP BY 1, 2`,

    // Despesas pagas por centro de custo e linha do DRE (rateio do título, quando houver).
    prisma.$queryRaw<Array<{ mes: string; cd_centro: number | null; linha: string | null; valor: number }>>`
      WITH pg AS (
        SELECT p.cd_lancamento, to_char(p.dt_realizacao, 'YYYY-MM') AS mes, SUM(COALESCE(p.nr_realizado, 0)) AS v
        FROM pagamentos p
        JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
        JOIN contas c ON c.cd_conta = l.cd_conta
        JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo
        WHERE g.sn_despesa IS TRUE AND p.dt_realizacao >= ${desde}::date AND p.dt_realizacao < ${ate}::date
        GROUP BY 1, 2
      ),
      rt AS (SELECT cd_lancamento, cd_centro, COALESCE(NULLIF(nr_valor, 0), nr_rateio, 0) AS peso FROM lancamentos_rateios),
      tot AS (SELECT cd_lancamento, SUM(peso) AS total FROM rt GROUP BY 1)
      SELECT pg.mes, COALESCE(rt.cd_centro, l.cd_centro) AS cd_centro, TRIM(r.ds_resultado) AS linha,
             SUM(pg.v * COALESCE(rt.peso / NULLIF(tot.total, 0), 1)) AS valor
      FROM pg
      JOIN lancamentos l ON l.cd_lancamento = pg.cd_lancamento
      LEFT JOIN contas c ON c.cd_conta = l.cd_conta
      LEFT JOIN contas_resultados r ON r.cd_resultado = c.cd_resultado
      LEFT JOIN rt ON rt.cd_lancamento = pg.cd_lancamento
      LEFT JOIN tot ON tot.cd_lancamento = pg.cd_lancamento
      GROUP BY 1, 2, 3`,

    // Procedimentos: produção e repasse no mês e no acumulado do ano.
    prisma.$queryRaw<Array<{ cd_procedimento: number | null; exames_ano: bigint; valor_ano: number; repasse_ano: number; exames_mes: bigint; valor_mes: number; repasse_mes: number }>>`
      SELECT e.cd_procedimento,
             COUNT(*) AS exames_ano,
             SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS valor_ano,
             SUM(COALESCE(e.nr_rp_convenio, 0) + COALESCE(e.nr_rp_particular, 0)) AS repasse_ano,
             COUNT(*) FILTER (WHERE a.dt_data >= ${inicioMes}::date) AS exames_mes,
             SUM(CASE WHEN a.dt_data >= ${inicioMes}::date THEN COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0) ELSE 0 END) AS valor_mes,
             SUM(CASE WHEN a.dt_data >= ${inicioMes}::date THEN COALESCE(e.nr_rp_convenio, 0) + COALESCE(e.nr_rp_particular, 0) ELSE 0 END) AS repasse_mes
      FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      WHERE a.dt_data >= ${inicioAno}::date AND a.dt_data < ${ate}::date AND a.ds_status IS DISTINCT FROM 1
      GROUP BY 1`,

    // Exames marcados como perda, por motivo (mês e acumulado do ano).
    prisma.$queryRaw<Array<{ motivo: string | null; exames_ano: bigint; valor_ano: number; exames_mes: bigint; valor_mes: number }>>`
      SELECT COALESCE(TRIM(pe.ds_perda), NULLIF(TRIM(e.ds_perda), ''), 'Sem motivo informado') AS motivo,
             COUNT(*) AS exames_ano,
             SUM(COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0)) AS valor_ano,
             COUNT(*) FILTER (WHERE a.dt_data >= ${inicioMes}::date) AS exames_mes,
             SUM(CASE WHEN a.dt_data >= ${inicioMes}::date THEN COALESCE(e.nr_vl_convenio, 0) + COALESCE(e.nr_vl_particular, 0) ELSE 0 END) AS valor_mes
      FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      LEFT JOIN perdas pe ON pe.cd_perda = e.cd_perda
      WHERE e.sn_perda IS TRUE AND a.dt_data >= ${inicioAno}::date AND a.dt_data < ${ate}::date
      GROUP BY 1`,

    // Títulos baixados com perda (pagamentos.nr_perda), por mês.
    prisma.$queryRaw<Array<{ mes: string; perda: number }>>`
      SELECT to_char(p.dt_realizacao, 'YYYY-MM') AS mes, SUM(COALESCE(p.nr_perda, 0)) AS perda
      FROM pagamentos p
      WHERE p.dt_realizacao >= ${desde}::date AND p.dt_realizacao < ${ate}::date AND COALESCE(p.nr_perda, 0) <> 0
      GROUP BY 1`,
  ])

  const unicos = (l: Array<number | null>) => [...new Set(l.filter((x): x is number => x !== null))]
  const idsFornecedores = unicos([...producao.map(r => id(r.cd_convenio)), ...fornecedores.map(r => id(r.cd_fornecedor)), ...abertos.map(r => id(r.cd_fornecedor))])
  const idsModalidades = unicos(producao.map(r => id(r.cd_modalidade)))
  const idsCentros = unicos(centros.map(r => id(r.cd_centro)))
  const idsProcedimentos = unicos(procedimentos.map(r => id(r.cd_procedimento)))
  const mapa = (rows: Array<{ id: number; nome: string | null }>) => Object.fromEntries(rows.map(r => [Number(r.id), r.nome ?? `Código ${r.id}`]))
  const [nFornecedores, nModalidades, nCentros, nProcedimentos] = await Promise.all([
    idsFornecedores.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${idsFornecedores}::int[])` : [],
    idsModalidades.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${idsModalidades}::int[])` : [],
    idsCentros.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_centro AS id, TRIM(ds_centro) AS nome FROM centro_custos WHERE cd_centro = ANY(${idsCentros}::int[])` : [],
    idsProcedimentos.length ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${idsProcedimentos}::int[])` : [],
  ])

  const nf = naoFaturado[0]
  return {
    mes, desde, ate,
    contas: contas.map(c => ({ cdConta: Number(c.cd_conta), conta: c.conta ?? `Conta ${c.cd_conta}`, grupo: c.grupo, despesa: c.despesa === true, linha: c.linha || null, variavel: c.variavel === true })),
    financeiro: fin.map(r => ({ regime: r.regime as 'caixa' | 'competencia', mes: r.mes, cdConta: Number(r.cd_conta), valor: num(r.valor) })),
    abertos: abertos.map(r => ({ cdConta: id(r.cd_conta), cdFornecedor: id(r.cd_fornecedor), faixa: r.faixa, valor: num(r.valor), parcelas: num(r.parcelas) })),
    bancos: bancos.map(b => ({ cdBanco: Number(b.cd_banco), banco: b.banco, saldo: num(b.saldo) })),
    producao: producao.map(r => ({
      mes: r.mes, nivel: Number(r.nivel) === 3 ? 'total' : Number(r.nivel) === 1 ? 'convenio' : 'modalidade',
      cdConvenio: id(r.cd_convenio), cdModalidade: id(r.cd_modalidade), exames: num(r.exames), valor: num(r.valor),
      convenio: num(r.convenio), particular: num(r.particular), faturado: num(r.faturado), naoFaturado: num(r.nao_faturado),
      repasse: num(r.repasse), glosa: num(r.glosa), perda: num(r.perda),
    })),
    faturamentoEnviado: faturamento.map(r => ({ mes: r.mes, faturado: num(r.faturado), exames: num(r.exames) })),
    naoFaturado12m: { valor: num(nf?.valor), exames: num(nf?.exames) },
    glosasRecuperadas: glosasRec.map(r => ({ mes: r.mes, recuperado: num(r.recuperado) })),
    despesasFornecedor: fornecedores.map(r => ({ mes: r.mes, cdFornecedor: id(r.cd_fornecedor), valor: num(r.valor) })),
    despesasCentro: centros.map(r => ({ mes: r.mes, cdCentro: id(r.cd_centro), linha: r.linha || null, valor: num(r.valor) })),
    procedimentos: procedimentos.map(r => ({
      cdProcedimento: id(r.cd_procedimento), examesAno: num(r.exames_ano), valorAno: num(r.valor_ano), repasseAno: num(r.repasse_ano),
      examesMes: num(r.exames_mes), valorMes: num(r.valor_mes), repasseMes: num(r.repasse_mes),
    })),
    perdasMotivo: perdas.map(r => ({ motivo: r.motivo ?? 'Sem motivo informado', examesAno: num(r.exames_ano), valorAno: num(r.valor_ano), examesMes: num(r.exames_mes), valorMes: num(r.valor_mes) })),
    perdasTitulos: perdasTitulos.map(r => ({ mes: r.mes, perda: num(r.perda) })),
    nomes: { fornecedores: mapa(nFornecedores), modalidades: mapa(nModalidades), centros: mapa(nCentros), procedimentos: mapa(nProcedimentos) },
    atualizadoEm: new Date().toISOString(),
  }
}

// Cache de 10 minutos por mês de referência (a consulta varre títulos e exames de quase dois anos).
// O botão "Atualizar" da tela manda ?atualizar=1 e ignora o cache.
const cache = new Map<string, { expira: number; valor: unknown }>()
const MAX_CACHE = 12

export async function diretoriaRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/diretoria/resumo', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Informe o mês de referência (AAAA-MM).' })
    const { mes, atualizar } = parsed.data
    const guardado = cache.get(mes)
    if (!atualizar && guardado && guardado.expira > Date.now()) return guardado.valor
    try {
      const valor = await calcular(mes)
      cache.delete(mes)
      cache.set(mes, { expira: Date.now() + 10 * 60_000, valor })
      while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
      return valor
    } catch (err) {
      request.log.error({ err }, 'dashboard da diretoria')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar os dados financeiros: ${msg}` })
    }
  })
}
