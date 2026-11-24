'use client'
// Monta o PDF do dashboard aberto: lê título/período da própria tela, fotografa cada bloco (cartões, gráficos,
// tabelas) e diagrama em A4 deitado: capa (logo ou nome da clínica), páginas com cabeçalho, rodapé e número. AES-256.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from '@cantoo/pdf-lib'
import { getFontEmbedCSS, toCanvas } from 'html-to-image'
import { gerarSenha, gerarSenhaProprietario, nomeArquivo, planejarPaginas, quebrarLinhas, textoPeriodo, textoSeguro } from './pdf-dashboard'

const LARGURA_CAPTURA = 1200      // px: mesma diagramação em qualquer monitor
const ESCALA_PIXEL = 2            // nitidez da imagem (2 px por px da tela)
const PAG = { w: 841.89, h: 595.28, margem: 28 } // A4 deitado, em pt
const AZUL = rgb(0.145, 0.388, 0.922)
const TEXTO = rgb(0.06, 0.09, 0.16)
const CINZA = rgb(0.39, 0.45, 0.55)
const LINHA = rgb(0.886, 0.91, 0.94)

export type ResultadoPdf = { blob: Blob; senha: string; arquivo: string; titulo: string; paginas: number }
type Info = { titulo: string; categoria: string; descricao: string; periodo: string | null }

const visivel = (el: Element) => {
  const s = getComputedStyle(el)
  const r = el.getBoundingClientRect()
  return s.display !== 'none' && s.visibility !== 'hidden' && s.position !== 'fixed' && s.position !== 'absolute' && r.height > 2 && r.width > 2
}
const ocultar = (el: Element) => el instanceof HTMLElement && (el.dataset.pdf === 'ocultar' || el.tagName === 'NAV')
// Barra de filtros (campos de data): o período já vai no cabeçalho do PDF.
const ehFiltro = (el: Element) => !!el.querySelector('input[type=date], input[type=month]')
const ehCartao = (el: Element) => {
  const s = getComputedStyle(el)
  return parseFloat(s.borderTopWidth) > 0 || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') || ['TABLE', 'svg', 'CANVAS', 'IMG'].includes(el.tagName)
}

/** Título, categoria e descrição do cabeçalho da tela; período pelos campos de data. */
function lerInfo(raiz: HTMLElement): { info: Info; cabecalho: Element | null } {
  const h1 = raiz.querySelector('h1')
  const cabecalho = h1?.closest('header') ?? null
  const irmaos = h1?.parentElement ? [...h1.parentElement.children] : []
  const i = h1 ? irmaos.indexOf(h1) : -1
  const datas = [...raiz.querySelectorAll<HTMLInputElement>('input[type=date], input[type=month]')].filter(visivel).map(x => x.value)
  return {
    cabecalho,
    info: {
      titulo: textoSeguro(h1?.textContent ?? document.title),
      categoria: textoSeguro(i > 0 ? irmaos[i - 1].textContent ?? '' : ''),
      descricao: textoSeguro(i >= 0 && irmaos[i + 1] ? irmaos[i + 1].textContent ?? '' : ''),
      periodo: textoPeriodo(datas.slice(0, 2)),
    },
  }
}

/** Blocos a fotografar, de cima para baixo: desce nos agrupadores verticais e para nos cartões. */
function coletarBlocos(el: Element, limitePx: number, pular: Element | null, saida: HTMLElement[] = []): HTMLElement[] {
  const filhos = [...el.children].filter(c => c !== pular && visivel(c) && !ocultar(c))
  const r = el.getBoundingClientRect()
  const empilhados = filhos.length >= 1 && filhos.every(c => c.getBoundingClientRect().width >= r.width * 0.9)
  // Tabela fica inteira num bloco só (é cortada entre linhas na paginação).
  if (filhos.length && empilhados && el.tagName !== 'TABLE' && (!ehCartao(el) || r.height > limitePx)) {
    for (const c of filhos) coletarBlocos(c, limitePx, pular, saida)
    return saida
  }
  if (el instanceof HTMLElement && !ocultar(el) && !ehFiltro(el) && visivel(el)) saida.push(el)
  return saida
}

