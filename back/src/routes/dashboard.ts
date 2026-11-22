import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { calcularEspera, type EsperaRegistro } from '../lib/dashboard-espera'
import { lerConfigAnalise } from '../lib/config-analises'

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Atendimento, Agendamento e Entrega de resultados são setores diferentes: nunca são somados.
// Códigos do totem (ds_opcao): B = Atendimento, D = Agendar exames, C = Entrega de exames.
const filtrosBase = z.object({
  inicio: dataIso,
  fim: dataIso,
  modalidade: z.coerce.number().int().positive().optional(),
  servico: z.enum(['atendimento', 'agendamento', 'entrega']).default('atendimento'),
})
function validarPeriodo(f: { inicio: string; fim: string }, ctx: z.RefinementCtx) {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 366) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Período máximo: 1 ano.' })
}

const filtros = filtrosBase.extend({ meta: z.coerce.number().int().min(1).max(240).default(15) }).superRefine(validarPeriodo)
const filtrosDetalhe = filtrosBase.extend({
  diaSemana: z.coerce.number().int().min(0).max(6), // 0 = domingo
  hora: z.coerce.number().int().min(0).max(23),
}).superRefine(validarPeriodo)

type Filtros = {
  inicio: string; fim: string; modalidade: number | null; servico: 'atendimento' | 'agendamento' | 'entrega'
  totem: number[]       // modalidades que não são de verdade (ex.: TOTEM): descobre pela fila
  excluidas: number[]   // modalidades fora da análise
}

// Modalidades "tipo TOTEM" e excluídas vêm da tela "Configurar analíticos" (lib/config-analises.ts), por ID.

// Esperas acima disso indicam senha finalizada muito depois (ex.: no dia seguinte) e ficam de fora.
const ESPERA_MAXIMA_MIN = 600

// Normaliza o nome: maiúsculas, sem acento e só letras/números (ignora espaços, inclusive os "invisíveis").
export const norm = (coluna: string) => Prisma.raw(`regexp_replace(translate(UPPER(${coluna}), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g')`)

