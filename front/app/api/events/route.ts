import { getInternalSocket } from '@/lib/node-socket';

export async function GET() {
  const socket = getInternalSocket();

  let cleanupFn: ((closeController?: boolean) => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let isClosed = false;

      const onMessage = (data: string) => {
        if (isClosed) return;
        try {
          const payload = JSON.stringify({
            message: data.toString(),
            timestamp: new Date().toISOString()
          });
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch (_err) {
          console.error("Erro ao enviar dados para o browser:", _err);
          cleanup(false);
        }
      };
      // ✅ closeController=true só quando a gente fecha ativamente
      // ✅ closeController=false quando o browser já fechou (cancel)
      const cleanup = (closeController = true) => {
        if (isClosed) return;
        isClosed = true;
        socket.off('message', onMessage);
        socket.off('close', cleanup);
        socket.off('error', cleanup);
        if (closeController) {
          try { controller.close(); } catch (_e) { console.log(`Conexão fechada: ${_e}`) }
        }
        console.log("--- Conexão SSE encerrada e limpa ---");
      };

      cleanupFn = cleanup;

      socket.on('message', onMessage);
      socket.on('close', cleanup);
      socket.on('error', cleanup);
    },

    cancel(reason) {
      console.log("Cliente desconectou do SSE:", reason);
      cleanupFn?.(false); // ✅ não tenta fechar o controller — browser já fechou
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