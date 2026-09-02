import { WebSocket } from 'ws'

let socket: WebSocket | null = null

export const getInternalSocket = () => {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL!

    socket = new WebSocket(wsUrl, {
      headers: {
        authorization: `Bearer ${process.env.TOKEN_API_INT}`,
      },
    })

    socket.on('error', (_err: string) => console.error('Erro no Socket:', _err))
  }

  return socket
}