// Mesmo critério do histórico da tela inicial:
// - espera = atendimentos_senhas.dt_entrada (senha emitida) até dt_saida ("Aguardando" → "Atendido"/"Entregue");
// - Entrega = ds_opcao 'C' (paciente via nr_controle = cd_atendimento); Atendimento = demais (via atendimentos.cd_senha);
// - agrupado por paciente no dia (paciente → atendimento → senha), mantendo a senha mais recente.
// Modalidade efetiva, na ordem: a da senha (nr_modalidade); a "Fila" da senha (ds_local, nome da modalidade escolhida
// na tela do totem) cruzada com o cadastro de modalidades; a sala do exame vinculado; por fim o próprio texto da fila.
// Modalidades "tipo TOTEM" (configuração) nunca são a modalidade efetiva — sala TOTEM + fila MAMOGRAFIA conta como MAMOGRAFIA.
// Fica fora quem tem modalidade excluída na senha, na fila ou como modalidade efetiva.
// ds_local tem 32 caracteres: nomes longos chegam cortados, então o cruzamento também aceita o começo do nome.
export function ctes(f: Filtros) {
  return Prisma.sql`
    WITH base0 AS (
      SELECT
        s.dt_entrada, s.dt_saida, s.sn_preferencial, s.ds_fila, s.nr_senha,
        COALESCE(ae.cd_paciente, aa.cd_paciente) AS cd_paciente,
        CASE WHEN ml.cd_modalidade = ANY(${f.totem}::int[]) THEN NULL ELSE NULLIF(TRIM(s.ds_local), '') END AS fila,
        mb.cd_modalidade AS cd_modalidade_senha, ml.cd_modalidade AS cd_modalidade_fila,
        COALESCE('p' || COALESCE(ae.cd_paciente, aa.cd_paciente), 'a' || COALESCE(ae.cd_atendimento, aa.cd_atendimento), 's' || s.cd_senha) AS chave,
        COALESCE(
          CASE WHEN mb.cd_modalidade <> ALL(${f.totem}::int[]) THEN mb.cd_modalidade END,
          CASE WHEN ml.cd_modalidade <> ALL(${f.totem}::int[]) THEN ml.cd_modalidade END,
          CASE WHEN me.cd_modalidade <> ALL(${f.totem}::int[]) THEN me.cd_modalidade END,
          CASE WHEN aa.cd_modalidade <> ALL(${f.totem}::int[]) THEN aa.cd_modalidade END
        ) AS cd_modalidade
      FROM atendimentos_senhas s
      LEFT JOIN modalidades mb ON mb.cd_modalidade = s.nr_modalidade
      LEFT JOIN LATERAL (
        SELECT ml.cd_modalidade FROM modalidades ml
        WHERE (${norm('ml.ds_modalidade')} = ${norm('s.ds_local')}
               OR (length(${norm('s.ds_local')}) >= 6 AND ${norm('ml.ds_modalidade')} LIKE ${norm('s.ds_local')} || '%'))
        ORDER BY (${norm('ml.ds_modalidade')} = ${norm('s.ds_local')}) DESC, (ml.cd_modalidade = ANY(${f.totem}::int[])), ml.cd_modalidade
        LIMIT 1
      ) ml ON true
      LEFT JOIN atendimentos ae ON s.ds_opcao = 'C' AND ae.cd_atendimento = s.nr_controle
      LEFT JOIN salas se ON se.cd_sala = ae.cd_sala
      LEFT JOIN modalidades me ON me.cd_modalidade = se.cd_modalidade
      LEFT JOIN LATERAL (
        SELECT at.cd_paciente, at.cd_atendimento, mx.cd_modalidade
        FROM atendimentos at
        LEFT JOIN salas sx ON sx.cd_sala = at.cd_sala
        LEFT JOIN modalidades mx ON mx.cd_modalidade = sx.cd_modalidade
        WHERE s.ds_opcao <> 'C' AND at.cd_senha = s.cd_senha
        ORDER BY (mx.cd_modalidade IS NULL OR mx.cd_modalidade = ANY(${f.totem}::int[])), at.cd_atendimento
        LIMIT 1
      ) aa ON true
      WHERE s.dt_entrada >= ${f.inicio}::date
        AND s.dt_entrada < (${f.fim}::date + 1)
        AND s.ds_opcao IS NOT NULL
        AND (CASE TRIM(s.ds_opcao) WHEN 'C' THEN 'entrega' WHEN 'D' THEN 'agendamento' ELSE 'atendimento' END) = ${f.servico}
    ),
    base AS (
      SELECT b.*, COALESCE(NULLIF(TRIM(mf.ds_modalidade), ''), b.fila, 'Não identificada') AS modalidade
      FROM base0 b
      LEFT JOIN modalidades mf ON mf.cd_modalidade = b.cd_modalidade
      WHERE (${f.modalidade}::int IS NULL OR b.cd_modalidade = ${f.modalidade}::int)
        AND COALESCE(b.cd_modalidade, 0) <> ALL(${f.excluidas}::int[])
        AND COALESCE(b.cd_modalidade_senha, 0) <> ALL(${f.excluidas}::int[])
        AND COALESCE(b.cd_modalidade_fila, 0) <> ALL(${f.excluidas}::int[])
    ),
    finalizadas AS (
      SELECT * FROM (
        SELECT DISTINCT ON (b.dt_entrada::date, b.chave)
          b.cd_paciente,
          to_char(b.dt_entrada, 'YYYY-MM-DD') AS data,
          to_char(b.dt_entrada, 'HH24:MI:SS') AS hora_senha,
          to_char(b.dt_saida, 'HH24:MI') AS hora_saida,
          EXTRACT(DOW FROM b.dt_entrada)::int AS dia_semana,
          EXTRACT(HOUR FROM b.dt_entrada)::int AS hora,
          EXTRACT(EPOCH FROM (b.dt_saida - b.dt_entrada)) / 60.0 AS minutos,
          b.modalidade,
          COALESCE(b.sn_preferencial, false) AS preferencial,
          CASE WHEN b.sn_preferencial THEN 'P' ELSE 'N' END || COALESCE(TRIM(b.ds_fila), '') || '-' || COALESCE(b.nr_senha::text, '?') AS senha
        FROM base b
        WHERE b.dt_saida IS NOT NULL
        ORDER BY b.dt_entrada::date, b.chave, b.dt_entrada DESC
      ) x
      WHERE x.minutos >= 0 AND x.minutos <= ${ESPERA_MAXIMA_MIN}
    )`
}

