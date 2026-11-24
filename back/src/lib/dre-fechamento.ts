import { randomInt } from 'node:crypto'
import { PrismaLog } from '../../config/prismalog'

// Fechamento mensal da DRE e orçamento (banco de configurações do totem; o Clinux não é alterado).
//
// Cada mês tem VERSÕES. Fechar o mês grava uma versão "aguardando" com a fotografia dos valores (por conta) e da
// associação das contas às linhas naquele momento. Aprovar a versão bloqueia o mês: a DRE passa a usar a fotografia,
// mesmo que o Clinux ou a estrutura mudem depois (a tela mostra a diferença). Ajustes posteriores e novos fechamentos
// criam uma nova versão, que também precisa de aprovação; a anterior fica "substituída". Reabrir volta o mês a
// provisório. Rejeitar descarta uma versão aguardando.

export type StatusVersao = 'aguardando' | 'aprovado' | 'rejeitado' | 'substituido' | 'reaberto'
export type ValorFoto = { cdConta: number | null; valor: number; titulos: number }
export type Ajuste = { id: number; folha: string; valor: number; descricao: string; em: string; por: string }
export type Versao = {
  mes: string; versao: number; status: StatusVersao
  valores: ValorFoto[]; mapeamento: Record<string, Array<{ folha: string; pct: number }>>; ajustes: Ajuste[]
  conciliacao: { linhas: Record<string, number>; observacao?: string; em?: string; por?: string }
  motivo: string | null; criadoEm: string; criadoPor: string
  decididoEm: string | null; decididoPor: string | null; decisaoMotivo: string | null
}

let tabelasProntas = false
async function garantirTabelas() {
  if (tabelasProntas) return
  await PrismaLog.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS dre_fechamento (
    mes CHAR(7) NOT NULL, versao INT NOT NULL, status TEXT NOT NULL,
    valores JSONB NOT NULL, mapeamento JSONB NOT NULL, ajustes JSONB NOT NULL DEFAULT '[]'::jsonb, conciliacao JSONB NOT NULL DEFAULT '{}'::jsonb,
    motivo TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT now(), criado_por TEXT NOT NULL,
    decidido_em TIMESTAMPTZ, decidido_por TEXT, decisao_motivo TEXT,
    PRIMARY KEY (mes, versao))`)
  await PrismaLog.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS dre_orcamento (
    ano INT PRIMARY KEY, valores JSONB NOT NULL, atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(), atualizado_por TEXT NOT NULL)`)
  tabelasProntas = true
}

type Linha = {
  mes: string; versao: number; status: string; valores: unknown; mapeamento: unknown; ajustes: unknown; conciliacao: unknown
  motivo: string | null; criado_em: Date; criado_por: string; decidido_em: Date | null; decidido_por: string | null; decisao_motivo: string | null
}
const paraVersao = (r: Linha): Versao => ({
  mes: r.mes.trim(), versao: Number(r.versao), status: r.status as StatusVersao,
  valores: (r.valores as ValorFoto[]) ?? [], mapeamento: (r.mapeamento as Versao['mapeamento']) ?? {}, ajustes: (r.ajustes as Ajuste[]) ?? [],
  conciliacao: (r.conciliacao as Versao['conciliacao']) ?? { linhas: {} },
  motivo: r.motivo, criadoEm: r.criado_em.toISOString(), criadoPor: r.criado_por,
  decididoEm: r.decidido_em ? r.decidido_em.toISOString() : null, decididoPor: r.decidido_por, decisaoMotivo: r.decisao_motivo,
})

/** Todas as versões dos meses do intervalo (inclusive), da mais nova para a mais antiga. */
export async function versoesDoPeriodo(de: string, ate: string): Promise<Versao[]> {
  await garantirTabelas()
  const rows = await PrismaLog.$queryRaw<Linha[]>`
    SELECT * FROM dre_fechamento WHERE mes >= ${de} AND mes <= ${ate} ORDER BY mes, versao DESC`
  return rows.map(paraVersao)
}

export async function versoesDoMes(mes: string) {
  return versoesDoPeriodo(mes, mes)
}

