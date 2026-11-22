import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { lerConfigAnalise, type ConfigAnalise } from '../lib/config-analises'

// Dashboard de Laudos (Analíticos).
//   Data do laudo     = a PRIMEIRA publicação (log_clinux, campo D. Publicado), ou a menor entre D. Publicado,
//                       D. Laudo e assinatura. Republicar após correção não muda a data (não vira atraso).
//   Laudo do período  = data do laudo dentro do período, seja qual for a data do exame (um exame do dia 17
//                       laudado no dia 19 conta no dia 19).
//   Pendente          = exame do período (data do atendimento) ainda sem D. Laudo. Só informativo.
//   Médico            = o médico executor do atendimento (atendimentos.cd_medico), o mesmo da tela Desempenho.
//                       Atendimento sem médico não entra.
//   Modalidade        = a do procedimento do exame (procedimentos.cd_modalidade); sem ela, a da sala.
//   Tempo de laudo    = D. Laudo − (data do atendimento + H. Saída, atendimentos.dt_hora_saida: exame terminado).
//                       Sem H. Saída o laudo conta, mas sem tempo. Laudo antes da saída = laudado na hora (0).
//   Prazo             = atendimentos.dt_entrega + hr_entrega (a data de entrega prometida ao paciente). Se a entrega
//                       é anterior ao atendimento (exame transferido de data no Clinux mantém a entrega antiga), o prazo
//                       é recalculado: data do atendimento + dias ÚTEIS de entrega (sem sábado, domingo e feriados
//                       da tabela feriados) do procedimento (nr_prazo_entrega) ou, sem ele, da modalidade (nr_entrega).
//   Atraso            = finalizado: data do laudo depois do prazo; pendente: agora depois do prazo.
// Revisão e retificação de laudo são procedimentos próprios (configuráveis em "Configurar analíticos"). Elas são
// atribuídas ao médico do laudo corrigido: o último exame assinado do mesmo paciente, na mesma modalidade, até 1 ano
// antes. Sem esse laudo anterior, ficam com o médico do próprio exame de revisão/retificação.
// O mínimo de exames da configuração tira o par médico × modalidade com poucos laudos nos ÚLTIMOS 90 DIAS (até o fim
// do período) — medido numa janela fixa para não cortar todo mundo quando o período escolhido é curto (ex.: 1 dia).

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({ inicio: dataIso, fim: dataIso }).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 92) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nesta tela o período máximo é de 3 meses.' })
})

// Tempos acima disso são dado inconsistente: o exame conta, mas sem tempo de laudo.
const LIMITE_HORAS = 60 * 24
// Laudo antes da H. Saída (médico laudou com o paciente ainda na clínica, ex.: ultrassom) = laudado na hora: tempo 0.
// Mais de 24 h antes da saída é dado inconsistente (fica sem tempo).
const TOLERANCIA_ANTES_SAIDA = 24

function tempoLaudo(horas: number | null) {
  if (horas === null || !Number.isFinite(horas)) return null
  if (horas < 0) return horas >= -TOLERANCIA_ANTES_SAIDA ? 0 : null
  return horas <= LIMITE_HORAS ? arred(horas) : null
}

type Tipo = 'laudo' | 'revisao' | 'retificacao'
type Linha = {
  cd_exame: number; cd_atendimento: number; cd_paciente: number | null; data: string; data_exame: string; realizado: string | null
  finalizado: boolean; assinado: string | null; prazo: string | null; prazo_recalculado: boolean; horas: number | null; atraso_horas: number | null
  cd_medico: number | null; cd_modalidade: number | null; cd_convenio: number | null; cd_procedimento: number | null
  tipo: Tipo; cd_medico_origem: number | null; cd_exame_origem: number | null
}