type Linha = {
  cd_paciente: number | null; data: string | null; hora_senha: string | null; minutos: number | null
  modalidade: string | null; preferencial: boolean | null; senha: string | null; pendentes: bigint
}

async function buscarEsperas(f: Filtros) {
  const rows = await prisma.$queryRaw<Linha[]>`
    ${ctes(f)},
    pendentes AS (
      SELECT COUNT(DISTINCT (b.dt_entrada::date, b.chave)) AS n FROM base b WHERE b.dt_saida IS NULL
    )
    SELECT f.cd_paciente, f.data, f.hora_senha, f.minutos, f.modalidade, f.preferencial, f.senha, p.n AS pendentes
    FROM pendentes p
    LEFT JOIN finalizadas f ON true
  `
  const registros: EsperaRegistro[] = rows
    .filter(r => r.data && r.hora_senha && r.minutos !== null)
    .map(r => ({
      data: r.data!,
      horaSenha: r.hora_senha!,
      minutos: Number(r.minutos),
      modalidade: r.modalidade ?? 'Não identificada',
      preferencial: Boolean(r.preferencial),
      senha: r.senha,
      cdPaciente: r.cd_paciente,
    }))
  return { registros, pendentes: Number(rows[0]?.pendentes ?? 0) }
}

type LinhaDetalhe = {
  cd_paciente: number | null; paciente: string | null; data: string; hora_senha: string; hora_saida: string
  minutos: number; modalidade: string; preferencial: boolean; senha: string
}

