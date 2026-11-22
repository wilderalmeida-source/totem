import { z } from 'zod'
import { PrismaLog } from '../../config/prismalog'
import { prisma } from '../../config/prismaDB'
import { Prisma } from '../../prisma/app/generated/prisma/client'

// O que cada tela de análise considera, por ID do Clinux (tela "Configurar analíticos").
// Fica na coluna JSONB "analises" de configuracao_visual: { espera: {...}, desempenho: {...}, ... }.
// Sem configuração salva, o padrão reproduz as regras antigas por nome (TOTEM, MIGRAÇÃO, CRI, Raio-X, e-Laudos).

export const TELAS = ['espera', 'desempenho', 'erros', 'atrasos', 'laudos'] as const
export type TelaAnalise = (typeof TELAS)[number]

const ids = z.array(z.number().int().positive()).max(5000).transform(l => [...new Set(l)].sort((a, b) => a - b))
export const configAnaliseSchema = z.object({
  modalidadesExcluidas: ids,   // fora da análise
  modalidadesTotem: ids,       // não são modalidade de verdade (ex.: TOTEM): a modalidade vem da fila escolhida no totem
  medicosExcluidos: ids,
  conveniosExcluidos: ids,     // fornecedores
  // Só na tela Laudos (as outras ignoram): procedimentos que indicam correção de laudo e o mínimo de exames
  // que um médico precisa ter laudado numa modalidade para aparecer nela (médicos que laudam pouco uma modalidade
  // — ou só de vez em quando — não distorcem os rankings).
  procedimentosExcluidos: ids.default([]),   // procedimentos fora da análise (ex.: gravações, taxas)
  procedimentosRevisao: ids.default([]),
  procedimentosRetificacao: ids.default([]),
  minimoExames: z.number().int().min(0).max(10_000).default(0),
}).strict()
export type ConfigAnalise = z.infer<typeof configAnaliseSchema>

// Quais partes da configuração cada tela usa (a tela de configuração mostra só essas).
export type Escopo = { totem: boolean; medicos: boolean; convenios: boolean; laudos: boolean }
export const ESCOPO: Record<TelaAnalise, Escopo> = {
  espera: { totem: true, medicos: false, convenios: false, laudos: false },
  desempenho: { totem: true, medicos: true, convenios: true, laudos: false },
  erros: { totem: true, medicos: true, convenios: true, laudos: false },
  atrasos: { totem: false, medicos: true, convenios: true, laudos: false },
  laudos: { totem: false, medicos: true, convenios: true, laudos: true },
}

const norm = (coluna: string) => Prisma.raw(`regexp_replace(translate(UPPER(${coluna}), 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'AAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Z0-9]', '', 'g')`)

async function idsProcedimentos(padrao: string) {
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`SELECT cd_procedimento AS id FROM procedimentos WHERE ${norm('ds_procedimento')} LIKE ${padrao}`
  return rows.map(r => Number(r.id))
}

async function idsModalidades(padroes: string[]) {
  const rows = await prisma.$queryRaw<Array<{ id: number }>>`SELECT cd_modalidade AS id FROM modalidades WHERE ${norm('ds_modalidade')} LIKE ANY(${padroes}::text[])`
  return rows.map(r => Number(r.id))
}

let padraoCache: { valor: Record<TelaAnalise, ConfigAnalise>; expira: number } | undefined

// Regras que existiam antes da tela de configuração, convertidas para IDs.
async function padroes(): Promise<Record<TelaAnalise, ConfigAnalise>> {
  if (padraoCache && Date.now() < padraoCache.expira) return padraoCache.valor
  const [totem, migracao, raioX, eLaudos, cri, revisao, retificacao] = await Promise.all([
    idsModalidades(['%TOTEM%']),
    idsModalidades(['%MIGRACAO%']),
    idsModalidades(['%RAIOX%']),
    prisma.$queryRaw<Array<{ id: number }>>`SELECT cd_medico AS id FROM medicos WHERE ${norm('ds_medico')} LIKE '%ELAUDOS%'`.then(r => r.map(x => Number(x.id))),
    prisma.$queryRaw<Array<{ id: number }>>`SELECT cd_fornecedor AS id FROM fornecedores WHERE ${norm('ds_fornecedor')} = 'CRI'`.then(r => r.map(x => Number(x.id))),
    idsProcedimentos('%REVISAO%LAUDO%'),
    idsProcedimentos('%RETIFICA%'),
  ])
  const base = (extra: Partial<ConfigAnalise> = {}): ConfigAnalise => configAnaliseSchema.parse({
    modalidadesExcluidas: migracao, modalidadesTotem: totem, medicosExcluidos: [], conveniosExcluidos: [], ...extra,
  })
  const valor = {
    espera: base(),
    desempenho: base(),
    erros: base({ conveniosExcluidos: cri }),
    // Sem cruzamento com a fila: TOTEM simplesmente fica de fora.
    atrasos: base({ modalidadesExcluidas: [...migracao, ...totem, ...raioX], modalidadesTotem: [], medicosExcluidos: eLaudos }),
    // Procedimentos pelo nome ("REVISÃO DE LAUDO…", "RETIFICAÇÃO…"); mínimo de 10 exames por médico na modalidade.
    laudos: base({ modalidadesExcluidas: [...migracao, ...totem], modalidadesTotem: [], procedimentosRevisao: revisao, procedimentosRetificacao: retificacao, minimoExames: 10 }),
  }
  padraoCache = { valor, expira: Date.now() + 10 * 60_000 }
  return valor
}

