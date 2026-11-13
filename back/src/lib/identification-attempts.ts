// Dois contadores de erros de identificação:
// - FLOW: por fluxo de atendimento (x-flow-id). Só para a mensagem "tentativas restantes";
//   o totem zera a cada novo paciente (tipo=RESET), então não protege contra força bruta.
// - TARGET: pelo paciente procurado (CPF ou nome completo). É a proteção real:
//   não depende de login, aparelho ou cabeçalho, e o RESET não zera.
export const FLOW = { limit: 3, ttl: 10 * 60 * 1000 }
export const TARGET = { limit: 3, ttl: 30 * 60 * 1000 }
type Policy = typeof FLOW

const MAX_ENTRIES = 10000
const attempts = new Map<string, { remaining: number; expires: number }>()
let lastSweep = 0

function sweep(now: number) {
  if (now - lastSweep < 1000 && attempts.size < MAX_ENTRIES) return
  lastSweep = now
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key)
  // Sem erro geral: no limite, descarta as entradas mais antigas (ordem de inserção do Map).
  for (const key of attempts.keys()) {
    if (attempts.size < MAX_ENTRIES) break
    attempts.delete(key)
  }
}

export function identificationAttempts(key: string, action: 'read' | 'fail' | 'reset', now = Date.now(), policy: Policy = FLOW) {
  const current = attempts.get(key)
  if (current && current.expires <= now) attempts.delete(key)
  const live = current && current.expires > now ? current : undefined
  if (action === 'reset') { attempts.delete(key); return policy.limit }
  if (action === 'read') return live?.remaining ?? policy.limit
  sweep(now)
  const remaining = Math.max(0, (live?.remaining ?? policy.limit) - 1)
  attempts.set(key, { remaining, expires: live?.expires ?? now + policy.ttl })
  return remaining
}

/** Chave do paciente procurado; `#` não é aceito em x-flow-id, então não colide com fluxos. */
export function identificationTarget(input: { tipo?: string; ds_cpf?: string; ds_paciente?: string }) {
  if (input.tipo === 'ID' && input.ds_cpf) return `cpf#${input.ds_cpf}`
  if (input.tipo === 'NOMEDATA' && input.ds_paciente) return `nome#${input.ds_paciente.trim().toUpperCase().replace(/\s+/g, ' ')}`
  return null
}