function deslocar(data: string, dias: number) {
  const d = new Date(`${data}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Resultados vistos pela internet (portal do Clinux): web_resultados grava cada acesso, com sn_paciente
// quando foi o próprio paciente (e não o médico solicitante). Conta pacientes distintos no período,
// pela modalidade da sala do atendimento (mesmo filtro e exclusões da tela).
async function acessosWeb(inicio: string, fim: string, modalidade: number | null, excluidas: number[]) {
  const [row] = await prisma.$queryRaw<Array<{ pacientes: bigint; acessos: bigint; atendimentos: bigint }>>`
    SELECT COUNT(DISTINCT a.cd_paciente) AS pacientes, COUNT(*) AS acessos, COUNT(DISTINCT r.cd_atendimento) AS atendimentos
    FROM web_resultados r
    JOIN atendimentos a ON a.cd_atendimento = r.cd_atendimento
    LEFT JOIN salas sl ON sl.cd_sala = a.cd_sala
    LEFT JOIN exames e ON e.cd_exame = r.cd_exame
    LEFT JOIN procedimentos pr ON pr.cd_procedimento = e.cd_procedimento
    WHERE r.dt_data >= ${inicio}::date AND r.dt_data < (${fim}::date + 1)
      -- Só exclui acessos marcados explicitamente como não sendo do paciente (o Clinux pode deixar o campo vazio).
      AND r.sn_paciente IS NOT FALSE
      -- Modalidade do exame visto; sem exame, a da sala. Sem modalidade identificada, o acesso conta.
      AND (${modalidade}::int IS NULL OR COALESCE(pr.cd_modalidade, sl.cd_modalidade) = ${modalidade}::int)
      AND (COALESCE(pr.cd_modalidade, sl.cd_modalidade) IS NULL OR COALESCE(pr.cd_modalidade, sl.cd_modalidade) <> ALL(${excluidas}::int[]))`
  return { pacientes: Number(row?.pacientes ?? 0), acessos: Number(row?.acessos ?? 0), atendimentos: Number(row?.atendimentos ?? 0) }
}

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/espera', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, modalidade, meta, servico } = parsed.data

    // Período anterior com a mesma duração, para comparação nos indicadores.
    const dias = Math.round((Date.parse(fim) - Date.parse(inicio)) / 86_400_000) + 1
    const antFim = deslocar(inicio, -1)
    const antInicio = deslocar(inicio, -dias)

    const mod = modalidade ?? null
    const { modalidadesTotem: totem, modalidadesExcluidas: excluidas } = await lerConfigAnalise('espera')
    const ocultas = [...totem, ...excluidas]
    const [atual, anterior, modalidades] = await Promise.all([
      buscarEsperas({ inicio, fim, modalidade: mod, servico, totem, excluidas }),
      buscarEsperas({ inicio: antInicio, fim: antFim, modalidade: mod, servico, totem, excluidas }),
      prisma.$queryRaw<Array<{ cd_modalidade: number; ds_modalidade: string }>>`
        SELECT m.cd_modalidade, m.ds_modalidade
        FROM modalidades m
        WHERE m.cd_modalidade <> ALL(${ocultas}::int[])
        ORDER BY m.ds_modalidade`,
    ])

    const resultado = calcularEspera(atual.registros, anterior.registros, { inicio, fim, metaMinutos: meta, pendentes: atual.pendentes })

    // Só na Entrega de resultados. Se a tabela não existir nesta versão do Clinux, o card não aparece.
    let web: { pacientes: number; acessos: number; atendimentos: number; variacao: number | null } | null = null
    if (servico === 'entrega') {
      try {
        const [w, wAnt] = await Promise.all([acessosWeb(inicio, fim, mod, excluidas), acessosWeb(antInicio, antFim, mod, excluidas)])
        web = { ...w, variacao: wAnt.pacientes ? Math.round(((w.pacientes - wAnt.pacientes) / wAnt.pacientes) * 1000) / 10 : null }
      } catch (err) {
        request.log.warn({ err }, 'web_resultados indisponível')
      }
    }

    // Nomes só das 10 maiores esperas (a tela é restrita a usuários com a permissão DASHBOARD).
    const ids = [...new Set(resultado.maioresEsperas.map(e => e.cdPaciente).filter((id): id is number => id !== null))]
    const nomes = ids.length
      ? new Map((await prisma.$queryRaw<Array<{ cd_paciente: number; ds_paciente: string }>>`
          SELECT cd_paciente, TRIM(ds_paciente) AS ds_paciente FROM pacientes WHERE cd_paciente = ANY(${ids}::int[])`
        ).map(p => [p.cd_paciente, p.ds_paciente]))
      : new Map<number, string>()

    return {
      ...resultado,
      maioresEsperas: resultado.maioresEsperas.map(e => ({ ...e, paciente: e.cdPaciente !== null ? nomes.get(e.cdPaciente) ?? null : null })),
      periodoAnterior: { inicio: antInicio, fim: antFim },
      servico,
      web,
      modalidades: modalidades.map(m => ({ id: m.cd_modalidade, nome: m.ds_modalidade.trim() })),
      atualizadoEm: new Date().toISOString(),
    }
  })

  // Pacientes de uma célula do mapa de calor (dia da semana x hora), da maior para a menor espera.
  fastify.get('/clinux/dashboard/espera/detalhes', async (request, reply) => {
    const parsed = filtrosDetalhe.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim, modalidade, servico, diaSemana, hora } = parsed.data

    const { modalidadesTotem: totem, modalidadesExcluidas: excluidas } = await lerConfigAnalise('espera')
    const rows = await prisma.$queryRaw<LinhaDetalhe[]>`
      ${ctes({ inicio, fim, modalidade: modalidade ?? null, servico, totem, excluidas })}
      SELECT f.cd_paciente, TRIM(p.ds_paciente) AS paciente, f.data, f.hora_senha, f.hora_saida, f.minutos,
             f.modalidade, f.preferencial, f.senha
      FROM finalizadas f
      LEFT JOIN pacientes p ON p.cd_paciente = f.cd_paciente
      WHERE f.dia_semana = ${diaSemana} AND f.hora = ${hora}
      ORDER BY f.minutos DESC
      LIMIT 200
    `
    const itens = rows.map(r => ({
      cdPaciente: r.cd_paciente,
      paciente: r.paciente,
      data: r.data,
      horaSenha: r.hora_senha.slice(0, 5),
      horaSaida: r.hora_saida,
      minutos: Math.round(Number(r.minutos) * 10) / 10,
      modalidade: r.modalidade,
      preferencial: Boolean(r.preferencial),
      senha: r.senha,
    }))
    const soma = itens.reduce((acc, i) => acc + i.minutos, 0)
    return {
      diaSemana, hora, servico,
      total: itens.length,
      media: itens.length ? Math.round((soma / itens.length) * 10) / 10 : 0,
      itens,
    }
  })
}