let salvoCache: { valor: Partial<Record<TelaAnalise, ConfigAnalise>>; expira: number } | undefined

async function lerSalvas(): Promise<Partial<Record<TelaAnalise, ConfigAnalise>>> {
  if (salvoCache && Date.now() < salvoCache.expira) return salvoCache.valor
  const valor: Partial<Record<TelaAnalise, ConfigAnalise>> = {}
  try {
    const rows = await PrismaLog.$queryRaw<Array<{ analises: unknown }>>`SELECT analises FROM configuracao_visual WHERE id = 1`
    const bruto = (rows[0]?.analises ?? {}) as Record<string, unknown>
    for (const tela of TELAS) {
      const lido = configAnaliseSchema.safeParse(bruto[tela])
      if (lido.success) valor[tela] = lido.data
    }
  } catch { /* Coluna ainda não criada: vale o padrão. */ }
  salvoCache = { valor, expira: Date.now() + 30_000 }
  return valor
}

/** Configuração em vigor da tela (salva ou, se não houver, o padrão por nome). */
export async function lerConfigAnalise(tela: TelaAnalise): Promise<ConfigAnalise> {
  const salvas = await lerSalvas()
  return salvas[tela] ?? (await padroes())[tela]
}

export async function lerTodasConfigs() {
  const [salvas, padrao] = await Promise.all([lerSalvas(), padroes()])
  return Object.fromEntries(TELAS.map(t => [t, { config: salvas[t] ?? padrao[t], salvo: Boolean(salvas[t]), padrao: padrao[t] }])) as
    Record<TelaAnalise, { config: ConfigAnalise; salvo: boolean; padrao: ConfigAnalise }>
}

/** Salva (ou, com null, volta ao padrão) a configuração de uma tela. */
export async function salvarConfigAnalise(tela: TelaAnalise, config: ConfigAnalise | null) {
  // Cria a coluna se a migração ainda não rodou (o usuário do banco de configurações é dono das tabelas).
  await PrismaLog.$executeRawUnsafe(`ALTER TABLE configuracao_visual ADD COLUMN IF NOT EXISTS analises JSONB NOT NULL DEFAULT '{}'::jsonb`).catch(() => undefined)
  salvoCache = undefined
  const atuais = await lerSalvas()
  const novas: Partial<Record<TelaAnalise, ConfigAnalise>> = { ...atuais }
  if (config) novas[tela] = config
  else delete novas[tela]
  const json = JSON.stringify(novas)
  await PrismaLog.$executeRaw`INSERT INTO configuracao_visual (id, analises) VALUES (1, ${json}::jsonb) ON CONFLICT (id) DO UPDATE SET analises = EXCLUDED.analises`
  salvoCache = undefined
}

/** Listas para a tela de configuração: modalidades, médicos com atendimento ou exame no último ano, convênios com plano
 * e procedimentos (com a modalidade no nome, para achar a revisão/retificação de cada uma). */
export async function opcoesAnalise() {
  const [modalidades, medicos, convenios, procedimentos, executores] = await Promise.all([
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`SELECT cd_modalidade AS id, TRIM(ds_modalidade) AS nome FROM modalidades ORDER BY 2`,
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      WITH usados AS (
        SELECT cd_medico FROM atendimentos WHERE cd_medico IS NOT NULL AND dt_data >= current_date - 365
        UNION
        SELECT e.cd_medico FROM exames e JOIN atendimentos a ON a.cd_atendimento = e.cd_atendimento
        WHERE e.cd_medico IS NOT NULL AND a.dt_data >= current_date - 365
      )
      SELECT md.cd_medico AS id, TRIM(md.ds_medico) AS nome FROM medicos md JOIN usados u ON u.cd_medico = md.cd_medico ORDER BY 2`,
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      SELECT DISTINCT fo.cd_fornecedor AS id, TRIM(fo.ds_fornecedor) AS nome
      FROM planos pl JOIN fornecedores fo ON fo.cd_fornecedor = pl.cd_fornecedor ORDER BY 2`,
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      SELECT pr.cd_procedimento AS id, TRIM(pr.ds_procedimento) || COALESCE(' · ' || TRIM(m.ds_modalidade), '') AS nome
      FROM procedimentos pr LEFT JOIN modalidades m ON m.cd_modalidade = pr.cd_modalidade ORDER BY 2`,
    // Tela Laudos: médicos executores (atendimentos.cd_medico, como na tela Desempenho) com atendimento no último ano.
    prisma.$queryRaw<Array<{ id: number; nome: string | null }>>`
      WITH usados AS (
        SELECT DISTINCT cd_medico FROM atendimentos WHERE cd_medico IS NOT NULL AND dt_data >= current_date - 365
      )
      SELECT md.cd_medico AS id, TRIM(md.ds_medico) AS nome FROM medicos md JOIN usados u ON u.cd_medico = md.cd_medico ORDER BY 2`,
  ])
  const lista = (l: Array<{ id: number; nome: string | null }>) => l.map(x => ({ id: Number(x.id), nome: x.nome || `Código ${x.id}` }))
  return { modalidades: lista(modalidades), medicos: lista(medicos), convenios: lista(convenios), procedimentos: lista(procedimentos), medicosExecutores: lista(executores) }
}
