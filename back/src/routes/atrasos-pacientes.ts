import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { PrismaLog } from '../../config/prismalog'
import { lerConfigAnalise, type ConfigAnalise } from '../lib/config-analises'

// Atraso dos pacientes (aba da tela Desempenho).
// Uma linha por paciente por dia, pelo primeiro exame marcado do dia que teve ficha (o paciente veio).
//   Chegada prevista = horário do exame (dt_hora) − antecedência da sala (salas.dt_hora_chegada), a mesma regra
//   da tela do totem. Entrada = menor H. Entrada (atendimentos.dt_hora_entrada) do paciente no dia; sem ela,
//   a hora em que tirou a senha de atendimento no totem.
//   Atraso = entrada − chegada prevista (positivo = chegou depois). A tela aplica a tolerância.

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({ inicio: dataIso, fim: dataIso }).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 92) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nesta tela o período máximo é de 3 meses.' })
})

// Diferenças acima disso são dado inconsistente (ex.: entrada de outro dia), não atraso.
const LIMITE_MIN = 12 * 60

// Modalidades, médicos e convênios fora desta análise vêm da tela "Configurar analíticos"
// (padrão: TOTEM, MIGRAÇÃO e Raio-X — por ordem de chegada — e o médico e-Laudos, de laudo à distância).

type Linha = {
  cd_atendimento: number; data: string; hora_exame: string; hora_chegada: string; hora_entrada: string | null
  antecedencia: number; atraso: number | null; atraso_exame: number | null; fonte: 'clinux' | 'totem' | null
  cd_medico: number | null; medico: string | null; cd_convenio: number | null; convenio: string | null
  modalidade: string | null; cd_paciente: number; paciente: string | null
}

