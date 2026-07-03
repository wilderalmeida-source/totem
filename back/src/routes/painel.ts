import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import net from "net";
import { PrismaLog } from "../../config/prismalog";
import { prisma } from "../../config/prismaDB";
type TtsBody = { audioContent: string } | { errorTTS: string };

type PainelConfig = {
  ip?: string;
  ativo: boolean;
  painel: number;
  marcacao?: number[];
  resultado?: number[];
  atendimento?: number[];
  universal?: {
    marcacao?: boolean;
    resultado?: boolean;
    atendimento?: boolean;
  };
};

let cachePaineis: PainelConfig[] = [];
let cacheNomeModalidadeParaId = new Map<string, number>();

function normalizarTexto(valor: string): string {
  return String(valor ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extrairDadosTcp(raw: string) {
  const partes = raw.split("-").map((p) => p.trim());

  return {
    servico: partes[0] ?? "",
    senha: partes[2] ?? "",
    guiche: partes[3] ?? "",
    modalidadeNome: partes[4] ?? "",
  };
}

async function carregarCachePainel(fastify: FastifyInstance) {
  try {
    const config = await PrismaLog.configuracao_painel.findUnique({
      where: { id: 1 },
    });

    cachePaineis =
      config?.ativo && Array.isArray(config.paineis)
        ? (config.paineis as PainelConfig[])
        : [];

    const modalidades = await prisma.modalidades.findMany({
      select: {
        cd_modalidade: true,
        ds_modalidade: true,
      },
    });

    cacheNomeModalidadeParaId = new Map();

    for (const modalidade of modalidades) {
      cacheNomeModalidadeParaId.set(
        normalizarTexto(modalidade.ds_modalidade),
        Number(modalidade.cd_modalidade)
      );
    }

    fastify.log.info(
      {
        totalPaineis: cachePaineis.length,
        totalModalidades: cacheNomeModalidadeParaId.size,
      },
      "Cache dos painéis carregado"
    );
  } catch (error) {
    fastify.log.error({ error }, "Erro ao carregar cache dos painéis");
  }
}

async function descobrirPainelPorEvento(
  fastify: FastifyInstance,
  raw: string
): Promise<number> {
  try {
    const { servico, modalidadeNome } = extrairDadosTcp(raw);

    if (!modalidadeNome) {
      return 1;
    }

    let cdModalidade = cacheNomeModalidadeParaId.get(
      normalizarTexto(modalidadeNome)
    );

    if (!cdModalidade || cachePaineis.length === 0) {
      await carregarCachePainel(fastify);

      cdModalidade = cacheNomeModalidadeParaId.get(
        normalizarTexto(modalidadeNome)
      );
    }

    if (!cdModalidade) {
      fastify.log.warn(
        { modalidadeNome, raw },
        "Modalidade não encontrada no cache"
      );
      return 1;
    }

    const tipoServico =
      servico === "D"
        ? "marcacao"
        : servico === "C"
        ? "resultado"
        : "atendimento";

    const painel = cachePaineis.find((p) => {
      if (!p.ativo) return false;

      if (p.universal?.[tipoServico] === true) {
        return true;
      }

      const lista = Array.isArray(p[tipoServico])
        ? p[tipoServico]!.map(Number)
        : [];

      return lista.includes(Number(cdModalidade));
    });

    return painel?.painel ?? 1;
  } catch (error) {
    fastify.log.error(
      { error, raw },
      "Erro ao descobrir painel pelo evento TCP"
    );
    return 1;
  }
}

async function tratarMensagemTcp(
  fastify: FastifyInstance,
  raw: string,
  painelId: number
) {
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

    const nomeAux =
      out.match(/^(?:[^-]*-){5}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";

    const guicheAux =
      out.match(/^(?:[^-]*-){3}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";

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
    fastify.log.error({ err, painelId }, "Erro ao tratar mensagem TCP");

    fastify.broadcast({
      type: "tcp",
      painelId,
      ts: Date.now(),
      data: raw,
    });
  }
}

export default fp(async function painelClinux(fastify: FastifyInstance) {
  await carregarCachePainel(fastify);

  const server = net.createServer((sock) => {
    sock.on("data", (buf) => {
      const raw = buf.toString("utf8");

      void (async () => {
        const painelId = await descobrirPainelPorEvento(fastify, raw);

        fastify.log.info(
          {
            painelId,
            raw,
            localAddress: sock.localAddress,
            remoteAddress: sock.remoteAddress,
          },
          "Mensagem TCP recebida"
        );

        await tratarMensagemTcp(fastify, raw, painelId);
      })();
    });

    sock.on("error", (err) => {
      fastify.log.error({ err }, "Erro no socket TCP");
    });
  });

  server.listen(2345, "0.0.0.0", () => {
    fastify.log.info("TCP 2345 OK");
  });

  server.on("error", (err) => {
    fastify.log.error({ err }, "Erro no servidor TCP");
  });

  fastify.decorate("recarregarCachePainel", async () => {
    await carregarCachePainel(fastify);
  });

  fastify.addHook("onClose", (_inst, done) => server.close(done));
});