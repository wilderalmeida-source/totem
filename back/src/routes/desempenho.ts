import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { norm } from './dashboard'
import { lerConfigAnalise, type ConfigAnalise } from '../lib/config-analises'

// Tela "Desempenho": tempo de ficha da recepção (Atendimento) e da marcação (Agendamento),
// por convênio, funcionário e médico. Devolve uma linha por ficha; a tela agrega e filtra no navegador,
// o que permite trocar a visão com cliques sem nova consulta.
//
// Atendimento (senha B): chamada no guichê (atendimentos_senhas.dt_saida) → atendimentos.dt_hora_ficha.
//   Uma linha por atendimento (exame) do paciente no dia cuja ficha saiu até 4 h depois da chamada.
//   Funcionário = cd_funcionario_recepcao; médico = cd_medico; atraso = ficha − horário marcado (dt_hora).
// Agendamento (senha D): chamada no guichê → último atendimentos.dt_hora_log gravado pela marcação
//   (cd_funcionario_marcacao) para o paciente até 3 h depois da chamada. Uma linha por senha.
// Convênio = fornecedor do plano do primeiro exame do atendimento (exames.cd_plano → planos → fornecedores).

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({
  inicio: dataIso,
  fim: dataIso,
  setor: z.enum(['atendimento', 'agendamento']).default('atendimento'),
}).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 92) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nesta tela o período máximo é de 3 meses.' })
})

export const FICHA_MAXIMA_MIN = 240

type Linha = {
  id: number; cd_atendimento: number; data: string; hora_senha: string; hora_chamada: string; hora_fim: string; hora_marcada: string | null
  espera: number; ficha: number; atraso: number | null; chegou_no_horario: boolean | null; exames: number
  cd_funcionario: number | null; funcionario: string | null; cd_medico: number | null; medico: string | null
  cd_convenio: number | null; convenio: string | null; modalidade: string; cd_paciente: number | null; paciente: string | null
  preferencial: boolean; cd_modalidade: number | null; cd_modalidade_sala: number | null; cd_modalidade_fila: number | null
}

export function senhasCte(inicio: string, fim: string, opcao: 'B' | 'D') {
  const condicao = opcao === 'D' ? Prisma.sql`TRIM(s.ds_opcao) = 'D'` : Prisma.sql`TRIM(s.ds_opcao) NOT IN ('C', 'D')`
  return Prisma.sql`
    senhas AS (
      SELECT s.cd_senha, s.dt_entrada, s.dt_saida, s.ds_local, s.cd_funcionario AS cd_funcionario_senha, COALESCE(s.sn_preferencial, false) AS preferencial, pac.cd_paciente
      FROM atendimentos_senhas s
      JOIN LATERAL (
        SELECT at.cd_paciente FROM atendimentos at
        WHERE at.cd_senha = s.cd_senha AND at.cd_paciente IS NOT NULL
        ORDER BY at.cd_atendimento LIMIT 1
      ) pac ON true
      WHERE s.dt_entrada >= ${inicio}::date
        AND s.dt_entrada < (${fim}::date + 1)
        AND s.dt_saida IS NOT NULL
        AND s.ds_opcao IS NOT NULL
        AND ${condicao}
    )`
}

// Colunas comuns de exibição a partir de um atendimento "a" e da senha "x".
// Modalidade: a da sala, a menos que seja "tipo TOTEM" (configuração); aí vale a fila escolhida no totem (mf).
export const colunasComuns = (totem: number[]) => Prisma.sql`
  fu.cd_funcionario, TRIM(fu.ds_funcionario) AS funcionario,
  md.cd_medico, TRIM(md.ds_medico) AS medico,
  conv.cd_fornecedor AS cd_convenio, TRIM(conv.ds_fornecedor) AS convenio,
  COALESCE(
    CASE WHEN m.cd_modalidade <> ALL(${totem}::int[]) THEN TRIM(m.ds_modalidade) END,
    CASE WHEN mf.cd_modalidade <> ALL(${totem}::int[]) THEN TRIM(mf.ds_modalidade) END,
    CASE WHEN mf.cd_modalidade IS NULL THEN NULLIF(TRIM(x.ds_local), '') END,
    'Não identificada'
  ) AS modalidade,
  m.cd_modalidade AS cd_modalidade_sala,
  mf.cd_modalidade AS cd_modalidade_fila,
  COALESCE(
    CASE WHEN m.cd_modalidade <> ALL(${totem}::int[]) THEN m.cd_modalidade END,
    CASE WHEN mf.cd_modalidade <> ALL(${totem}::int[]) THEN mf.cd_modalidade END
  ) AS cd_modalidade,
  x.cd_paciente, TRIM(p.ds_paciente) AS paciente, x.preferencial`