async function linhas(inicio: string, fim: string, cfg: ConfigAnalise) {
  const correcoes = [...cfg.procedimentosRevisao, ...cfg.procedimentosRetificacao]
  return prisma.$queryRaw<Linha[]>`
    WITH cand AS (
      SELECT
        e.cd_exame, e.cd_atendimento, a.cd_paciente, a.dt_data,
        (a.dt_data + a.dt_hora_saida) AS realizado,
        e.dt_laudo AS dt_laudo_atual, e.dt_assinado, e.dt_publicado,
        -- Prazo: data de entrega do atendimento. Exame transferido de data no Clinux fica com a entrega antiga
        -- (anterior ao atendimento): nesse caso recalcula em DIAS UTEIS (sem sabado, domingo e feriados cadastrados)
        -- pelo prazo do procedimento ou, sem ele, da modalidade.
        CASE
          WHEN a.dt_entrega IS NOT NULL AND a.dt_entrega >= a.dt_data
            THEN a.dt_entrega + COALESCE(a.hr_entrega, '23:59:59'::time)
          WHEN de.dias IS NOT NULL THEN (
            SELECT g::date FROM generate_series(a.dt_data + 1, a.dt_data + de.dias * 2 + 20, interval '1 day') g
            WHERE EXTRACT(ISODOW FROM g) < 6
              AND NOT EXISTS (SELECT 1 FROM feriados f WHERE f.dt_data = g::date AND f.sn_feriado IS DISTINCT FROM false)
            ORDER BY g OFFSET de.dias - 1 LIMIT 1
          ) + COALESCE(a.hr_entrega, '23:59:59'::time)
        END AS prazo,
        (a.dt_entrega IS NOT NULL AND a.dt_entrega < a.dt_data) AS prazo_recalculado,
        a.cd_medico,
        COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS cd_modalidade,
        pl.cd_fornecedor AS cd_convenio,
        e.cd_procedimento,
        pr.sn_laudar,
        CASE WHEN e.cd_procedimento = ANY(${cfg.procedimentosRevisao}::int[]) THEN 'revisao'
             WHEN e.cd_procedimento = ANY(${cfg.procedimentosRetificacao}::int[]) THEN 'retificacao'
             ELSE 'laudo' END AS tipo
      FROM exames e
      JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
      LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
      LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
      LEFT JOIN planos pl ON pl.cd_plano = e.cd_plano
      LEFT JOIN modalidades md ON md.cd_modalidade = COALESCE(pr.cd_modalidade, sl.cd_modalidade)
      CROSS JOIN LATERAL (SELECT COALESCE(NULLIF(pr.nr_prazo_entrega, 0), NULLIF(md.nr_entrega, 0)) AS dias) de
      -- Exames de ate 92 dias antes do inicio. Candidatos: alguma data de laudo atual a partir do inicio (a primeira
      -- publicacao nunca e posterior as datas atuais) ou exame do periodo ainda sem laudo.
      WHERE a.dt_data >= ${inicio}::date - 92 AND a.dt_data <= ${fim}::date
        AND (
          GREATEST(e.dt_laudo, e.dt_assinado, e.dt_publicado) >= ${inicio}::date
          OR (COALESCE(e.dt_laudo, e.dt_assinado, e.dt_publicado) IS NULL AND a.dt_data >= ${inicio}::date)
        )
        AND a.cd_medico IS NOT NULL
        AND a.ds_status IS DISTINCT FROM 1
        AND COALESCE(pr.cd_modalidade, sl.cd_modalidade, 0) <> ALL(${cfg.modalidadesExcluidas}::int[])
        AND COALESCE(pl.cd_fornecedor, 0) <> ALL(${cfg.conveniosExcluidos}::int[])
        AND COALESCE(e.cd_procedimento, 0) <> ALL(${cfg.procedimentosExcluidos}::int[])
    ),
    ex AS (
      -- Data do laudo = o primeiro momento em que ficou pronto: a menor entre a PRIMEIRA publicacao registrada no log
      -- do Clinux (o banco guarda so a ultima: republicar depois de uma correcao troca a data), D. Publicado,
      -- D. Laudo e assinatura. O log pode trazer o campo como "dt_publicado" ou "D. Publicado": compara so as letras.
      SELECT c.*, LEAST(pub.primeira, c.dt_publicado, c.dt_laudo_atual, c.dt_assinado) AS dt_laudo
      FROM cand c
      LEFT JOIN LATERAL (
        SELECT MIN(l.dt_log) AS primeira
        FROM log_clinux l
        WHERE l.cd_key = c.cd_exame
          AND LOWER(TRIM(l.ds_table)) = 'exames'
          AND regexp_replace(LOWER(l.ds_field), '[^a-z]', '', 'g') IN ('dtpublicado', 'dpublicado')
          AND COALESCE(TRIM(l.ds_after), '') <> ''
      ) pub ON true
    ),
    periodo AS (
      SELECT * FROM ex
      WHERE (dt_laudo >= ${inicio}::date AND dt_laudo < ${fim}::date + 1)
         -- Pendentes: exame do periodo sem laudo, so se o procedimento for laudavel (gravacoes, taxas etc. ficam fora).
         OR (dt_laudo IS NULL AND dt_data >= ${inicio}::date AND sn_laudar IS DISTINCT FROM false)
    )
    SELECT
      x.cd_exame, x.cd_atendimento, x.cd_paciente,
      to_char(COALESCE(x.dt_laudo::date, x.dt_data), 'YYYY-MM-DD') AS data,
      to_char(x.dt_data, 'YYYY-MM-DD') AS data_exame,
      to_char(x.realizado, 'YYYY-MM-DD HH24:MI') AS realizado,
      (x.dt_laudo IS NOT NULL) AS finalizado,
      to_char(x.dt_laudo, 'YYYY-MM-DD HH24:MI') AS assinado,
      to_char(x.prazo, 'YYYY-MM-DD HH24:MI') AS prazo,
      x.prazo_recalculado,
      EXTRACT(EPOCH FROM (x.dt_laudo - x.realizado)) / 3600.0 AS horas,
      EXTRACT(EPOCH FROM (COALESCE(x.dt_laudo, now()::timestamp) - x.prazo)) / 3600.0 AS atraso_horas,
      x.cd_medico, x.cd_modalidade, x.cd_convenio, x.cd_procedimento, x.tipo,
      orig.cd_medico AS cd_medico_origem, orig.cd_exame AS cd_exame_origem
    FROM periodo x
    LEFT JOIN LATERAL (
      SELECT a2.cd_medico, e2.cd_exame
      FROM atendimentos a2
      JOIN exames e2 ON e2.cd_atendimento = a2.cd_atendimento
      LEFT JOIN procedimentos p2 ON p2.cd_procedimento = e2.cd_procedimento
      WHERE a2.cd_paciente = x.cd_paciente
        AND a2.dt_data <= x.dt_data AND a2.dt_data >= x.dt_data - 365
        AND e2.cd_exame <> x.cd_exame
        AND a2.cd_medico IS NOT NULL
        AND COALESCE(e2.dt_laudo, e2.dt_assinado) IS NOT NULL
        AND p2.cd_modalidade = x.cd_modalidade
        AND e2.cd_procedimento <> ALL(${correcoes}::int[])
      ORDER BY a2.dt_data DESC, COALESCE(e2.dt_laudo, e2.dt_assinado) DESC
      LIMIT 1
    ) orig ON x.tipo <> 'laudo' AND x.cd_paciente IS NOT NULL
  `
}

