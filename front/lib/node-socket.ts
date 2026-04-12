import { WebSocket } from 'ws';

let socket: WebSocket | null = null;
export type DefaultWsMessage = {
  type: string;
  ts?: number;
  payload?: unknown;
  [key: string]: unknown; // ✅ agora existe
};
export const getInternalSocket = <T extends object = DefaultWsMessage>() => {
  if (!socket || socket.readyState === WebSocket.CLOSED) {
    console.log("--- Conectando ao Servidor Node.js via Server-Side ---", process.env.NEXT_PUBLIC_WS_URL);
    
    socket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!,{
      headers: {
        authorization:`Bearer ${process.env.TOKEN_API_INT}`
      }
    });

    socket.on('open', () => {
      console.log('Conexão estabelecida com sucesso!');
    });

    socket.on('message', (_data:T) => {
      console.log('Dados recebidos do Node:', _data.toString());
    });

    socket.on('error', (_err:string) => console.error('Erro no Socket:', _err));
  }

  return socket;
};