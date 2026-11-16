import { WebSocket } from 'ws'

// Uma única conexão Next -> backend alimenta todos os painéis (via /api/events).
// Heartbeat: sem pong em 10 s após o ping, a conexão é encerrada; o "close" fecha os streams SSE,
// os navegadores reconectam e a próxima chamada a getInternalSocket abre uma conexão nova.
// Antes, uma conexão morta sem "close" (queda de rede, container recriado) deixava os painéis mudos.
export const PING_INTERVAL_MS = 30_000
export const PONG_TIMEOUT_MS = 10_000

let socket: WebSocket | null = null

export const getInternalSocket = () => {
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL!

    const current = new WebSocket(wsUrl, {
      headers: {
        authorization: `Bearer ${process.env.TOKEN_API_INT}`,
      },
    })
    socket = current
    // Cada painel/tela aberta adiciona listeners; evita o aviso falso de vazamento acima de 10.
    current.setMaxListeners(500)

    let pongTimer: ReturnType<typeof setTimeout> | undefined
    const ping = setInterval(() => {
      if (current.readyState !== WebSocket.OPEN) return
      clearTimeout(pongTimer)
      pongTimer = setTimeout(() => current.terminate(), PONG_TIMEOUT_MS)
      try { current.ping() } catch { current.terminate() }
    }, PING_INTERVAL_MS)
    ping.unref?.()
    current.on('pong', () => clearTimeout(pongTimer))
    current.on('close', () => { clearInterval(ping); clearTimeout(pongTimer) })
    current.on('error', (_err: string) => console.error('Erro no Socket:', _err))
  }

  return socket
}
