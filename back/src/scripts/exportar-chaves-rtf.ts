import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export function nomeArquivoSeguro(nome: string | null, id: number) {
  let base = (nome ?? '').normalize('NFC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
    .trim().replace(/[. ]+$/g, '').slice(0, 120)
  if (!base) base = `chave_${id}`
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base)) base = `_${base}`
  return base
}

export function nomeDaChave(nome: string | null, observacao: string | null, medico: string | null | undefined, codigo: number | null, id: number) {
  // Reserva espaço para cada parte, para nomes longos não eliminarem o autor.
  const titulo = (nome?.trim() || `chave_${id}`).slice(0, 40)
  const detalhe = observacao?.trim().slice(0, 30)
  const autor = (medico?.trim() || (codigo != null ? `medico_${codigo}` : '')).slice(0, 40)
  return `${titulo}${detalhe ? ` (${detalhe})` : ''}${autor ? ` - ${autor}` : ''}`
}

export async function salvarChave(diretorio: string, nome: string | null, id: number, conteudo: Uint8Array) {
  const base = nomeArquivoSeguro(nome, id)
  let tentativa = 0
  for (;;) {
    const sufixo = tentativa === 0 ? '' : tentativa === 1 ? `_${id}` : `_${id}_${tentativa}`
    const arquivo = path.join(diretorio, `${base}${sufixo}.rtf`)
    try {
      // Não sobrescreve arquivos de outra chave ou de uma exportação anterior.
      await writeFile(arquivo, Buffer.from(conteudo), { flag: 'wx' })
      return arquivo
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      tentativa++
    }
  }
}

async function main() {
  await import('dotenv/config')
  const { prisma } = await import('../../config/prismaDB')
  try {
    const diretorio = path.resolve(process.argv[2] || process.env.CHAVES_RTF_OUTPUT_DIR || 'export/chaves-rtf')
    await mkdir(diretorio, { recursive: true })
    let cursor: number | undefined
    let encontrados = 0, exportados = 0, vazios = 0
    for (;;) {
      const chaves = await prisma.laudos_chaves.findMany({
        select: { cd_chave: true, ds_chave: true, ds_observacao: true, cd_medico: true, bb_chave: true,
          medicos: { select: { ds_medico: true } } },
        orderBy: { cd_chave: 'asc' }, take: 200,
        ...(cursor === undefined ? {} : { cursor: { cd_chave: cursor }, skip: 1 }),
      })
      if (!chaves.length) break
      for (const chave of chaves) {
        encontrados++
        if (!chave.bb_chave?.length) { vazios++; continue }
        const nome = nomeDaChave(chave.ds_chave, chave.ds_observacao,
          chave.medicos?.ds_medico, chave.cd_medico, chave.cd_chave)
        await salvarChave(diretorio, nome, chave.cd_chave, chave.bb_chave)
        exportados++
      }
      cursor = chaves[chaves.length - 1].cd_chave
    }
    console.log(`Diretório: ${diretorio}`)
    console.log(`Chaves encontradas: ${encontrados}; arquivos exportados: ${exportados}; sem bb_chave: ${vazios}`)
  } finally { await prisma.$disconnect() }
}

if (require.main === module) main().catch(() => {
  console.error('Falha ao exportar laudos_chaves. Confira a conexão, permissões e diretório de saída. Arquivos já exportados foram preservados.')
  process.exitCode = 1
})
