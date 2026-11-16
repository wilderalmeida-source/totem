// Chamada única ao Google Text-to-Speech.
// - Tempo limite: um Google lento não pode travar a fila de chamadas do painel; quem chama usa o fallback (errorTTS).
// - Chave no header x-goog-api-key, não na URL (URLs acabam em logs de proxy e de erro).
export const TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize'
export const TTS_TIMEOUT_MS = 8000

/** Devolve o MP3 ou null (sem chave, erro HTTP, resposta sem áudio, rede ou tempo esgotado). Nunca lança. */
export async function synthesizeSpeech(body: unknown, key = process.env.GOOGLE_TTS_KEY, timeoutMs = TTS_TIMEOUT_MS): Promise<Buffer | null> {
  if (!key) return null
  try {
    const res = await fetch(TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null) as { audioContent?: unknown } | null
    return typeof data?.audioContent === 'string' && data.audioContent ? Buffer.from(data.audioContent, 'base64') : null
  } catch {
    return null
  }
}