async function linhas(inicio: string, fim: string, cfg: ConfigAnalise) {
  return prisma.$queryRaw<Linha[]>`
    WITH primeiro AS (
      SELECT DISTINCT ON (a.cd_paciente, a.dt_data)
        a.cd_atendimento, a.cd_paciente, a.dt_data, a.dt_hora, a.cd_medico, a.cd_sala,
        (a.dt_data + a.dt_hora) AS exame,
        (a.dt_data + a.dt_hora) - COALESCE(sl.dt_hora_chegada, '00:00'::time)::interval AS chegada,
        EXTRACT(EPOCH FROM COALESCE(sl.dt_hora_chegada, '00:00'::time)::interval) / 60.0 AS antecedencia,
        TRIM(m.ds_modalidade) AS modalidade
      FROM atendimentos a
      LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
      LEFT JOIN modalidades m ON m.cd_modalidade = sl.cd_modalidade
      WHERE a.dt_data >= ${inicio}::date AND a.dt_data <= ${fim}::date
        AND a.dt_hora IS NOT NULL
        AND a.cd_paciente IS NOT NULL
        AND a.dt_hora_ficha IS NOT NULL
        AND COALESCE(sl.cd_modalidade, 0) <> ALL(${cfg.modalidadesExcluidas}::int[])
        AND COALESCE(a.cd_medico, 0) <> ALL(${cfg.medicosExcluidos}::int[])
        AND (cardinality(${cfg.conveniosExcluidos}::int[]) = 0 OR NOT EXISTS (
          SELECT 1 FROM exames ex JOIN planos px ON px.cd_plano = ex.cd_plano
          WHERE ex.cd_atendimento = a.cd_atendimento AND px.cd_fornecedor = ANY(${cfg.conveniosExcluidos}::int[])
        ))
      ORDER BY a.cd_paciente, a.dt_data, (a.dt_data + a.dt_hora) - COALESCE(sl.dt_hora_chegada, '00:00'::time)::interval, a.cd_atendimento
    ),
    com_entrada AS (
      SELECT p.*, COALESCE(e.entrada_clinux, e.entrada_totem) AS entrada,
        CASE WHEN e.entrada_clinux IS NOT NULL THEN 'clinux' WHEN e.entrada_totem IS NOT NULL THEN 'totem' END AS fonte
      FROM primeiro p
      LEFT JOIN LATERAL (
        SELECT
          MIN(a2.dt_data + a2.dt_hora_entrada) AS entrada_clinux,
          MIN(s.dt_entrada) FILTER (WHERE TRIM(s.ds_opcao) NOT IN ('C', 'D') AND s.dt_entrada::date = p.dt_data) AS entrada_totem
        FROM atendimentos a2
        LEFT JOIN atendimentos_senhas s ON s.cd_senha = a2.cd_senha
        WHERE a2.cd_paciente = p.cd_paciente AND a2.dt_data = p.dt_data
      ) e ON true
    )
    SELECT
      c.cd_atendimento,
      to_char(c.dt_data, 'YYYY-MM-DD') AS data,
      to_char(c.exame, 'HH24:MI') AS hora_exame,
      to_char(c.chegada, 'HH24:MI') AS hora_chegada,
      to_char(c.entrada, 'HH24:MI') AS hora_entrada,
      c.antecedencia,
      EXTRACT(EPOCH FROM (c.entrada - c.chegada)) / 60.0 AS atraso,
      EXTRACT(EPOCH FROM (c.entrada - c.exame)) / 60.0 AS atraso_exame,
      c.fonte,
      md.cd_medico, TRIM(md.ds_medico) AS medico,
      conv.cd_fornecedor AS cd_convenio, TRIM(conv.ds_fornecedor) AS convenio,
      c.modalidade,
      c.cd_paciente, TRIM(pa.ds_paciente) AS paciente
    FROM com_entrada c
    LEFT JOIN medicos md ON md.cd_medico = c.cd_medico
    LEFT JOIN pacientes pa ON pa.cd_paciente = c.cd_paciente
    LEFT JOIN LATERAL (
      SELECT fo.cd_fornecedor, fo.ds_fornecedor
      FROM exames e
      JOIN planos pl ON pl.cd_plano = e.cd_plano
      LEFT JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor
      WHERE e.cd_atendimento = c.cd_atendimento
      ORDER BY e.cd_exame LIMIT 1
    ) conv ON true
  `
}

const arred = (n: number) => Math.round(n * 10) / 10

export async function atrasosPacientesRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/atrasos-pacientes', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim } = parsed.data

    const cfg = await lerConfigAnalise('atrasos')
    const [rows, config] = await Promise.all([
      linhas(inicio, fim, cfg),
      PrismaLog.configuracao_atraso.findUnique({ where: { id: 1 } }).catch(() => null),
    ])

    const validas = rows.filter(r => r.atraso !== null && Math.abs(Number(r.atraso)) <= LIMITE_MIN)
    return {
      periodo: { inicio, fim },
      toleranciaPadrao: config?.toleranciaMinutos ?? 0,
      semEntrada: rows.filter(r => r.atraso === null).length,
      inconsistentes: rows.length - validas.length - rows.filter(r => r.atraso === null).length,
      linhas: validas.map(r => ({
        id: Number(r.cd_atendimento),
        cdAtendimento: Number(r.cd_atendimento),
        data: r.data,
        horaExame: r.hora_exame,
        horaChegada: r.hora_chegada,
        horaEntrada: r.hora_entrada ?? '',
        antecedencia: Math.round(Number(r.antecedencia)),
        atraso: arred(Number(r.atraso)),
        atrasoExame: arred(Number(r.atraso_exame)),
        fonte: r.fonte ?? 'clinux',
        cdMedico: r.cd_medico,
        medico: r.medico || null,
        cdConvenio: r.cd_convenio,
        convenio: r.convenio || null,
        modalidade: r.modalidade || 'Não identificada',
        cdPaciente: Number(r.cd_paciente),
        paciente: r.paciente || null,
      })),
      atualizadoEm: new Date().toISOString(),
    }
  })
}
