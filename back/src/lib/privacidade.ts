import { z } from 'zod'
import { PrismaLog } from '../../config/prismalog'
import { FORMATOS_NOME } from './nome-privacidade'

// Escolhas de privacidade da clínica (tela Temas). Ficam na coluna JSONB "privacidade" de configuracao_visual.
export const privacidadeSchema = z.object({
  painelNome: z.enum(FORMATOS_NOME),
  historicoNome: z.enum(['primeiro_ultimo', 'abreviado', 'iniciais', 'oculto']),
  // 0 = guardar os logs sem prazo; senão, apaga os registros mais antigos que isso.
  logsRetencaoDias: z.union([z.literal(0), z.literal(30), z.literal(90), z.literal(180), z.literal(365)]),
}).strict()
export type Privacidade = z.infer<typeof privacidadeSchema>

// Padrão = como o sistema já funcionava: painel com nome completo, histórico com primeiro e último nome, logs sem prazo.
export const PRIVACIDADE_PADRAO: Privacidade = { painelNome: 'completo', historicoNome: 'primeiro_ultimo', logsRetencaoDias: 0 }

let cache: { valor: Privacidade; expira: number } | undefined

/** Lê a configuração (cache de 30 s). Sem a coluna no banco ou com erro, usa o padrão para não parar painel e totem. */
export async function lerPrivacidade(): Promise<Privacidade> {
  if (cache && Date.now() < cache.expira) return cache.valor
  let valor = PRIVACIDADE_PADRAO
  try {
    const rows = await PrismaLog.$queryRaw<Array<{ privacidade: unknown }>>`SELECT privacidade FROM configuracao_visual WHERE id = 1`
    const lido = privacidadeSchema.safeParse({ ...PRIVACIDADE_PADRAO, ...(rows[0]?.privacidade as object ?? {}) })
    if (lido.success) valor = lido.data
  } catch { /* Coluna ainda não criada: o padrão mantém o comportamento anterior. */ }
  cache = { valor, expira: Date.now() + 30_000 }
  return valor
}

export async function salvarPrivacidade(valor: Privacidade) {
  const json = JSON.stringify(valor)
  await PrismaLog.$executeRaw`INSERT INTO configuracao_visual (id, privacidade) VALUES (1, ${json}::jsonb) ON CONFLICT (id) DO UPDATE SET privacidade = EXCLUDED.privacidade`
  cache = { valor, expira: Date.now() + 30_000 }
}

/** Apaga os logs mais antigos que o prazo escolhido, em lotes para não travar o banco. Devolve quantos apagou. */
export async function limparLogsAntigos(): Promise<number> {
  const { logsRetencaoDias } = await lerPrivacidade()
  if (!logsRetencaoDias) return 0
  const limite = new Date(Date.now() - logsRetencaoDias * 86_400_000)
  let total = 0
  for (let lote = 0; lote < 200; lote++) {
    const apagados = await PrismaLog.$executeRaw`DELETE FROM "AuditLog" WHERE id IN (SELECT id FROM "AuditLog" WHERE "createdAt" < ${limite} ORDER BY id LIMIT 5000)`
    total += apagados
    if (apagados < 5000) break
  }
  return total
}