async function logoPng(url: string): Promise<Uint8Array | null> {
  try {
    const blob = await (await fetch(url, { cache: 'force-cache' })).blob()
    const src = URL.createObjectURL(blob)
    try {
      const img = new Image()
      img.src = src
      await img.decode()
      const alt = 360, larg = Math.max(1, Math.round((img.naturalWidth / Math.max(1, img.naturalHeight)) * alt))
      const c = document.createElement('canvas'); c.width = larg; c.height = alt
      c.getContext('2d')!.drawImage(img, 0, 0, larg, alt)
      return new Uint8Array(await (await new Promise<Blob>(ok => c.toBlob(b => ok(b!), 'image/png'))).arrayBuffer())
    } finally { URL.revokeObjectURL(src) }
  } catch { return null }
}

async function pngDe(canvas: HTMLCanvasElement) {
  return new Uint8Array(await (await new Promise<Blob>(ok => canvas.toBlob(b => ok(b!), 'image/png'))).arrayBuffer())
}
function recortar(c: HTMLCanvasElement, topo: number, altura: number) {
  const r = document.createElement('canvas'); r.width = c.width; r.height = Math.max(1, Math.round(altura))
  r.getContext('2d')!.drawImage(c, 0, Math.round(topo), c.width, r.height, 0, 0, c.width, r.height)
  return r
}
const esperar = (ms: number) => new Promise(ok => setTimeout(ok, ms))

