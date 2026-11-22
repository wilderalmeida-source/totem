import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'
import { CAMPOS, colunas, type OrigemErro, type Tradutor } from '../lib/erros-campos'
import { FICHA_MAXIMA_MIN, colunasComuns, dentroDaAnalise, fichasCte, joinsComuns, senhasCte, type ColunasFiltro } from './desempenho'
import { lerConfigAnalise } from '../lib/config-analises'

// Tela "Erros de atendimento".
//
// Universo: todas as fichas de atendimento (senha B) do período. A ficha é de quem gravou a "H. Senha" no log
// do atendimento (log_clinux); sem log, de quem gravou a "H. Ficha" (ou cd_funcionario_recepcao).
// H. Senha e H. Ficha com funcionários diferentes = erro "Botão Ficha não marcado" de quem chamou a senha,
// corrigido por quem marcou a ficha.
//
// Erro = alteração registrada em log_clinux, depois da ficha concluída, em um campo que a recepção preenche:
//   - exames (cd_key = cd_exame) e atendimentos (cd_key = cd_atendimento) → erro do próprio atendimento;
//   - pacientes (cd_key = cd_paciente) → erro do último atendimento do paciente com ficha antes da alteração.
//     Se esse último atendimento não está no universo, a alteração é descartada.
// Só contam alterações até JANELA_DIAS depois da ficha. A tela agrupa várias alterações do mesmo campo
// em um erro só e aplica a tolerância (minutos logo após a ficha que não contam).

const JANELA_DIAS = 30


const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const filtros = z.object({ inicio: dataIso, fim: dataIso }).superRefine((f, ctx) => {
  if (f.inicio > f.fim) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A data inicial deve ser anterior à final.' })
  else if ((Date.parse(f.fim) - Date.parse(f.inicio)) / 86_400_000 > 92) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Nesta tela o período máximo é de 3 meses.' })
})

type FichaRow = ColunasFiltro & {
  cd_atendimento: number; data: string; hora_chamada: string; hora_ficha: string; cd_funcionario_senha: number | null; funcionario_senha: string | null; senha_pelo_log: boolean; cd_funcionario_recepcao: number | null
  cd_funcionario: number | null; funcionario: string | null; cd_medico: number | null; medico: string | null
  cd_convenio: number | null; convenio: string | null; modalidade: string; cd_paciente: number | null; paciente: string | null
}

type LogRow = {
  cd_log: number; cd_atendimento: number; origem: OrigemErro; coluna: string; cd_key: number
  antes: string | null; depois: string | null; alterado_em: string; minutos: number
  cd_corretor: number | null; corretor: string | null
}

// Alteração de verdade: valor mudou e não é inclusão/exclusão de registro.
const alteracaoReal = Prisma.sql`
  COALESCE(TRIM(l.ds_before), '') IS DISTINCT FROM COALESCE(TRIM(l.ds_after), '')
  AND COALESCE(UPPER(TRIM(l.ds_operation)), 'U') NOT LIKE ALL(ARRAY['I%', 'D%', 'EXC%'])`

const colunasLog = Prisma.sql`
  l.cd_log, LOWER(TRIM(l.ds_field)) AS coluna, l.cd_key, TRIM(l.ds_before) AS antes, TRIM(l.ds_after) AS depois,
  to_char(l.dt_log, 'YYYY-MM-DD"T"HH24:MI:SS') AS alterado_em, l.cd_funcionario AS cd_corretor, TRIM(fc.ds_funcionario) AS corretor`

