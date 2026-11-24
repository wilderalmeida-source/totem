// Exportação dos dashboards em PDF protegido por senha: regras puras (senha, paginação, textos), sem DOM.

/** Senha numérica de 6 dígitos, uniforme (rejeita a sobra de 2^32 que favoreceria os primeiros números). */
export function gerarSenha(aleatorio: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]): string {
  const limite = Math.floor(2 ** 32 / 1_000_000) * 1_000_000
  for (;;) {
    const n = aleatorio()
    if (n < limite) return String(n % 1_000_000).padStart(6, '0')
  }
}

/** Senha do proprietário (permissões): longa e descartada, ninguém precisa dela. */
export function gerarSenhaProprietario(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')
}

/** cortes: posições (pt, a partir do topo do bloco) onde dá para cortar sem partir conteúdo, ex.: fim de cada linha de tabela. */
export type Bloco = { h: number; manterComProximo?: boolean; cortes?: number[] }
/** altura: espaço ocupado na página (pt); topo: início da fatia no bloco; escala < 1 = bloco inteiro reduzido para caber. */
export type Pedaco = { bloco: number; y: number; topo: number; altura: number; escala: number }

/**
 * Distribui os blocos (alturas em pt) pelas páginas sem cortar nenhum que caiba inteiro numa página.
 * Títulos curtos (manterComProximo) vão para a página seguinte junto com o bloco que vem depois.
 * Bloco que quase cabe (sem cortes) é reduzido até minimoEscala em vez de deixar a página vazia.
 * Bloco maior que a página é fatiado, de preferência nos cortes (entre linhas de tabela); fatias muito pequenas
 * no fim da página são evitadas.
 */
export function planejarPaginas(blocos: Bloco[], primeira: number, demais: number, espaco = 10, minimoFatia = 60, minimoEscala = 0.8): Pedaco[][] {
  const paginas: Pedaco[][] = [[]]
  let y = 0
  let cabe = primeira
  const novaPagina = () => { paginas.push([]); y = 0; cabe = demais }
  const por = (p: Pedaco) => { paginas[paginas.length - 1].push(p); y += p.altura + espaco }
  const reduzivel = (b: Bloco, resta: number) => !b.cortes?.length && b.h * minimoEscala <= resta
  blocos.forEach((b, i) => {
    const prox = blocos[i + 1]
    if (b.manterComProximo && prox && y > 0 && y + b.h + espaco + Math.min(prox.h * minimoEscala, demais * 0.4) > cabe) novaPagina()
    if (b.h <= cabe - y) return por({ bloco: i, y, topo: 0, altura: b.h, escala: 1 })
    if (y > 0 && reduzivel(b, cabe - y)) return por({ bloco: i, y, topo: 0, altura: cabe - y, escala: (cabe - y) / b.h })
    if (y > 0 && (b.h <= demais || reduzivel(b, demais))) novaPagina()
    if (b.h <= cabe - y) return por({ bloco: i, y, topo: 0, altura: b.h, escala: 1 })
    if (reduzivel(b, cabe - y)) return por({ bloco: i, y, topo: 0, altura: cabe - y, escala: (cabe - y) / b.h })
    let topo = 0
    while (topo < b.h - 0.5) {
      const resta = cabe - y
      if (resta < minimoFatia && y > 0) { novaPagina(); continue }
      let altura = Math.min(resta, b.h - topo)
      if (topo + altura < b.h - 0.5) {
        const corte = (b.cortes ?? []).filter(c => c > topo + minimoFatia && c <= topo + resta).pop()
        if (corte !== undefined) altura = corte - topo
      }
      por({ bloco: i, y, topo, altura, escala: 1 })
      topo += altura
      if (topo < b.h - 0.5) novaPagina()
    }
  })
  return paginas.filter((p, i) => p.length || i === 0)
}

const br = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : iso)

/** Período a partir dos campos de data da tela ("YYYY-MM-DD" ou "YYYY-MM"). */
export function textoPeriodo(valores: string[]): string | null {
  const v = valores.filter(Boolean)
  if (!v.length) return null
  const mes = (s: string) => (/^\d{4}-\d{2}$/.test(s) ? `${s.slice(5, 7)}/${s.slice(0, 4)}` : br(s))
  if (v.length === 1) return mes(v[0])
  return v[0] === v[1] ? mes(v[0]) : `${mes(v[0])} a ${mes(v[1])}`
}

export function nomeArquivo(titulo: string, periodo: string | null, agora = new Date()): string {
  const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const data = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
  return `${slug(titulo) || 'dashboard'}${periodo ? `_${slug(periodo)}` : ''}_${data}.pdf`
}

// Caracteres fora do WinAnsi (fonte padrão do PDF) que aparecem nas telas.
const TROCAS: Record<string, string> = { '→': '->', '←': '<-', '≥': '>=', '≤': '<=', '−': '-', '✓': 'v', '×': 'x', ' ': ' ', ' ': ' ' }
const WINANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')

/** Texto que a fonte padrão do PDF consegue escrever (acentos do português ficam). */
export function textoSeguro(s: string): string {
  return [...s.replace(/\s+/g, ' ').trim()].map(c => TROCAS[c] ?? ((c.charCodeAt(0) <= 0xff && c.charCodeAt(0) >= 0x20) || WINANSI_EXTRA.has(c) ? c : '')).join('')
}

/** Quebra o texto em linhas que caibam na largura (medida pela função da fonte). */
export function quebrarLinhas(texto: string, largura: number, medir: (s: string) => number, maxLinhas = 3): string[] {
  const palavras = texto.split(' ').filter(Boolean)
  const linhas: string[] = []
  let atual = ''
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p
    if (medir(teste) <= largura || !atual) atual = teste
    else { linhas.push(atual); atual = p }
  }
  if (atual) linhas.push(atual)
  if (linhas.length > maxLinhas) {
    const corte = linhas.slice(0, maxLinhas)
    let ultima = corte[maxLinhas - 1]
    while (ultima && medir(`${ultima}…`) > largura) ultima = ultima.slice(0, -1)
    corte[maxLinhas - 1] = `${ultima.trimEnd()}…`
    return corte
  }
  return linhas
}