/** Situação do mês: fechado (aprovado), em aprovação (só versão aguardando) ou aberto (provisório). */
export function situacao(versoes: Versao[]) {
  const aprovada = versoes.find(v => v.status === 'aprovado') ?? null
  const aguardando = versoes.find(v => v.status === 'aguardando') ?? null
  return { aprovada, aguardando, status: aprovada ? 'fechado' : aguardando ? 'em_aprovacao' : 'aberto' as 'fechado' | 'em_aprovacao' | 'aberto' }
}

async function proximaVersao(mes: string) {
  const r = await PrismaLog.$queryRaw<Array<{ n: number | null }>>`SELECT MAX(versao) AS n FROM dre_fechamento WHERE mes = ${mes}`
  return Number(r[0]?.n ?? 0) + 1
}

export async function criarVersao(v: Pick<Versao, 'mes' | 'valores' | 'mapeamento' | 'ajustes' | 'motivo' | 'criadoPor'>) {
  await garantirTabelas()
  const versao = await proximaVersao(v.mes)
  await PrismaLog.$executeRaw`
    INSERT INTO dre_fechamento (mes, versao, status, valores, mapeamento, ajustes, motivo, criado_por)
    VALUES (${v.mes}, ${versao}, 'aguardando', ${JSON.stringify(v.valores)}::jsonb, ${JSON.stringify(v.mapeamento)}::jsonb,
            ${JSON.stringify(v.ajustes)}::jsonb, ${v.motivo}, ${v.criadoPor})`
  return versao
}

export async function decidir(mes: string, versao: number, status: StatusVersao, por: string, motivo: string | null) {
  await PrismaLog.$executeRaw`
    UPDATE dre_fechamento SET status = ${status}, decidido_em = now(), decidido_por = ${por}, decisao_motivo = ${motivo}
    WHERE mes = ${mes} AND versao = ${versao}`
}

/** Aprova a versão: a aprovada anterior do mês fica substituída. */
export async function aprovar(mes: string, versao: number, por: string) {
  await PrismaLog.$executeRaw`
    UPDATE dre_fechamento SET status = 'substituido' WHERE mes = ${mes} AND status = 'aprovado' AND versao <> ${versao}`
  await decidir(mes, versao, 'aprovado', por, null)
}

export async function atualizarAjustes(mes: string, versao: number, ajustes: Ajuste[]) {
  await PrismaLog.$executeRaw`UPDATE dre_fechamento SET ajustes = ${JSON.stringify(ajustes)}::jsonb WHERE mes = ${mes} AND versao = ${versao}`
}

export async function salvarConciliacao(mes: string, versao: number, conciliacao: Versao['conciliacao']) {
  await PrismaLog.$executeRaw`UPDATE dre_fechamento SET conciliacao = ${JSON.stringify(conciliacao)}::jsonb WHERE mes = ${mes} AND versao = ${versao}`
}

export const novoIdAjuste = () => -randomInt(1, 2_000_000_000)

// ---------- Orçamento ----------

export type Orcamento = { ano: number; valores: Record<string, number[]>; atualizadoEm: string | null; atualizadoPor: string | null }

export async function lerOrcamento(ano: number): Promise<Orcamento> {
  await garantirTabelas()
  const r = await PrismaLog.$queryRaw<Array<{ valores: unknown; atualizado_em: Date; atualizado_por: string }>>`
    SELECT valores, atualizado_em, atualizado_por FROM dre_orcamento WHERE ano = ${ano}`
  if (!r[0]) return { ano, valores: {}, atualizadoEm: null, atualizadoPor: null }
  return { ano, valores: (r[0].valores as Record<string, number[]>) ?? {}, atualizadoEm: r[0].atualizado_em.toISOString(), atualizadoPor: r[0].atualizado_por }
}

export async function salvarOrcamento(ano: number, valores: Record<string, number[]>, por: string) {
  await garantirTabelas()
  await PrismaLog.$executeRaw`
    INSERT INTO dre_orcamento (ano, valores, atualizado_por) VALUES (${ano}, ${JSON.stringify(valores)}::jsonb, ${por})
    ON CONFLICT (ano) DO UPDATE SET valores = EXCLUDED.valores, atualizado_em = now(), atualizado_por = EXCLUDED.atualizado_por`
}
