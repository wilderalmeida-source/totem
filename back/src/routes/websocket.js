"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
exports.default = (0, fastify_plugin_1.default)(async function ws(fastify) {
    const clients = new Set();
    function broadcast(payload) {
        const data = JSON.stringify(payload);
        for (const ws of clients) {
            // @ts-ignore
            if (ws.readyState === ws.OPEN) {
                try {
                    ws.send(data);
                }
                catch (e) {
                    fastify.log.warn({ err: e }, "Falha ao enviar WS");
                }
            }
        }
    }
    fastify.decorate("broadcast", broadcast);
    await fastify.register(websocket_1.default);
    fastify.get("/ws", { websocket: true, logLevel: "silent" }, (socket, req) => {
        clients.add(socket);
        socket.on("message", (msg) => {
            // eco opcional
            socket.send("eco: " + msg.toString());
        });
        const cleanup = () => clients.delete(socket);
        socket.on("close", cleanup);
        socket.on("error", cleanup);
    });
});
