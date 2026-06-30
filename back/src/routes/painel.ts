import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import net from "net";
import { PrismaLog } from "../../config/prismalog";

type TtsBody =
  | { audioContent: string }
  | { errorTTS: string };

async function descobrirPainelId(
  fastify: FastifyInstance,
  ipDestino: string
): Promise<number> {
  try {
    const config = await PrismaLog.configuracao_painel.findUnique({
      where: { id: 1 },
    });

    const paineis = (config?.paineis as any[]) ?? [];

    if (!config?.ativo || paineis.length === 0) {
      return 1;
    }

    const painel = paineis.find(
      (p) =>
        p.ativo &&
        String(p.ip ?? "").trim() === String(ipDestino ?? "").trim()
    );

    return painel?.painel ?? 1;
  } catch (error) {
    fastify.log.error({ error }, "Erro ao descobrir painel pelo IP");
    return 1;
  }
}

export default fp(async function painelClinux(fastify: FastifyInstance) {
  const server = net.createServer((sock) => {
    sock.on("data", (buf) => {
      const raw = buf.toString("utf8");

      (async () => {
        const ipDestino = sock.localAddress?.replace("::ffff:", "") ?? "";
        const painelId = await descobrirPainelId(fastify, ipDestino);
        console.log({
         local: sock.localAddress,
         remote: sock.remoteAddress
        });
        try {
          const m2 = raw.match(/^(?:[^-]*-){2}\s*([^-]*?)\s*-/);
          const tail = (m2?.[1] ?? "").trim();

          if (!tail) {
            fastify.broadcast({
              type: "tcp",
              painelId,
              ts: Date.now(),
              data: raw,
            });
            return;
          }

          const res = await fastify.inject({
            method: "GET",
            url: `/clinux/senhas?filtroControle=${encodeURIComponent(tail)}`,
            headers: {
              Authorization: `Bearer ${process.env.TOKENAPIINT}`,
            },
          });

          const body = res.json() as any;
          let dsPaciente: string | undefined;

          if (
            Array.isArray(body.senhasRawQuery) &&
            body.senhasRawQuery.length > 0
          ) {
            const pacienteRaw = body.senhasRawQuery.find(
              (r: any) => r.ds_paciente
            );

            if (pacienteRaw?.ds_paciente) {
              dsPaciente = pacienteRaw.ds_paciente;
            } else {
              for (const row of body.senhasRawQuery) {
                const at = row.atendimentos?.[0];
                const pac =
                  at?.pacientes_atendimentos_cd_pacienteTopacientes;

                if (pac?.ds_paciente) {
                  dsPaciente = pac.ds_paciente;
                  break;
                }
              }
            }
          }

          let out = raw;

          if (dsPaciente) {
            const re56 = /^((?:[^-]*-){5})\s*([^-]*?)\s*(-)/;
            const m56 = re56.exec(out);

            if (m56) {
              const campo6 = (m56[2] ?? "").trim();

              if (!campo6) {
                out = out.replace(
                  re56,
                  (_f, g1, _c6, g3) => `${g1}${dsPaciente}${g3}`
                );
              }
            }
          }

          const key = String(out ?? "").trim();

          const nomeAux =
            key.match(/^(?:[^-]*-){5}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";

          const guicheAux =
            key.match(/^(?:[^-]*-){3}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";

          const text = () => {
            switch (guicheAux) {
              case "00":
                return `${nomeAux}, entrega de exames.`;
              case "01":
                return `${nomeAux}, guichê 1.`;
              case "02":
                return `${nomeAux}, guichê 2.`;
              case "03":
                return `${nomeAux}, guichê 3.`;
              case "04":
                return `${nomeAux}, guichê 4.`;
              case "05":
                return `${nomeAux}, guichê 5.`;
              case "06":
                return `${nomeAux}, guichê 6.`;
              case "07":
                return `${nomeAux}, guichê 7.`;
              case "08":
                return `${nomeAux}, guichê 8.`;
              case "09":
                return `${nomeAux}, guichê 9.`;
              default:
                return `${nomeAux}, guichê ${guicheAux}.`;
            }
          };

          const date = new Date();
          const datecomplete = `${date.getDate()}/${
            date.getMonth() + 1
          }/${date.getFullYear()}`;

          const eventId = `${text()}-${datecomplete}`;

          const ttsRes = await fastify.inject({
            method: "POST",
            url: "/clinux/voice",
            payload: {
              text: text(),
              eventId,
            },
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${process.env.TOKENAPIINT}`,
            },
          });

          fastify.broadcast({
            type: "tcp",
            painelId,
            ts: Date.now(),
            data: out,
          });

          if (ttsRes.statusCode === 200) {
            const ttsBody = ttsRes.json() as TtsBody;

            fastify.broadcast({
              type: "tts:audio",
              painelId,
              ts: Date.now(),
              payload: {
                eventId,
                ttsBody,
              },
            });
          }
        } catch (err) {
          fastify.log.error({ err }, "Erro ao tratar mensagem TCP");

          fastify.broadcast({
            type: "tcp",
            painelId,
            ts: Date.now(),
            data: raw,
          });
        }
      })();
    });
  });

  server.listen(2345, "0.0.0.0", () => {
    fastify.log.info("TCP 2345 OK");
  });

  fastify.addHook("onClose", (_inst, done) => server.close(done));
});