// Laudos de cada par médico × modalidade nos 90 dias até o fim do período (base do mínimo de exames).
async function volume90(fim: string, cfg: ConfigAnalise) {
  if (cfg.minimoExames <= 0) return null
  const rows = await prisma.$queryRaw<Array<{ cd_medico: number; cd_modalidade: number | null; n: bigint }>>`
    SELECT a.cd_medico, COALESCE(pr.cd_modalidade, sl.cd_modalidade) AS cd_modalidade, COUNT(*) AS n
    FROM exames e
    JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
    LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
    LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
    WHERE a.dt_data >= ${fim}::date - 89 AND a.dt_data <= ${fim}::date
      AND a.cd_medico IS NOT NULL
      AND COALESCE(e.dt_laudo, e.dt_assinado, e.dt_publicado) IS NOT NULL
      AND e.cd_procedimento <> ALL(${[...cfg.procedimentosRevisao, ...cfg.procedimentosRetificacao, ...cfg.procedimentosExcluidos]}::int[])
    GROUP BY 1, 2`
  return new Map(rows.map(r => [`${Number(r.cd_medico)}|${r.cd_modalidade === null ? '-' : Number(r.cd_modalidade)}`, Number(r.n)]))
}

async function nomes(sql: 'medicos' | 'modalidades' | 'fornecedores' | 'procedimentos', ids: number[]) {
  if (!ids.length) return {}
  const rows = sql === 'medicos'
    ? await prisma.$queryRaw<Array<{ id: number; nome: string }>>`SELECT cd_medico AS id, TRIM(ds_medico) AS nome FROM medicos WHERE cd_medico = ANY(${ids}::int[])`
    : sql === 'modalidades'
      ? await prisma.$queryRaw<Array<{ id: number; nome: string }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades WHERE cd_modalidade = ANY(${ids}::int[])`
      : sql === 'fornecedores'
        ? await prisma.$queryRaw<Array<{ id: number; nome: string }>>`SELECT cd_fornecedor AS id, TRIM(ds_fornecedor) AS nome FROM fornecedores WHERE cd_fornecedor = ANY(${ids}::int[])`
        : await prisma.$queryRaw<Array<{ id: number; nome: string }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${ids}::int[])`
  return Object.fromEntries(rows.map(r => [Number(r.id), r.nome]))
}

const arred = (n: number) => Math.round(n * 10) / 10
const unicos = (l: Array<number | null>) => [...new Set(l.filter((x): x is number => x !== null))]

