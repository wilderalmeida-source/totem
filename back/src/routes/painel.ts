import { randomUUID } from 'node:crypto'
import { formatarNome, type FormatoNome } from '../lib/nome-privacidade';
import { lerPrivacidade } from '../lib/privacidade';
import { createTcpFrames } from '../lib/tcp-frames'
import { auditContext, flowAudit } from '../lib/flow-audit'
import fp from "fastify-plugin";
import { parseAllowedIps, tcpAllowed } from '../lib/tcp-allowlist';
import { guicheCache } from '../lib/painel-caches';
import { getHojeBrasil } from '../services/senhas/senha.helpers';
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
let cacheRecepcoes = new Map<string, string>();
let cacheLocalizacoes = new Map<string, string>();
let recepcoesLoadedAt = 0;
let recepcoesPending: Promise<void> | undefined;
// Recarga por "cache miss" (modalidade desconhecida ou nenhum painel ativo) no máximo a cada 30 s;
// antes cada chamada TCP nessas condições fazia duas consultas ao banco.
const MISS_RELOAD_MS = 30000;
let missReloadAt = 0;

declare module "fastify" {
  interface FastifyInstance {
    recarregarCachePainel: () => Promise<void>;
  }
}

async function refreshRecepcoes(force = false) {
  if (!force && Date.now() - recepcoesLoadedAt < 30000) return;
  if (force && recepcoesPending) await recepcoesPending.catch(() => {});
  if (!recepcoesPending) {
    recepcoesPending = PrismaLog.recepcoes_modalidades.findMany({
      where: { ativo: true }, select: { cd_modalidade: true, servico: true, recepcao: true, localizacao: true },
    }).then(recepcoes => {
      cacheRecepcoes = new Map(recepcoes.map(item => [`${item.cd_modalidade}:${item.servico}`, item.recepcao]));
      cacheLocalizacoes = new Map(recepcoes.map(item => [`${item.cd_modalidade}:${item.servico}`, item.localizacao || '']));
      recepcoesLoadedAt = Date.now();
    }).finally(() => { recepcoesPending = undefined; });
  }
  return recepcoesPending;
}

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
    paciente: partes[5] ?? "",
  };
}

// Para logs do Fastify (stdout/docker logs): a mensagem TCP traz o nome do paciente, que não vai para o log.
function resumoTcp(raw: string) {
  const { servico, senha, guiche, modalidadeNome } = extrairDadosTcp(raw);
  return { servico, senha, guiche, modalidade: modalidadeNome, bytes: Buffer.byteLength(raw) };
}

// Nome completo do paciente da senha chamada. Antes a chamada carregava TODAS as senhas do dia
// (via /clinux/senhas) e, em B/D, usava o paciente da senha mais recente, que podia ser outra pessoa.
// Mensagem do Clinux: B-NN-0394-06-...  -> 3º campo = número da senha (nr_senha) do dia.
// Troca o nome (6º campo da mensagem TCP) pelo formato escolhido na tela Temas antes de enviar ao painel.
function mascararMensagem(raw: string, formato: FormatoNome) {
  if (formato === 'completo') return raw
  return raw.replace(/^((?:[^-]*-){5})\s*([^-]*?)\s*(-)/, (_f, g1: string, nome: string, g3: string) => `${g1}${formatarNome(nome, formato)}${g3}`)
}
async function formatoPainel(): Promise<FormatoNome> {
  try { return (await lerPrivacidade()).painelNome } catch { return 'completo' }
}

async function buscarNomeDaChamada(servico: string, referencia: string): Promise<string | undefined> {
  const digits = referencia.replace(/\D/g, '')
  const numero = Number(digits)
  if (!digits || !Number.isSafeInteger(numero) || numero <= 0) return undefined
  const inicio = getHojeBrasil()
  const fim = new Date(inicio.getTime() + 86_400_000)
  try {
    if (servico === 'C') {
      // Entrega: o número vem dos últimos dígitos do atendimento (mesmo critério de antes).
      const rows = await prisma.$queryRaw<{ ds_paciente: string | null }[]>`
        SELECT p.ds_paciente
        FROM atendimentos_senhas s
        JOIN atendimentos a ON a.cd_atendimento = s.nr_controle
        JOIN pacientes p ON p.cd_paciente = a.cd_paciente
        WHERE s.dt_entrada >= ${inicio} AND s.dt_entrada < ${fim}
          AND s.ds_opcao = 'C'
          AND (a.cd_atendimento % ${10 ** digits.length}) = ${numero}
        ORDER BY s.dt_entrada DESC
        LIMIT 1`
      return rows[0]?.ds_paciente?.trim() || undefined
    }
    const senha = await prisma.atendimentos_senhas.findFirst({
      where: { dt_entrada: { gte: inicio, lt: fim }, nr_senha: numero, ds_opcao: servico },
      orderBy: { dt_entrada: 'desc' },
      select: { atendimentos: { take: 1, select: { pacientes_atendimentos_cd_pacienteTopacientes: { select: { ds_paciente: true } } } } },
    })
    return senha?.atendimentos[0]?.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente?.trim() || undefined
  } catch {
    // Sem o nome do banco, a chamada segue com o nome que veio na mensagem TCP.
    return undefined
  }
}

