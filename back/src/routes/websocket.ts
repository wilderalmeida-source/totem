import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import type { WebSocket } from "ws";


declare module "fastify" {
  interface FastifyInstance {
    broadcast: (payload: unknown) => void;
  }
}
export default fp(async function ws(fastify: FastifyInstance) {
  const clients = new Set<WebSocket>();

  function broadcast(payload: unknown) {
    const data = JSON.stringify(payload);
    for (const ws of clients) {
      // @ts-ignore
      if (ws.readyState === ws.OPEN) {
        try { ws.send(data); } catch (e) {
          fastify.log.warn({ err: e }, "Falha ao enviar WS");
        }
      }
    }
  }

  fastify.decorate("broadcast", broadcast);
  await fastify.register(websocket)

  fastify.get("/ws", { websocket: true, logLevel: "silent" }, (socket: WebSocket, req: FastifyRequest) => {

    clients.add(socket);

    socket.on("message", (msg) => {
      // eco opcional
      socket.send("eco: " + msg.toString());
    });

    const cleanup = () => clients.delete(socket);
    socket.on("close", cleanup);
    socket.on("error", cleanup);
  });
})