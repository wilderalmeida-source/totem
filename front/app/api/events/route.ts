import { getInternalSocket } from '@/lib/node-socket';

export async function GET() {
  const socket = getInternalSocket();
  
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false; // Flag para controlar o estado da stream

      // 1. Definimos a função de callback
      const onMessage = (data: string) => {
        if (isClosed) return; // Se fechou, não faz nada

        try {
          const payload = JSON.stringify({
            message: data.toString(),
            timestamp: new Date().toISOString()
          });
          
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (_err) {
          console.error("Erro ao enviar dados para o browser:", _err);
          cleanup();
        }
      };

      // 2. Função de limpeza
      const cleanup = () => {
        if (!isClosed) {
          isClosed = true;
          socket.off('message', onMessage); // REMOVE o ouvinte do socket
          try { controller.close(); } catch (_e) {console.log(_e)} // Fecha o controller se possível
          console.log("--- Conexão SSE encerrada e limpa ---");
        }
      };

      // 3. Registra o evento no socket
      socket.on('message', onMessage);

      // 4. Se o socket principal fechar, limpamos aqui também
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },
    cancel(reason) {
      // Esse método é chamado automaticamente pelo Next quando o cliente desconecta
      console.log("Cliente desconectou do SSE:", reason);
      // Aqui a lógica de limpeza (socket.off) deve ser acionada
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}