export async function laudosRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/laudos', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim } = parsed.data
    const cfg = await lerConfigAnalise('laudos')
    let rows: Linha[], volume: Map<string, number> | null
    try {
      [rows, volume] = await Promise.all([linhas(inicio, fim, cfg), volume90(fim, cfg)])
    } catch (err) {
      // Mostra a causa na tela (só usuários com permissão de dashboard chegam aqui) e registra no log.
      request.log.error({ err }, 'dashboard de laudos')
      const msg = err instanceof Error ? err.message.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-2).join(' ') : String(err)
      return reply.code(500).send({ error: `Erro ao consultar os laudos: ${msg}` })
    }

    // Médico responsável: o do laudo; na revisão/retificação, o do laudo corrigido.
    const base = rows.map(r => {
      const origem = r.tipo !== 'laudo' && r.cd_medico_origem !== null
      const horas = r.horas === null ? null : Number(r.horas)
      return {
        id: Number(r.cd_exame),
        cdAtendimento: Number(r.cd_atendimento),
        cdPaciente: r.cd_paciente === null ? null : Number(r.cd_paciente),
        data: r.data,
        dataExame: r.data_exame,
        realizado: r.realizado,
        finalizado: r.finalizado === true,
        assinado: r.assinado,
        prazo: r.prazo,
        prazoRecalculado: r.prazo_recalculado === true,
        horas: tempoLaudo(horas),
        atrasoHoras: r.atraso_horas === null ? null : arred(Number(r.atraso_horas)),
        cdMedico: origem ? Number(r.cd_medico_origem) : r.cd_medico === null ? null : Number(r.cd_medico),
        cdMedicoExame: r.cd_medico === null ? null : Number(r.cd_medico),
        atribuidoPor: (r.tipo === 'laudo' ? 'laudo' : origem ? 'laudo_anterior' : 'proprio_exame') as 'laudo' | 'laudo_anterior' | 'proprio_exame',
        cdExameOrigem: r.cd_exame_origem === null ? null : Number(r.cd_exame_origem),
        cdModalidade: r.cd_modalidade === null ? null : Number(r.cd_modalidade),
        cdConvenio: r.cd_convenio === null ? null : Number(r.cd_convenio),
        cdProcedimento: r.cd_procedimento === null ? null : Number(r.cd_procedimento),
        tipo: r.tipo,
      }
    }).filter(l => l.cdMedico === null || !cfg.medicosExcluidos.includes(l.cdMedico))

    // Mínimo de laudos do médico na modalidade, contados nos últimos 90 dias. Revisão/retificação não é cortada.
    const par = (l: { cdMedico: number | null; cdModalidade: number | null }) => `${l.cdMedico ?? '-'}|${l.cdModalidade ?? '-'}`
    const abaixo = new Set(volume ? base.filter(l => l.tipo === 'laudo' && (volume.get(par(l)) ?? 0) < cfg.minimoExames).map(par) : [])
    const dentro = base.filter(l => l.tipo !== 'laudo' || !abaixo.has(par(l)))
    const laudados = dentro.filter(l => l.tipo === 'laudo' && l.finalizado)

    const [medicos, modalidades, convenios, procedimentos, pacientes] = await Promise.all([
      nomes('medicos', unicos(dentro.flatMap(l => [l.cdMedico, l.cdMedicoExame]))),
      nomes('modalidades', unicos(dentro.map(l => l.cdModalidade))),
      nomes('fornecedores', unicos(dentro.map(l => l.cdConvenio))),
      nomes('procedimentos', unicos(dentro.map(l => l.cdProcedimento))),
      // Nome do paciente só onde a tela lista exames: revisões, retificações e atrasados.
      (async () => {
        const ids = unicos(dentro.filter(l => l.tipo !== 'laudo' || (l.atrasoHoras ?? 0) > 0).map(l => l.cdPaciente))
        if (!ids.length) return {}
        const r = await prisma.$queryRaw<Array<{ id: number; nome: string }>>`SELECT cd_paciente AS id, TRIM(ds_paciente) AS nome FROM pacientes WHERE cd_paciente = ANY(${ids}::int[])`
        return Object.fromEntries(r.map(x => [Number(x.id), x.nome]))
      })(),
    ])

    return {
      periodo: { inicio, fim },
      config: { minimoExames: cfg.minimoExames, revisao: cfg.procedimentosRevisao.length, retificacao: cfg.procedimentosRetificacao.length },
      foraPeloMinimo: { exames: base.length - dentro.length, pares: abaixo.size },
      // Laudos sem H. Saída no atendimento: contam, mas ficam sem tempo de laudo.
      semSaida: laudados.filter(l => l.realizado === null).length,
      nomes: { medicos, modalidades, convenios, procedimentos, pacientes },
      linhas: dentro,
      atualizadoEm: new Date().toISOString(),
    }
  })
}
