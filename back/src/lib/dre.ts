import { z } from 'zod'
import { PrismaLog } from '../../config/prismalog'
import { FOLHAS, FORA, type ContaClinux } from './dre-estrutura'

export { ESTRUTURA_DRE, FOLHAS, FORA, sugerirFolha, type ContaClinux } from './dre-estrutura'

const DESTINOS = [FORA, ...FOLHAS] as [string, ...string[]]

// ---------- Associação salva (banco de configurações) ----------

const item = z.object({ folha: z.enum(DESTINOS), pct: z.number().min(0.01).max(100) })
export const associacaoSchema = z.array(item).min(1).max(6).refine(l => Math.abs(l.reduce((s, i) => s + i.pct, 0) - 100) < 0.01, 'Os percentuais devem somar 100%.')
export const mapeamentoSchema = z.record(z.string().regex(/^\d+$/), associacaoSchema)
export type Associacao = z.infer<typeof associacaoSchema>

type Historico = { em: string; por: string; cdConta: number; conta: string; de: Associacao | null; para: Associacao | null }
type Salvo = { mapeamento: Record<string, Associacao>; historico: Historico[] }

async function garantirColuna() {
  await PrismaLog.$executeRawUnsafe(`ALTER TABLE configuracao_visual ADD COLUMN IF NOT EXISTS dre JSONB NOT NULL DEFAULT '{}'::jsonb`).catch(() => undefined)
}

export async function lerDreSalva(): Promise<Salvo> {
  try {
    const rows = await PrismaLog.$queryRaw<Array<{ dre: unknown }>>`SELECT dre FROM configuracao_visual WHERE id = 1`
    const bruto = (rows[0]?.dre ?? {}) as Partial<Salvo>
    const mapa = mapeamentoSchema.safeParse(bruto.mapeamento ?? {})
    return { mapeamento: mapa.success ? mapa.data : {}, historico: Array.isArray(bruto.historico) ? bruto.historico.slice(-500) : [] }
  } catch {
    return { mapeamento: {}, historico: [] }
  }
}

/** Grava a associação de algumas contas (null = volta à sugestão) e registra o histórico. */
export async function salvarAssociacoes(alteracoes: Record<string, Associacao | null>, contas: Map<number, ContaClinux>, por: string) {
  await garantirColuna()
  const atual = await lerDreSalva()
  const mapeamento = { ...atual.mapeamento }
  const historico = [...atual.historico]
  const em = new Date().toISOString()
  for (const [k, para] of Object.entries(alteracoes)) {
    const de = mapeamento[k] ?? null
    if (JSON.stringify(de) === JSON.stringify(para)) continue
    if (para) mapeamento[k] = para
    else delete mapeamento[k]
    historico.push({ em, por, cdConta: Number(k), conta: contas.get(Number(k))?.conta ?? `Conta ${k}`, de, para })
  }
  const json = JSON.stringify({ mapeamento, historico: historico.slice(-500) })
  await PrismaLog.$executeRaw`INSERT INTO configuracao_visual (id, dre) VALUES (1, ${json}::jsonb) ON CONFLICT (id) DO UPDATE SET dre = EXCLUDED.dre`
}
