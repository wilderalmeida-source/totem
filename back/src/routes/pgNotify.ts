import fp from "fastify-plugin";
import "dotenv/config";
import type { FastifyPluginAsync } from "fastify";
import { Client } from "pg";

type PgNotifyOpts = {
  connectionString?: string;            // ex: postgres://user:pass@host:5432/clinux_itumbiara
  channel?: string;                     // default: 'db_atendimentos_senhas'
  logRawPayload?: boolean;              // para debug
};

const plugin: FastifyPluginAsync<PgNotifyOpts> = async (fastify, opts) => {
  const channel = (opts.channel ?? "db_atendimentos_senhas").trim();

  if (!/^[a-z_][a-z0-9_]*$/i.test(channel)) {
    throw new Error(`Invalid LISTEN channel name: ${channel}`);
  }

  const connStr = opts.connectionString ?? process.env.DATABASE_URL;
  let client: Client | null = null;
  let stop = false;
  let isConnected = false; // Controle para saber se o banco está ativo

  // Função padrão para gerar o payload do broadcast
  const sendFallbackBroadcast = () => {
    const out = {
      type: "db",
      ts: Date.now(),
      channel: "db_update",
      fallback: true // Flag opcional, só para você saber no front que veio do fallback
    };
    try {
      fastify.broadcast?.(out);
    } catch { }
  };

  // Loop que roda a cada 30s mandando o broadcast caso o banco esteja fora
  const fallbackInterval = setInterval(() => {
    if (!isConnected && !stop) {
      fastify.log.debug("Sem conexão com PG. Enviando broadcast de fallback (30s)...");
      sendFallbackBroadcast();
    }
  }, 30000);

  async function connectWithRetry(attempt = 0) {
    if (stop) return;
    try {
      client = new Client({ connectionString: connStr });
      await client.connect();
      await client.query(`LISTEN ${channel}`);

      isConnected = true; // Conectado com sucesso!
      fastify.log.info({ channel }, "PG LISTEN conectado");

      client.on("notification", (msg) => {
        try {
          const payload = msg.payload ? JSON.parse(msg.payload) : null;
          if (opts.logRawPayload) fastify.log.debug({ payload }, "pg notify payload");

          const out = {
            type: "db",
            ts: Date.now(),
            channel: "db_update"
          };

          fastify.broadcast?.(out);
        } catch (e) {
          fastify.log.debug({ err: e }, "Erro ao processar notification (ignorado)");
        }
      });

      client.on("error", (err) => {
        isConnected = false; // Caiu a conexão
        fastify.log.debug({ err }, "PG client error silencioso");
      });

      client.on("end", () => {
        isConnected = false; // Desconectado
        if (!stop) void reconnect();
      });
    } catch (err) {
      isConnected = false; // Falhou o connect inicial/retry
      const delay = Math.min(30000, 1000 * 2 ** attempt);
      await new Promise((r) => setTimeout(r, delay));
      if (!stop) return connectWithRetry(attempt + 1);
    }
  }

  async function reconnect() {
    try {
      if (client) {
        try { await client.end(); } catch { }
        client = null;
      }
    } catch { }
    await connectWithRetry(0);
  }

  // Inicia a tentativa de conexão em segundo plano
  void connectWithRetry(0);

  // encerra junto com o servidor
  fastify.addHook("onClose", async (_inst) => {
    stop = true;
    clearInterval(fallbackInterval); // Limpa o intervalo para não vazar memória
    try {
      if (client) {
        try { await client.query(`UNLISTEN ${channel}`); } catch { }
        await client.end();
        client = null;
      }
    } catch { }
  });

  // Rota SSE
  fastify.get("/events", async (req, reply) => {
    reply
      .raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

    const write = (data: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (!fastify.broadcast) {
      (fastify as any).broadcast = (d: unknown) => write(d);
    } else {
      const old = fastify.broadcast.bind(fastify);
      (reply as any)._restoreBroadcast = () => (fastify.broadcast = old);
      fastify.broadcast = (d: unknown) => {
        try { old(d); } catch { }
        try { write(d); } catch { }
      };
    }

    const ping = setInterval(() => reply.raw.write(`event: ping\ndata: ${Date.now()}\n\n`), 15000);

    req.raw.on("close", () => {
      clearInterval(ping);
      if ((reply as any)._restoreBroadcast) (reply as any)._restoreBroadcast();
      try { reply.raw.end(); } catch { }
    });
  });
};

export default fp(plugin, {
  name: "pg-notify-listener",
});