export const joinsComuns = (colFuncionario: string) => Prisma.sql`
  LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
  LEFT JOIN modalidades m ON m.cd_modalidade = sl.cd_modalidade
  LEFT JOIN LATERAL (
    SELECT ml.cd_modalidade, ml.ds_modalidade FROM modalidades ml
    WHERE ${norm('ml.ds_modalidade')} = ${norm('x.ds_local')}
       OR (length(${norm('x.ds_local')}) >= 6 AND ${norm('ml.ds_modalidade')} LIKE ${norm('x.ds_local')} || '%')
    ORDER BY (${norm('ml.ds_modalidade')} = ${norm('x.ds_local')}) DESC, ml.cd_modalidade
    LIMIT 1
  ) mf ON true
  LEFT JOIN funcionarios fu ON fu.cd_funcionario = ${Prisma.raw(colFuncionario)}
  LEFT JOIN medicos md ON md.cd_medico = a.cd_medico
  LEFT JOIN pacientes p ON p.cd_paciente = x.cd_paciente
  LEFT JOIN LATERAL (
    SELECT fo.cd_fornecedor, fo.ds_fornecedor
    FROM exames e
    JOIN planos pl ON pl.cd_plano = e.cd_plano
    LEFT JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor
    WHERE e.cd_atendimento = a.cd_atendimento
    ORDER BY e.cd_exame LIMIT 1
  ) conv ON true`

// Exclusões da tela "Configurar analíticos", por ID: modalidade (da sala, da fila ou efetiva), médico e convênio.
export type ColunasFiltro = { cd_modalidade: number | null; cd_modalidade_sala: number | null; cd_modalidade_fila: number | null; cd_medico: number | null; cd_convenio: number | null }
export function dentroDaAnalise(cfg: ConfigAnalise) {
  const mod = new Set(cfg.modalidadesExcluidas)
  const med = new Set(cfg.medicosExcluidos)
  const conv = new Set(cfg.conveniosExcluidos)
  const tem = (s: Set<number>, v: number | null) => v !== null && s.has(Number(v))
  return (r: ColunasFiltro) => !tem(mod, r.cd_modalidade) && !tem(mod, r.cd_modalidade_sala) && !tem(mod, r.cd_modalidade_fila)
    && !tem(med, r.cd_medico) && !tem(conv, r.cd_convenio)
}

// Atendimentos (exames) cuja ficha saiu até 4 h depois da chamada da senha do paciente no mesmo dia.
export const fichasCte = Prisma.sql`
    fichas AS (
      SELECT DISTINCT ON (a.cd_atendimento) a.cd_atendimento, sn.*
      FROM senhas sn
      JOIN atendimentos a ON a.cd_paciente = sn.cd_paciente
        AND a.dt_data = sn.dt_entrada::date
        AND a.dt_hora_ficha IS NOT NULL
        AND (a.dt_data + a.dt_hora_ficha) >= sn.dt_saida
        AND (a.dt_data + a.dt_hora_ficha) <= sn.dt_saida + interval '4 hours'
      ORDER BY a.cd_atendimento, sn.dt_saida DESC
    )`

async function fichasAtendimento(inicio: string, fim: string, totem: number[]) {
  return prisma.$queryRaw<Linha[]>`
    WITH ${senhasCte(inicio, fim, 'B')}, ${fichasCte}
    SELECT
      a.cd_atendimento AS id,
      a.cd_atendimento,
      to_char(x.dt_entrada, 'YYYY-MM-DD') AS data,
      to_char(x.dt_entrada, 'HH24:MI') AS hora_senha,
      to_char(x.dt_saida, 'HH24:MI') AS hora_chamada,
      to_char(a.dt_hora_ficha, 'HH24:MI') AS hora_fim,
      to_char(a.dt_hora, 'HH24:MI') AS hora_marcada,
      EXTRACT(EPOCH FROM (x.dt_saida - x.dt_entrada)) / 60.0 AS espera,
      EXTRACT(EPOCH FROM ((a.dt_data + a.dt_hora_ficha) - x.dt_saida)) / 60.0 AS ficha,
      CASE WHEN a.dt_hora IS NOT NULL THEN EXTRACT(EPOCH FROM (a.dt_hora_ficha - a.dt_hora)) / 60.0 END AS atraso,
      CASE WHEN a.dt_hora IS NOT NULL THEN x.dt_entrada <= (a.dt_data + a.dt_hora) END AS chegou_no_horario,
      1 AS exames,
      ${colunasComuns(totem)}
    FROM fichas x
    JOIN atendimentos a ON a.cd_atendimento = x.cd_atendimento
    ${joinsComuns('a.cd_funcionario_recepcao')}
    WHERE EXTRACT(EPOCH FROM ((a.dt_data + a.dt_hora_ficha) - x.dt_saida)) / 60.0 <= ${FICHA_MAXIMA_MIN}
  `
}