function montarNomeGuichePadrao(numero: string) {
  const numeroLimpo = String(numero ?? "").trim();

  if (!numeroLimpo) {
    return "Guichê";
  }

  return `Guichê ${numeroLimpo}`;
}

async function buscarNomeGuiche(numero: string) {
  const numeroLimpo = String(numero ?? "").trim();

  if (!numeroLimpo) {
    return "Guichê";
  }

  const numeroFormatado = numeroLimpo.padStart(2, "0");

  const guiche = await guicheCache(numeroFormatado, () => PrismaLog.guiches.findUnique({
    where: { numero: numeroFormatado },
    select: { ativo: true, nome: true },
  }));

  if (guiche?.ativo && guiche.nome?.trim()) {
    return guiche.nome.trim();
  }

  return montarNomeGuichePadrao(numeroFormatado);
}

async function carregarCachePainel(fastify: FastifyInstance, force = false) {
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

    await refreshRecepcoes(force);

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

    if ((!cdModalidade || cachePaineis.length === 0) && Date.now() - missReloadAt >= MISS_RELOAD_MS) {
      missReloadAt = Date.now();
      await carregarCachePainel(fastify);

      cdModalidade = cacheNomeModalidadeParaId.get(
        normalizarTexto(modalidadeNome)
      );
    }

    if (!cdModalidade) {
      fastify.log.warn(
        { tcp: resumoTcp(raw) },
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
      { error, tcp: resumoTcp(raw) },
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
    const { servico } = extrairDadosTcp(raw);
    flowAudit('tcp_interpretado', 'tcp.2345', { painelId, servico, bytes: Buffer.byteLength(raw), code: 'TCP_PARSED' });
    const m2 = raw.match(/^(?:[^-]*-){2}\s*([^-]*?)\s*-/);
    const tail = (m2?.[1] ?? "").trim();
    flowAudit('chamado_referencia', 'tcp.2345', { painelId, servico, referencia: tail.slice(0, 30) });

    if (!tail) {
      flowAudit('tcp_sem_controle', 'tcp.2345', { painelId, code: 'TCP_MISSING_CONTROL' });
      fastify.broadcast({
        type: "tcp",
        painelId,
        ts: Date.now(),
        data: mascararMensagem(raw, await formatoPainel()),
      });
      return;
    }

    const dsPaciente = await buscarNomeDaChamada(servico, tail);

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
      out.match(/^(?:[^-]*-){5}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "SEM NOME";

    const guicheAux =
      out.match(/^(?:[^-]*-){3}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";

    const numeroGuiche = String(guicheAux ?? "").trim().padStart(2, "0");
    const nomeGuiche = await buscarNomeGuiche(guicheAux);

    const textoChamada = `${nomeAux}, ${nomeGuiche}.`;

    const date = new Date();
    const datecomplete = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

    const eventId = `${textoChamada}-${datecomplete}`;
    await refreshRecepcoes().catch(() => fastify.log.warn('Não foi possível atualizar as recepções da chamada'));
    const modalidade = cacheNomeModalidadeParaId.get(normalizarTexto(extrairDadosTcp(out).modalidadeNome));
    const receptionService = servico === 'C' || servico === 'D' ? servico : 'B';
    // A voz continua falando o nome para chamar o paciente; a tela segue o formato escolhido.
    const formatoNome = await formatoPainel();
    const call = {
      id: auditContext.getStore()?.flowId ?? randomUUID(), name: formatarNome(nomeAux, formatoNome),
      fullName: formatarNome(dsPaciente || nomeAux, formatoNome),
      modalidade: extrairDadosTcp(out).modalidadeNome,
      ...(modalidade ? { cdModalidade: modalidade } : {}),
      localizacao: cacheLocalizacoes.get(`${modalidade}:${receptionService}`) || '',
      guicheNumero: numeroGuiche, guicheNome: nomeGuiche,
      recepcao: cacheRecepcoes.get(`${modalidade}:${receptionService}`) || `Recepção ${painelId}`,
      calledAt: date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
    };

    flowAudit('tts_iniciado', 'audio.geracao', { painelId, code: 'TTS_REQUESTED' });
    const ttsStart = Date.now();
    const ttsRes = await fastify.inject({
      method: "POST",
      url: "/clinux/voice",
      payload: {
        text: textoChamada,
        eventId,
        guiche: {
          numero: numeroGuiche,
          nome: nomeGuiche,
        },
      },
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${(process.env.TOKEN_API_INT?.trim() || process.env.TOKENAPIINT?.trim())}`,
      },
    });

    fastify.broadcast({
      type: "tcp",
      painelId,
      ts: Date.now(),
      data: mascararMensagem(out, formatoNome),
      payload: {
        call,
        followsAudio: true,
        guiche: {
          numero: numeroGuiche,
          nome: nomeGuiche,
        },
      },
    });

    flowAudit('tts_resposta', 'audio.geracao', { painelId, status: ttsRes.statusCode, durationMs: Date.now() - ttsStart });
    {
      // Preserve the call and speech fallback even if the TTS service rejects it.
      let ttsBody: TtsBody = { errorTTS: textoChamada };
      if (ttsRes.statusCode === 200) {
        try {
          const candidate = ttsRes.json();
          if (typeof candidate?.audioContent === 'string' || typeof candidate?.errorTTS === 'string') ttsBody = candidate;
        } catch { /* Use browser speech for a malformed TTS response. */ }
      }

      fastify.broadcast({
        type: "tts:audio",
        painelId,
        ts: Date.now(),
        payload: {
          call,
          traceId: call.id,
          eventId,
          ttsBody,
          guiche: {
            numero: numeroGuiche,
            nome: nomeGuiche,
          },
        },
      });
    }
  } catch (err) {
    fastify.log.error({ err, painelId }, "Erro ao tratar mensagem TCP");

    fastify.broadcast({
      type: "tcp",
      painelId,
      ts: Date.now(),
      data: mascararMensagem(raw, await formatoPainel()),
    });
  }
}

export default fp(async function painelClinux(fastify: FastifyInstance) {
  await carregarCachePainel(fastify);

  const allowedIps = parseAllowedIps(process.env.TCP_ALLOWED_IPS);
  if (allowedIps.size) fastify.log.info({ total: allowedIps.size }, "TCP 2345 restrito aos IPs de TCP_ALLOWED_IPS");

  const server = net.createServer((sock) => {
    if (!tcpAllowed(sock.remoteAddress, allowedIps)) {
      flowAudit('tcp_ip_recusado', 'tcp.2345', { code: 'TCP_IP_NOT_ALLOWED' });
      fastify.log.warn({ remoteAddress: sock.remoteAddress }, "Conexão TCP recusada: IP fora de TCP_ALLOWED_IPS");
      sock.destroy();
      return;
    }
    let queue = Promise.resolve()
    let queued = 0
    const frames = createTcpFrames((raw) => {
      if (queued >= 100) throw new Error('TCP_QUEUE_FULL')
      queued++
      queue = queue.then(() => auditContext.run({ flowId: randomUUID(), device: sock.remoteAddress ?? 'tcp' }, async () => {
        flowAudit('tcp_recebido', 'tcp.2345', { bytes: Buffer.byteLength(raw), code: 'TCP_RECEIVED' });
        const painelId = await descobrirPainelPorEvento(fastify, raw);

        fastify.log.info(
          {
            painelId,
            tcp: resumoTcp(raw),
            localAddress: sock.localAddress,
            remoteAddress: sock.remoteAddress,
          },
          "Mensagem TCP recebida"
        );

        await tratarMensagemTcp(fastify, raw, painelId);
      })).catch(() => flowAudit('tcp_tratamento_falhou', 'tcp.2345', { code: 'TCP_ROUTING_FAILED' })).finally(() => { queued-- });
    });
    sock.on("data", (buf) => {
      try { frames.push(buf) } catch (error) {
        flowAudit('tcp_mensagem_rejeitada', 'tcp.2345', { code: error instanceof Error ? error.message : 'TCP_INVALID_FRAME' });
        sock.destroy();
      }
    });
    sock.on('close', () => {
      if (frames.finish()) flowAudit('tcp_mensagem_incompleta', 'tcp.2345', { code: 'TCP_INCOMPLETE_FRAME' });
    });

    sock.on("error", (err) => {
      flowAudit('tcp_socket_erro', 'tcp.2345', { code: 'TCP_SOCKET_ERROR' });
      fastify.log.error({ err }, "Erro no socket TCP");
    });
  });

  server.listen(2345, "0.0.0.0", () => {
    fastify.log.info("TCP 2345 OK");
  });

  server.on("error", (err) => {
    fastify.log.error({ err }, "Erro no servidor TCP");
  });

  // Chamado ao salvar a configuração dos painéis ou das recepções, para valer na hora.
  fastify.decorate("recarregarCachePainel", async () => {
    await carregarCachePainel(fastify, true);
  });

  fastify.addHook("onClose", (_inst, done) => server.close(done));
});
