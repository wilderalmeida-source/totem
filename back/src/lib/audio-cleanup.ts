import fs from 'node:fs'
import path from 'node:path'

// Os MP3 de chamada são cache de curto prazo (o painel toca em segundos; uma rechamada no mesmo dia
// reaproveita). Sem limpeza, a pasta cresce para sempre — e arquivos antigos tinham o nome do paciente.
export const AUDIO_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const AUDIO_CLEANUP_INTERVAL_MS = 60 * 60 * 1000
const CACHE_FILE = /^(chamada|Teste)-.+\.mp3$/

/** Apaga os MP3 de chamada/teste mais velhos que maxAgeMs. Não toca em atencao.mp3 nem em outros arquivos. */
export async function limparAudiosAntigos(dir: string, maxAgeMs = AUDIO_MAX_AGE_MS, now = Date.now()) {
  let removidos = 0
  let nomes: string[]
  try { nomes = await fs.promises.readdir(dir) } catch { return 0 }
  for (const nome of nomes) {
    if (!CACHE_FILE.test(nome)) continue
    const arquivo = path.join(dir, nome)
    try {
      const info = await fs.promises.stat(arquivo)
      if (info.isFile() && now - info.mtimeMs > maxAgeMs) { await fs.promises.unlink(arquivo); removidos++ }
    } catch { /* arquivo sumiu ou está em uso; tenta na próxima rodada */ }
  }
  return removidos
}