async function fichasAgendamento(inicio: string, fim: string, totem: number[]) {
  return prisma.$queryRaw<Linha[]>`
    WITH ${senhasCte(inicio, fim, 'D')},
    marcacoes AS (
      SELECT sn.cd_senha, MAX(a.dt_hora_log) AS fim, MIN(a.cd_atendimento) AS primeiro, COUNT(*)::int AS exames,
             mode() WITHIN GROUP (ORDER BY a.cd_funcionario_marcacao) AS cd_funcionario_marcacao
      FROM senhas sn
      JOIN atendimentos a ON a.cd_paciente = sn.cd_paciente
        AND a.cd_funcionario_marcacao IS NOT NULL
        AND a.dt_hora_log >= sn.dt_saida
        AND a.dt_hora_log < sn.dt_saida + interval '3 hours'
      GROUP BY sn.cd_senha
    )
    SELECT
      x.cd_senha AS id,
      mc.primeiro AS cd_atendimento,
      to_char(x.dt_entrada, 'YYYY-MM-DD') AS data,
      to_char(x.dt_entrada, 'HH24:MI') AS hora_senha,
      to_char(x.dt_saida, 'HH24:MI') AS hora_chamada,
      to_char(mc.fim, 'HH24:MI') AS hora_fim,
      NULL::text AS hora_marcada,
      EXTRACT(EPOCH FROM (x.dt_saida - x.dt_entrada)) / 60.0 AS espera,
      EXTRACT(EPOCH FROM (mc.fim - x.dt_saida)) / 60.0 AS ficha,
      NULL::float AS atraso,
      NULL::boolean AS chegou_no_horario,
      mc.exames,
      ${colunasComuns(totem)}
    FROM senhas x
    JOIN marcacoes mc ON mc.cd_senha = x.cd_senha
    JOIN atendimentos a ON a.cd_atendimento = mc.primeiro
    ${joinsComuns('mc.cd_funcionario_marcacao')}
    WHERE EXTRACT(EPOCH FROM (mc.fim - x.dt_saida)) / 60.0 <= ${FICHA_MAXIMA_MIN}
  `
}

// Senhas chamadas sem ficha/marcação encontrada: ajuda a entender o que ficou fora da análise.
async function semRegistro(inicio: string, fim: string, setor: 'atendimento' | 'agendamento') {
  const [row] = setor === 'atendimento'
    ? await prisma.$queryRaw<Array<{ n: bigint }>>`
        WITH ${senhasCte(inicio, fim, 'B')}
        SELECT COUNT(*) AS n FROM senhas sn
        WHERE NOT EXISTS (
          SELECT 1 FROM atendimentos a
          WHERE a.cd_paciente = sn.cd_paciente AND a.dt_data = sn.dt_entrada::date AND a.dt_hora_ficha IS NOT NULL
            AND (a.dt_data + a.dt_hora_ficha) BETWEEN sn.dt_saida AND sn.dt_saida + interval '4 hours'
        )`
    : await prisma.$queryRaw<Array<{ n: bigint }>>`
        WITH ${senhasCte(inicio, fim, 'D')}
        SELECT COUNT(*) AS n FROM senhas sn
        WHERE NOT EXISTS (
          SELECT 1 FROM atendimentos a
          WHERE a.cd_paciente = sn.cd_paciente AND a.cd_funcionario_marcacao IS NOT NULL
            AND a.dt_hora_log >= sn.dt_saida AND a.dt_hora_log < sn.dt_saida + interval '3 hours'
        )`
  return Number(row?.n ?? 0)
}

const arred = (n: number | null) => (n === null ? null : Math.round(Number(n) * 10) / 10)

export async function desempenhoRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/desempenho', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, setor } = parsed.data

    const cfg = await lerConfigAnalise('desempenho')
    const [todas, foraDaAnalise] = await Promise.all([
      setor === 'atendimento' ? fichasAtendimento(inicio, fim, cfg.modalidadesTotem) : fichasAgendamento(inicio, fim, cfg.modalidadesTotem),
      semRegistro(inicio, fim, setor),
    ])

    const rows = todas.filter(dentroDaAnalise(cfg))
    const linhas = rows
      .filter(r => Number(r.ficha) >= 0)
      .map(r => ({
        id: Number(r.id),
        cdAtendimento: Number(r.cd_atendimento),
        data: r.data,
        horaSenha: r.hora_senha,
        horaChamada: r.hora_chamada,
        horaFim: r.hora_fim,
        horaMarcada: r.hora_marcada,
        espera: arred(Math.max(0, Number(r.espera)))!,
        ficha: arred(Number(r.ficha))!,
        atraso: arred(r.atraso),
        chegouNoHorario: r.chegou_no_horario,
        exames: Number(r.exames) || 1,
        cdFuncionario: r.cd_funcionario,
        funcionario: r.funcionario || null,
        cdMedico: r.cd_medico,
        medico: r.medico || null,
        cdConvenio: r.cd_convenio,
        convenio: r.convenio || null,
        modalidade: r.modalidade,
        cdPaciente: r.cd_paciente,
        paciente: r.paciente || null,
        preferencial: Boolean(r.preferencial),
      }))

    return { setor, periodo: { inicio, fim }, foraDaAnalise, linhas, atualizadoEm: new Date().toISOString() }
  })
}
