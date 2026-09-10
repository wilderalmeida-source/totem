export function auditContextHeaders(): Record<string, string> {
  try {
    let flow = sessionStorage.getItem('totemAuditSession')
    if (!flow) { flow = createSessionId(); sessionStorage.setItem('totemAuditSession', flow) }
    let device = localStorage.getItem('totemDeviceId')
    if (!device) { device = createSessionId(); localStorage.setItem('totemDeviceId', device) }
    return { 'x-flow-id': flow, 'x-device-id': device }
  } catch { return {} }
}
export function auditTotem(action: string, step: string, metadata?: Record<string, unknown>) {
  const context = auditContextHeaders()
  try {
    void fetch('/api/audit', { method: 'POST', headers: { 'Content-Type': 'application/json', ...context },
      body: JSON.stringify({ sessionId: context['x-flow-id'], action, step, metadata: {
        ...metadata, device: context['x-device-id'], deviceLabel: localStorage.getItem('totemDeviceLabel') ?? undefined,
        source: 'browser', version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'nao_informada',
      } }), keepalive: true, signal: AbortSignal.timeout(5000) }).catch(() => undefined)
  } catch { /* Auditoria nao interrompe o fluxo. */ }
}

function createSessionId() {
  const bytes = new Uint8Array(16)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`
}