// Quem gravou um horário do atendimento, segundo o log do Clinux (ex.: "H. Senha", "H. Ficha").
// O campo pode vir com o nome da coluna (dt_hora_senha) ou com o rótulo da tela (H. Senha): compara só as letras.
const quemGravou = (alias: string, nomes: string[]) => Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT l.cd_funcionario
    FROM log_clinux l
    WHERE l.cd_key = a.cd_atendimento
      AND LOWER(TRIM(l.ds_table)) = 'atendimentos'
      AND regexp_replace(LOWER(l.ds_field), '[^a-z]', '', 'g') = ANY(${nomes}::text[])
      AND COALESCE(TRIM(l.ds_after), '') <> ''
      AND l.cd_funcionario IS NOT NULL
    ORDER BY l.dt_log DESC, l.cd_log DESC
    LIMIT 1
  ) ${Prisma.raw(alias)} ON true`

async function fichas(inicio: string, fim: string, totem: number[]) {
  return prisma.$queryRaw<FichaRow[]>`
    WITH ${senhasCte(inicio, fim, 'B')}, ${fichasCte}
    SELECT
      a.cd_atendimento,
      to_char(a.dt_data, 'YYYY-MM-DD') AS data,
      COALESCE(to_char(a.dt_hora_senha, 'HH24:MI'), to_char(x.dt_saida, 'HH24:MI')) AS hora_chamada,
      to_char(a.dt_hora_ficha, 'HH24:MI') AS hora_ficha,
      COALESCE(ls.cd_funcionario, lf.cd_funcionario, a.cd_funcionario_recepcao) AS cd_funcionario_senha,
      TRIM(fs.ds_funcionario) AS funcionario_senha,
      (ls.cd_funcionario IS NOT NULL) AS senha_pelo_log,
      COALESCE(lf.cd_funcionario, a.cd_funcionario_recepcao) AS cd_funcionario_recepcao,
      ${colunasComuns(totem)}
    FROM fichas x
    JOIN atendimentos a ON a.cd_atendimento = x.cd_atendimento
    ${quemGravou('ls', ['dthorasenha', 'hsenha'])}
    ${quemGravou('lf', ['dthoraficha', 'hficha'])}
    ${joinsComuns('COALESCE(lf.cd_funcionario, a.cd_funcionario_recepcao)')}
    LEFT JOIN funcionarios fs ON fs.cd_funcionario = COALESCE(ls.cd_funcionario, lf.cd_funcionario, a.cd_funcionario_recepcao)
    WHERE EXTRACT(EPOCH FROM ((a.dt_data + a.dt_hora_ficha) - x.dt_saida)) / 60.0 <= ${FICHA_MAXIMA_MIN}
  `
}

async function alteracoesDoAtendimento(ids: number[]) {
  if (!ids.length) return []
  const janela = Prisma.sql`l.dt_log >= (a.dt_data + a.dt_hora_ficha) AND l.dt_log < (a.dt_data + a.dt_hora_ficha) + make_interval(days => ${JANELA_DIAS}::int)`
  const minutos = Prisma.sql`EXTRACT(EPOCH FROM (l.dt_log - (a.dt_data + a.dt_hora_ficha))) / 60.0 AS minutos`
  return prisma.$queryRaw<LogRow[]>`
    SELECT a.cd_atendimento, 'exame'::text AS origem, ${minutos}, ${colunasLog}
    FROM atendimentos a
    JOIN exames e ON e.cd_atendimento = a.cd_atendimento
    JOIN log_clinux l ON l.cd_key = e.cd_exame AND LOWER(TRIM(l.ds_table)) = 'exames'
    LEFT JOIN funcionarios fc ON fc.cd_funcionario = l.cd_funcionario
    WHERE a.cd_atendimento = ANY(${ids}::int[])
      AND LOWER(TRIM(l.ds_field)) = ANY(${colunas('exame')}::text[])
      AND ${janela} AND ${alteracaoReal}
    UNION ALL
    SELECT a.cd_atendimento, 'atendimento'::text AS origem, ${minutos}, ${colunasLog}
    FROM atendimentos a
    JOIN log_clinux l ON l.cd_key = a.cd_atendimento AND LOWER(TRIM(l.ds_table)) = 'atendimentos'
    LEFT JOIN funcionarios fc ON fc.cd_funcionario = l.cd_funcionario
    WHERE a.cd_atendimento = ANY(${ids}::int[])
      AND LOWER(TRIM(l.ds_field)) = ANY(${colunas('atendimento')}::text[])
      AND ${janela} AND ${alteracaoReal}
  `
}

// Edição do cadastro: atribuída ao último atendimento do paciente com ficha concluída antes da alteração.
async function alteracoesDoPaciente(pacientes: number[], inicio: string, fim: string) {
  if (!pacientes.length) return []
  return prisma.$queryRaw<LogRow[]>`
    SELECT ult.cd_atendimento, 'paciente'::text AS origem,
      EXTRACT(EPOCH FROM (l.dt_log - ult.fim_ficha)) / 60.0 AS minutos, ${colunasLog}
    FROM log_clinux l
    JOIN LATERAL (
      SELECT a.cd_atendimento, (a.dt_data + a.dt_hora_ficha) AS fim_ficha
      FROM atendimentos a
      WHERE a.cd_paciente = l.cd_key AND a.dt_hora_ficha IS NOT NULL AND (a.dt_data + a.dt_hora_ficha) <= l.dt_log
      ORDER BY a.dt_data DESC, a.dt_hora_ficha DESC, a.cd_atendimento DESC
      LIMIT 1
    ) ult ON true
    LEFT JOIN funcionarios fc ON fc.cd_funcionario = l.cd_funcionario
    WHERE l.cd_key = ANY(${pacientes}::int[])
      AND LOWER(TRIM(l.ds_table)) = 'pacientes'
      AND LOWER(TRIM(l.ds_field)) = ANY(${colunas('paciente')}::text[])
      AND l.dt_log >= ${inicio}::date
      AND l.dt_log < ${fim}::date + ${JANELA_DIAS + 1}::int
      AND l.dt_log < ult.fim_ficha + make_interval(days => ${JANELA_DIAS}::int)
      AND ${alteracaoReal}
  `
}

const codigo = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null)

// Troca códigos (plano, procedimento, médico, paciente) por "código · nome" para a tela ficar legível.
async function traduzirCodigos(rows: LogRow[]) {
  const ids: Record<Tradutor, Set<number>> = { plano: new Set(), procedimento: new Set(), medico: new Set(), paciente: new Set() }
  const tradutor = (r: LogRow) => CAMPOS[r.origem][r.coluna]?.traduzir
  for (const r of rows) {
    const t = tradutor(r)
    if (!t) continue
    for (const v of [codigo(r.antes), codigo(r.depois)]) if (v !== null) ids[t].add(v)
  }
  const lista = (t: Tradutor) => [...ids[t]]
  const [planos, procedimentos, medicos, pacientes] = await Promise.all([
    ids.plano.size ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_plano AS id, TRIM(ds_plano) AS nome FROM planos WHERE cd_plano = ANY(${lista('plano')}::int[])` : [],
    ids.procedimento.size ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_procedimento AS id, TRIM(ds_procedimento) AS nome FROM procedimentos WHERE cd_procedimento = ANY(${lista('procedimento')}::int[])` : [],
    ids.medico.size ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_medico AS id, TRIM(ds_medico) AS nome FROM medicos WHERE cd_medico = ANY(${lista('medico')}::int[])` : [],
    ids.paciente.size ? prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_paciente AS id, TRIM(ds_paciente) AS nome FROM pacientes WHERE cd_paciente = ANY(${lista('paciente')}::int[])` : [],
  ])
  const nomes: Record<Tradutor, Map<number, string>> = {
    plano: new Map(planos.map(p => [Number(p.id), p.nome ?? ''])),
    procedimento: new Map(procedimentos.map(p => [Number(p.id), p.nome ?? ''])),
    medico: new Map(medicos.map(p => [Number(p.id), p.nome ?? ''])),
    paciente: new Map(pacientes.map(p => [Number(p.id), p.nome ?? ''])),
  }
  const traduz = (t: Tradutor | undefined, v: string | null) => {
    const id = codigo(v)
    const nome = t && id !== null ? nomes[t].get(id) : undefined
    return nome ? `${id} · ${nome}` : v
  }
  return (r: LogRow) => ({ antes: traduz(tradutor(r), r.antes), depois: traduz(tradutor(r), r.depois) })
}

// Cache da resposta: a consulta varre o log do Clinux e é pesada. Período que já terminou quase não muda
// (30 min); período que inclui hoje vale 5 min. O botão "Atualizar" da tela manda ?atualizar=1 e ignora o cache.
const cache = new Map<string, { expira: number; valor: unknown }>()
const MAX_CACHE = 24
const hojeIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export async function errosRoutes(fastify: FastifyInstance) {
  fastify.get('/clinux/dashboard/erros', async (request, reply) => {
    const parsed = filtros.safeParse(request.query)
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? 'Filtros inválidos.' })
    const { inicio, fim } = parsed.data

    // Modalidades, médicos e convênios fora da análise: tela "Configurar analíticos" (padrão: MIGRAÇÃO e CRI fora).
    const cfg = await lerConfigAnalise('erros')
    const chave = `${inicio}|${fim}|${JSON.stringify(cfg)}`
    const guardado = cache.get(chave)
    const forcar = (request.query as { atualizar?: string }).atualizar === '1'
    if (guardado && !forcar && Date.now() < guardado.expira) return guardado.valor
    const valor = await calcular(inicio, fim, cfg)
    cache.delete(chave)
    cache.set(chave, { expira: Date.now() + (fim < hojeIso() ? 30 : 5) * 60_000, valor })
    while (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value as string)
    return valor
  })
}

async function calcular(inicio: string, fim: string, cfg: Awaited<ReturnType<typeof lerConfigAnalise>>) {
    const todas = (await fichas(inicio, fim, cfg.modalidadesTotem)).filter(dentroDaAnalise(cfg))
    // H. Senha e H. Ficha gravadas por funcionários diferentes: quem chamou a senha atendeu, mas esqueceu
    // de apertar "Ficha" no Clinux, e outro funcionário marcou depois. A ficha é de quem chamou a senha.
    const esqueceuFicha = (f: FichaRow) => f.cd_funcionario_senha !== null && f.cd_funcionario_senha !== f.cd_funcionario_recepcao
    const ids = todas.map(f => Number(f.cd_atendimento))
    const universo = new Set(ids)
    const pacientes = [...new Set(todas.map(f => f.cd_paciente).filter((p): p is number => p !== null).map(Number))]

    const [doAtendimento, doPaciente] = await Promise.all([
      alteracoesDoAtendimento(ids),
      alteracoesDoPaciente(pacientes, inicio, fim),
    ])
    const pacienteNoUniverso = doPaciente.filter(r => universo.has(Number(r.cd_atendimento)))
    const rows = [...doAtendimento, ...pacienteNoUniverso]
    const traduzir = await traduzirCodigos(rows)

    const alteracoes = rows.map(r => ({
      id: Number(r.cd_log),
      cdAtendimento: Number(r.cd_atendimento),
      origem: r.origem,
      coluna: r.coluna,
      campo: CAMPOS[r.origem][r.coluna]?.rotulo ?? r.coluna,
      registro: Number(r.cd_key),
      ...traduzir(r),
      alteradoEm: r.alterado_em,
      minutosAposFicha: Math.max(0, Math.round(Number(r.minutos) * 10) / 10),
      cdCorretor: r.cd_corretor,
      corretor: r.corretor || null,
      sempre: false,
    }))

    const divergentes = todas.filter(esqueceuFicha).map(f => ({
      cdAtendimento: Number(f.cd_atendimento),
      data: f.data,
      horaChamada: f.hora_chamada,
      horaFicha: f.hora_ficha,
      cdFuncionarioSenha: f.cd_funcionario_senha,
      funcionarioSenha: f.funcionario_senha || null,
      senhaPeloLog: Boolean(f.senha_pelo_log),
      cdFuncionario: f.cd_funcionario,
      funcionario: f.funcionario || null,
      modalidade: f.modalidade,
      convenio: f.convenio || null,
      cdPaciente: f.cd_paciente,
      paciente: f.paciente || null,
    }))

    // O esquecimento vira um erro do atendimento, corrigido por quem marcou a ficha (conta sempre, sem tolerância).
    const fichasEsquecidas = divergentes.map(d => ({
      id: -d.cdAtendimento,
      cdAtendimento: d.cdAtendimento,
      origem: 'atendimento' as const,
      coluna: 'ficha_nao_marcada',
      campo: 'Botão Ficha não marcado',
      registro: d.cdAtendimento,
      antes: `Ficha não marcada por ${d.funcionarioSenha ?? `funcionário ${d.cdFuncionarioSenha}`}`,
      depois: `Ficha marcada às ${d.horaFicha} por ${d.funcionario ?? 'outro funcionário'}`,
      alteradoEm: `${d.data}T${d.horaFicha}:00`,
      minutosAposFicha: 0,
      cdCorretor: d.cdFuncionario,
      corretor: d.funcionario,
      sempre: true,
    }))

    const atendimentos = todas.map(f => {
      const esqueceu = esqueceuFicha(f)
      return {
        cdAtendimento: Number(f.cd_atendimento),
        data: f.data,
        horaFicha: f.hora_ficha,
        cdFuncionario: esqueceu ? f.cd_funcionario_senha : f.cd_funcionario,
        funcionario: (esqueceu ? f.funcionario_senha : f.funcionario) || null,
        cdMedico: f.cd_medico,
        medico: f.medico || null,
        cdConvenio: f.cd_convenio,
        convenio: f.convenio || null,
        modalidade: f.modalidade,
        cdPaciente: f.cd_paciente,
        paciente: f.paciente || null,
      }
    })

    return {
      periodo: { inicio, fim },
      janelaDias: JANELA_DIAS,
      diagnostico: {
        fichas: todas.length,
        elegiveis: todas.length,
        outroFuncionario: divergentes.length,
        semLogDaSenha: todas.filter(f => !f.senha_pelo_log).length,
        edicoesPacienteForaDoUniverso: doPaciente.length - pacienteNoUniverso.length,
      },
      atendimentos,
      alteracoes: [...alteracoes, ...fichasEsquecidas],
      divergentes,
      atualizadoEm: new Date().toISOString(),
    }
}
