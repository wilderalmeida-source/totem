import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import net from "net"; type TtsBody =
  | { audioContent: string }
  | { errorTTS: string };
export default fp(async function painelClinux(fastify: FastifyInstance) {
  const server = net.createServer((sock) => {
    sock.on("data", (buf) => {
      const raw = buf.toString("utf8");
      (async () => {
        try {
          // 1) pega entre 2º–3º hífen
          const m2 = raw.match(/^(?:[^-]*-){2}\s*([^-]*?)\s*-/);
          const tail = (m2?.[1] ?? "").trim(); // ex.: "9155"
          if (!tail) {
            fastify.broadcast({ type: "tcp", ts: Date.now(), data: raw });
            return;
          }

          // 2) chama sua rota GET internamente com filtroControle
          const res = await fastify.inject({
            method: "GET",
            url: `/clinux/senhas?filtroControle=${encodeURIComponent(tail)}`,
            headers: {
              Authorization: `Bearer ${process.env.TOKENAPIINT}`
            }
          });

          // pode ser null ou array; adapte conforme o retorno atual da sua rota
          const body = res.json() as any;
          // Se sua rota retorna lista, pegue o primeiro com paciente:
          // Ex.: quando você usa include { atendimentos { select { pacientes... } } }
          let dsPaciente: string | undefined;

          if (Array.isArray(body.senhasRawQuery) && body.senhasRawQuery.length > 0) {
            // dois formatos comuns — ajuste conforme o shape que sua rota devolve
            // A) shape “normalizado” vindo do $queryRaw:
            if (body.senhasnr[0]?.ds_paciente) {
              dsPaciente = body.senhasRawQuery.find((r: any) => r.ds_paciente)?.ds_paciente;
            }
            // B) shape do findMany com include atendimentos:
            else if (body.senhasRawQuery[0]?.atendimentos) {
              for (const row of body) {
                const at = row.atendimentos?.[0];
                const pac = at?.pacientes_atendimentos_cd_pacienteTopacientes;
                if (pac?.ds_paciente) {
                  dsPaciente = pac.ds_paciente;
                  break;
                }
              }
            }
          }

          // 3) se achou paciente e 6º campo está vazio, injeta
          let out = raw;
          if (dsPaciente) {
            // ^((?:[^-]*-){5})\s*([^-]*?)\s*(-)
            const re56 = /^((?:[^-]*-){5})\s*([^-]*?)\s*(-)/;
            const m56 = re56.exec(out);
            if (m56) {
              const campo6 = (m56[2] ?? "").trim();
              if (!campo6) {
                out = out.replace(re56, (_f, g1, _c6, g3) => `${g1}${dsPaciente}${g3}`);
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
              case "00": return `${nomeAux}, entrega de exames.`;
              case "01": return `${nomeAux}, guichê 1.`;
              case "02": return `${nomeAux}, guichê 2.`;
              case "03": return `${nomeAux}, guichê 3.`;
              case "04": return `${nomeAux}, guichê 4.`;
              case "05": return `${nomeAux}, guichê 5.`;
              case "06": return `${nomeAux}, guichê 6.`;
              case "07": return `${nomeAux}, guichê 7.`;
              case "08": return `${nomeAux}, guichê 8.`;
              case "09": return `${nomeAux}, guichê 9.`;
              default: return `${nomeAux}, guichê ${guicheAux}.`;
            }
          }
          const date = new Date()
          const dateday = date.getDate()
          const dateMonth = date.getMonth() + 1
          const dateYear = date.getFullYear()
          const datecomplete = (`${dateday}/${dateMonth}/${dateYear}`);

          const eventId = `${text()}-${datecomplete}`;
          const ttsRes = await fastify.inject({
            method: "POST",
            url: "/clinux/voice",
            payload: { text: text(), eventId },
            headers: {
              "content-type": "application/json",
              Authorization: `Bearer ${process.env.TOKENAPIINT}`
            },
          });

          // 4) broadcast
          fastify.broadcast({ type: "tcp", ts: Date.now(), data: out });
          if (ttsRes.statusCode === 200) {
            const ttsBody = ttsRes.json() as TtsBody;
            if ('audioContent' in ttsBody) {
              fastify.broadcast({
                type: "tts:audio",
                ts: Date.now(),
                payload: { eventId, ttsBody },
              });
            }
            if ('errorTTS' in ttsBody) {
              fastify.broadcast({
                type: "tts:audio",
                ts: Date.now(),
                payload: { eventId, ttsBody },
              });
            }
          }
        } catch (err) {
          fastify.log.error({ err }, "Erro ao tratar mensagem TCP (inject)");
          fastify.broadcast({ type: "tcp", ts: Date.now(), data: raw });
        }
      })();
    });
  });

  server.listen(2345, "0.0.0.0", () => fastify.log.info("TCP 2345 OK"));
  fastify.addHook("onClose", (_inst, done) => server.close(done));
});