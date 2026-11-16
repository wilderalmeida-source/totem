import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";


declare module "fastify" {
  interface FastifyInstance {
    broadcast: (payload: unknown) => void;
  }
}

// Heartbeat: conexão que não responde ao ping em 30 s é encerrada (queda de rede sem "close").
export const WS_HEARTBEAT_MS = 30_000;

export default fp(async function ws(fastify: FastifyInstance, opts: { heartbeatMs?: number } = {}) {
  const clients = new Set<WebSocket>();
  const alive = new WeakMap<WebSocket, boolean>();

  function broadcast(payload: unknown) {
    const data = JSON.stringify(payload);
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        try { ws.send(data); } catch (e) {
          fastify.log.warn({ err: e }, "Falha ao enviar WS");
        }
      }
    }
  }

  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if (alive.get(ws) === false) { clients.delete(ws); ws.terminate(); continue; }
      alive.set(ws, false);
      try { ws.ping(); } catch { /* close/error fazem a limpeza */ }
    }
  }, opts.heartbeatMs ?? WS_HEARTBEAT_MS);
  heartbeat.unref();
  fastify.addHook("onClose", (_instance, done) => { clearInterval(heartbeat); done(); });

  fastify.decorate("broadcast", broadcast);
  await fastify.register(websocket)

  fastify.get("/ws", { websocket: true, logLevel: "silent" }, (socket: WebSocket, _req: FastifyRequest) => {
    clients.add(socket);
    alive.set(socket, true);
    socket.on("pong", () => alive.set(socket, true));

    const cleanup = () => clients.delete(socket);
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });
})