export async function exportarDashboardPdf(opcoes: { empresa: string; usuario?: string; logoUrl?: string | null; aoProgredir?: (texto: string) => void }): Promise<ResultadoPdf> {
  const raiz = (document.querySelector('.admin-page-content main') ?? document.querySelector('main')) as HTMLElement | null
  if (!raiz) throw new Error('Não encontrei o conteúdo da tela.')
  const { info, cabecalho } = lerInfo(raiz)
  const progresso = opcoes.aoProgredir ?? (() => undefined)
  const html = document.documentElement
  const escuro = html.classList.contains('dark')
  const estilo = { width: raiz.style.width, maxWidth: raiz.style.maxWidth }

  const larguraUtil = PAG.w - 2 * PAG.margem
  const pt = larguraUtil / LARGURA_CAPTURA            // pt por px
  const altCabecalho = 34, altRodape = 26, respiro = 10
  const util = PAG.h - altCabecalho - respiro - altRodape - 8

  const capturas: HTMLCanvasElement[] = []
  let cortesPx: number[][] = []
  try {
    // Captura sempre clara e na mesma largura; os gráficos se redesenham antes da foto.
    progresso('Preparando a tela…')
    if (escuro) html.classList.remove('dark')
    raiz.style.width = `${LARGURA_CAPTURA}px`; raiz.style.maxWidth = 'none'
    window.dispatchEvent(new Event('resize'))
    await esperar(700)
    const blocos = coletarBlocos(raiz, util / pt, cabecalho)
    if (!blocos.length) throw new Error('A tela ainda não tem dados para exportar.')
    // Fim de cada linha de tabela, em px a partir do topo do bloco: onde a página pode virar.
    cortesPx = blocos.map(b => {
      const topo = b.getBoundingClientRect().top
      return [...b.querySelectorAll('tr')].map(tr => tr.getBoundingClientRect().bottom - topo).sort((a, c) => a - c)
    })
    const fontEmbedCSS = await getFontEmbedCSS(raiz).catch(() => '')
    for (const [i, b] of blocos.entries()) {
      progresso(`Capturando ${i + 1} de ${blocos.length}…`)
      capturas.push(await toCanvas(b, {
        pixelRatio: ESCALA_PIXEL, backgroundColor: '#ffffff', fontEmbedCSS, cacheBust: false,
        // Sem a margem que o bloco tem na tela (space-y): ela empurraria o conteúdo e cortaria o fim da foto.
        style: { margin: '0' },
        filter: n => !(n instanceof HTMLElement && n.dataset.pdf === 'ocultar'),
      }))
    }
  } finally {
    raiz.style.width = estilo.width; raiz.style.maxWidth = estilo.maxWidth
    if (escuro) html.classList.add('dark')
    window.dispatchEvent(new Event('resize'))
  }

  progresso('Montando o PDF…')
  const larguraPx = (c: HTMLCanvasElement) => c.width / ESCALA_PIXEL
  const escalaBloco = (c: HTMLCanvasElement) => Math.min(pt, larguraUtil / larguraPx(c))
  const alturas = capturas.map(c => (c.height / ESCALA_PIXEL) * escalaBloco(c))
  const plano = planejarPaginas(alturas.map((h, i) => ({ h, manterComProximo: h < 34, cortes: cortesPx[i]?.map(c => c * escalaBloco(capturas[i])) })), util, util)

  const pdf = await PDFDocument.create()
  const agora = new Date()
  pdf.setTitle(`${info.titulo} - ${opcoes.empresa}`)
  pdf.setAuthor(opcoes.empresa); pdf.setCreator('Totem CRI · Analíticos'); pdf.setProducer('Totem CRI')
  pdf.setCreationDate(agora); pdf.setModificationDate(agora)
  const fonte = await pdf.embedFont(StandardFonts.Helvetica)
  const negrito = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = opcoes.logoUrl ? await logoPng(opcoes.logoUrl) : null
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null
  const quando = `${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  const empresa = textoSeguro(opcoes.empresa)

  const escrever = (p: PDFPage, s: string, x: number, y: number, tam: number, f: PDFFont, cor = TEXTO) => p.drawText(textoSeguro(s), { x, y, size: tam, font: f, color: cor })
  const aDireita = (p: PDFPage, s: string, y: number, tam: number, f: PDFFont, cor = CINZA) => escrever(p, s, PAG.w - PAG.margem - f.widthOfTextAtSize(textoSeguro(s), tam), y, tam, f, cor)

  // Capa (página inteira): logo cadastrado em Temas ou, sem ele, o nome da empresa; título, período e quem gerou.
  function capa(p: PDFPage) {
    const AZUL_ESCURO = rgb(0.07, 0.2, 0.55), AZUL_CLARO = rgb(0.38, 0.6, 0.98)
    const xPainel = PAG.w * 0.7, esq = 64, larguraTexto = xPainel - esq - 48
    // Painel decorativo à direita.
    p.drawRectangle({ x: xPainel, y: 0, width: PAG.w - xPainel, height: PAG.h, color: AZUL_ESCURO })
    p.drawCircle({ x: PAG.w - 20, y: PAG.h - 40, size: 150, color: AZUL, opacity: 0.55 })
    p.drawCircle({ x: xPainel + 120, y: 40, size: 108, color: AZUL_CLARO, opacity: 0.25 })
    p.drawCircle({ x: PAG.w - 60, y: 190, size: 46, color: AZUL_CLARO, opacity: 0.35 })
    p.drawRectangle({ x: 0, y: PAG.h - 8, width: xPainel, height: 8, color: AZUL })
    const branco = rgb(1, 1, 1), brancoSuave = rgb(0.82, 0.88, 1)
    escrever(p, 'DOCUMENTO', xPainel + 32, 132, 10, negrito, brancoSuave)
    escrever(p, 'CONFIDENCIAL', xPainel + 32, 112, 18, negrito, branco)
    escrever(p, 'Protegido por senha', xPainel + 32, 92, 10, fonte, brancoSuave)
    escrever(p, 'Contém dados protegidos pela LGPD', xPainel + 32, 78, 10, fonte, brancoSuave)

    // Marca da clínica.
    let topo = PAG.h - 64
    if (logo) {
      const maxL = 260, maxA = 96, f = Math.min(maxL / logo.width, maxA / logo.height)
      const larg = logo.width * f, alt = logo.height * f
      p.drawImage(logo, { x: esq, y: topo - alt, width: larg, height: alt })
      topo -= alt
    } else {
      const linhas = quebrarLinhas(empresa, larguraTexto, t => negrito.widthOfTextAtSize(t, 26), 2)
      for (const l of linhas) { escrever(p, l, esq, topo - 24, 26, negrito); topo -= 32 }
    }

    // Título do relatório.
    topo = Math.min(topo - 70, PAG.h * 0.6)
    if (info.categoria) { escrever(p, info.categoria.toUpperCase(), esq, topo, 11, negrito, AZUL); topo -= 44 }
    for (const l of quebrarLinhas(info.titulo, larguraTexto, t => negrito.widthOfTextAtSize(t, 36), 2)) { escrever(p, l, esq, topo, 36, negrito); topo -= 42 }
    p.drawRectangle({ x: esq, y: topo + 22, width: 56, height: 4, color: AZUL })
    topo -= 4
    for (const l of quebrarLinhas(info.descricao, larguraTexto, t => fonte.widthOfTextAtSize(t, 13), 3)) { escrever(p, l, esq, topo, 13, fonte, CINZA); topo -= 18 }
    if (info.periodo) {
      topo -= 14
      const rot = `Período: ${info.periodo}`, larg = negrito.widthOfTextAtSize(textoSeguro(rot), 13) + 32
      p.drawRectangle({ x: esq, y: topo - 10, width: larg, height: 32, color: rgb(0.93, 0.95, 1), borderColor: rgb(0.75, 0.83, 0.99), borderWidth: 1 })
      escrever(p, rot, esq + 16, topo + 1, 13, negrito, AZUL)
    }

    // Rodapé da capa.
    p.drawLine({ start: { x: esq, y: 96 }, end: { x: xPainel - 48, y: 96 }, thickness: 0.8, color: LINHA })
    escrever(p, `Gerado em ${quando}${opcoes.usuario ? ` por ${opcoes.usuario}` : ''}`, esq, 74, 10, negrito)
    escrever(p, `${empresa} · Totem CRI · Analíticos`, esq, 58, 9, fonte, CINZA)
  }
  function cabecalhoDemais(p: PDFPage) {
    p.drawRectangle({ x: 0, y: PAG.h - 4, width: PAG.w, height: 4, color: AZUL })
    escrever(p, `${empresa} · ${info.titulo}`, PAG.margem, PAG.h - PAG.margem + 2, 9, negrito)
    if (info.periodo) aDireita(p, `Período: ${info.periodo}`, PAG.h - PAG.margem + 2, 8, fonte)
    p.drawLine({ start: { x: PAG.margem, y: PAG.h - altCabecalho + 2 }, end: { x: PAG.w - PAG.margem, y: PAG.h - altCabecalho + 2 }, thickness: 0.6, color: LINHA })
  }
  function rodape(p: PDFPage, n: number, total: number) {
    p.drawLine({ start: { x: PAG.margem, y: altRodape }, end: { x: PAG.w - PAG.margem, y: altRodape }, thickness: 0.6, color: LINHA })
    escrever(p, 'Confidencial · contém dados protegidos pela LGPD. Não compartilhe sem autorização.', PAG.margem, 12, 7, fonte, CINZA)
    aDireita(p, `Página ${n} de ${total}`, 12, 8, negrito)
  }

  capa(pdf.addPage([PAG.w, PAG.h]))
  const imagens = new Map<string, PDFImage>()
  for (const [n, pedacos] of plano.entries()) {
    const p = pdf.addPage([PAG.w, PAG.h])
    cabecalhoDemais(p)
    // A capa não é numerada: o conteúdo conta de 1 até o fim.
    rodape(p, n + 1, plano.length)
    const topoArea = PAG.h - altCabecalho - respiro
    for (const pd of pedacos) {
      const c = capturas[pd.bloco], e = escalaBloco(c)
      const inteiro = pd.escala < 1 || (pd.topo === 0 && Math.abs(pd.altura - alturas[pd.bloco]) < 0.5)
      const chave = `${pd.bloco}:${pd.topo}`
      let img = imagens.get(chave)
      if (!img) {
        const fonteCanvas = inteiro ? c : recortar(c, (pd.topo / e) * ESCALA_PIXEL, (pd.altura / e) * ESCALA_PIXEL)
        img = await pdf.embedPng(await pngDe(fonteCanvas))
        imagens.set(chave, img)
      }
      const larg = larguraPx(c) * e * pd.escala
      p.drawImage(img, { x: PAG.margem + (larguraUtil - larg) / 2, y: topoArea - pd.y - pd.altura, width: larg, height: pd.altura })
    }
  }

  const senha = gerarSenha()
  pdf.encrypt({
    userPassword: senha, ownerPassword: gerarSenhaProprietario(),
    permissions: { printing: 'highResolution', copying: true, modifying: false, annotating: false, fillingForms: false, contentAccessibility: true, documentAssembly: false },
  })
  const bytes = await pdf.save({ useObjectStreams: false })
  return { blob: new Blob([bytes], { type: 'application/pdf' }), senha, arquivo: nomeArquivo(info.titulo, info.periodo, agora), titulo: info.titulo, paginas: plano.length + 1 }
}
