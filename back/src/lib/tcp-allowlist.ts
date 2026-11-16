// Porta TCP 2345: quem envia as chamadas é um sistema de terceiro, sem autenticação.
// A proteção fica do nosso lado: TCP_ALLOWED_IPS=10.0.0.5,10.0.0.6 aceita só esses IPs.
// Vazio = aceita todos (comportamento anterior).

/** "::ffff:10.0.0.5" (IPv4 dentro de IPv6) vira "10.0.0.5". */
export function normalizeIp(ip: string | undefined) {
  const value = (ip ?? '').trim().toLowerCase()
  return value.startsWith('::ffff:') && value.includes('.') ? value.slice(7) : value
}

export function parseAllowedIps(raw: string | undefined) {
  return new Set((raw ?? '').split(/[\s,;]+/).map(normalizeIp).filter(Boolean))
}

export function tcpAllowed(remoteAddress: string | undefined, allowed: Set<string>) {
  return allowed.size === 0 || allowed.has(normalizeIp(remoteAddress))
}
