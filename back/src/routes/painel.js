"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const net_1 = __importDefault(require("net"));
const prismalog_1 = require("../../config/prismalog");
const prismaDB_1 = require("../../config/prismaDB");
let cachePaineis = [];
let cacheNomeModalidadeParaId = new Map();
function normalizarTexto(valor) {
    return String(valor ?? "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
function extrairDadosTcp(raw) {
    const partes = raw.split("-").map((p) => p.trim());
    return {
        servico: partes[0] ?? "",
        senha: partes[2] ?? "",
        guiche: partes[3] ?? "",
        modalidadeNome: partes[4] ?? "",
        paciente: partes[5] ?? "",
    };
}
async function extrairNomePaciente(body, servico) {
    const fontes = servico === 'C'
        ? [body?.senhasnr, body?.senhasRawQuery]
        : [body?.senhasRawQuery, body?.senhas];
    for (const fonte of fontes) {
        if (!Array.isArray(fonte))
            continue;
        for (const row of fonte) {
            const pacienteRelacionado = row?.atendimentos?.[0]
                ?.pacientes_atendimentos_cd_pacienteTopacientes;
            const cdPaciente = Number(row?.cd_paciente ?? pacienteRelacionado?.cd_paciente);
            if (Number.isInteger(cdPaciente) && cdPaciente > 0) {
                const pacienteOriginal = await prismaDB_1.prisma.pacientes.findUnique({
                    where: { cd_paciente: cdPaciente },
                    select: { ds_paciente: true },
                });
                if (pacienteOriginal?.ds_paciente?.trim()) {
                    return pacienteOriginal.ds_paciente.trim();
                }
            }
            if (typeof row?.ds_paciente === 'string' && row.ds_paciente.trim()) {
                return row.ds_paciente.trim();
            }
            if (typeof pacienteRelacionado?.ds_paciente === 'string' && pacienteRelacionado.ds_paciente.trim()) {
                return pacienteRelacionado.ds_paciente.trim();
            }
        }
    }
    return undefined;
}
function montarNomeGuichePadrao(numero) {
    const numeroLimpo = String(numero ?? "").trim();
    if (!numeroLimpo) {
        return "Guichê";
    }
    return `Guichê ${numeroLimpo}`;
}
async function buscarNomeGuiche(numero) {
    const numeroLimpo = String(numero ?? "").trim();
    if (!numeroLimpo) {
        return "Guichê";
    }
    const numeroFormatado = numeroLimpo.padStart(2, "0");
    const guiche = await prismalog_1.PrismaLog.guiches.findUnique({
        where: { numero: numeroFormatado },
    });
    if (guiche?.ativo && guiche.nome?.trim()) {
        return guiche.nome.trim();
    }
    return montarNomeGuichePadrao(numeroFormatado);
}
async function carregarCachePainel(fastify) {
    try {
        const config = await prismalog_1.PrismaLog.configuracao_painel.findUnique({
            where: { id: 1 },
        });
        cachePaineis =
            config?.ativo && Array.isArray(config.paineis)
                ? config.paineis
                : [];
        const modalidades = await prismaDB_1.prisma.modalidades.findMany({
            select: {
                cd_modalidade: true,
                ds_modalidade: true,
            },
        });
        cacheNomeModalidadeParaId = new Map();
        for (const modalidade of modalidades) {
            cacheNomeModalidadeParaId.set(normalizarTexto(modalidade.ds_modalidade), Number(modalidade.cd_modalidade));
        }
        fastify.log.info({
            totalPaineis: cachePaineis.length,
            totalModalidades: cacheNomeModalidadeParaId.size,
        }, "Cache dos painéis carregado");
    }
    catch (error) {
        fastify.log.error({ error }, "Erro ao carregar cache dos painéis");
    }
}
async function descobrirPainelPorEvento(fastify, raw) {
    try {
        const { servico, modalidadeNome } = extrairDadosTcp(raw);
        if (!modalidadeNome) {
            return 1;
        }
        let cdModalidade = cacheNomeModalidadeParaId.get(normalizarTexto(modalidadeNome));
        if (!cdModalidade || cachePaineis.length === 0) {
            await carregarCachePainel(fastify);
            cdModalidade = cacheNomeModalidadeParaId.get(normalizarTexto(modalidadeNome));
        }
        if (!cdModalidade) {
            fastify.log.warn({ modalidadeNome, raw }, "Modalidade não encontrada no cache");
            return 1;
        }
        const tipoServico = servico === "D"
            ? "marcacao"
            : servico === "C"
                ? "resultado"
                : "atendimento";
        const painel = cachePaineis.find((p) => {
            if (!p.ativo)
                return false;
            if (p.universal?.[tipoServico] === true) {
                return true;
            }
            const lista = Array.isArray(p[tipoServico])
                ? p[tipoServico].map(Number)
                : [];
            return lista.includes(Number(cdModalidade));
        });
        return painel?.painel ?? 1;
    }
    catch (error) {
        fastify.log.error({ error, raw }, "Erro ao descobrir painel pelo evento TCP");
        return 1;
    }
}
async function tratarMensagemTcp(fastify, raw, painelId) {
    try {
        const { servico } = extrairDadosTcp(raw);
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
        const body = res.json();
        const dsPaciente = await extrairNomePaciente(body, servico);
        let out = raw;
        if (dsPaciente) {
            const re56 = /^((?:[^-]*-){5})\s*([^-]*?)\s*(-)/;
            const m56 = re56.exec(out);
            if (m56) {
                const campo6 = (m56[2] ?? "").trim();
                if (!campo6) {
                    out = out.replace(re56, (_f, g1, _c6, g3) => `${g1}${dsPaciente}${g3}`);
                }
            }
        }
        const nomeAux = out.match(/^(?:[^-]*-){5}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "SEM NOME";
        const guicheAux = out.match(/^(?:[^-]*-){3}\s*([^-]*?)\s*-/)?.[1]?.trim() ?? "";
        const numeroGuiche = String(guicheAux ?? "").trim().padStart(2, "0");
        const nomeGuiche = await buscarNomeGuiche(guicheAux);
        const textoChamada = `${nomeAux}, ${nomeGuiche}.`;
        const date = new Date();
        const datecomplete = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const eventId = `${textoChamada}-${datecomplete}`;
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
                Authorization: `Bearer ${process.env.TOKENAPIINT}`,
            },
        });
        fastify.broadcast({
            type: "tcp",
            painelId,
            ts: Date.now(),
            data: out,
            payload: {
                guiche: {
                    numero: numeroGuiche,
                    nome: nomeGuiche,
                },
            },
        });
        if (ttsRes.statusCode === 200) {
            const ttsBody = ttsRes.json();
            fastify.broadcast({
                type: "tts:audio",
                painelId,
                ts: Date.now(),
                payload: {
                    eventId,
                    ttsBody,
                    guiche: {
                        numero: numeroGuiche,
                        nome: nomeGuiche,
                    },
                },
            });
        }
    }
    catch (err) {
        fastify.log.error({ err, painelId }, "Erro ao tratar mensagem TCP");
        fastify.broadcast({
            type: "tcp",
            painelId,
            ts: Date.now(),
            data: raw,
        });
    }
}
exports.default = (0, fastify_plugin_1.default)(async function painelClinux(fastify) {
    await carregarCachePainel(fastify);
    const server = net_1.default.createServer((sock) => {
        sock.on("data", (buf) => {
            const raw = buf.toString("utf8");
            void (async () => {
                const painelId = await descobrirPainelPorEvento(fastify, raw);
                fastify.log.info({
                    painelId,
                    raw,
                    localAddress: sock.localAddress,
                    remoteAddress: sock.remoteAddress,
                }, "Mensagem TCP recebida");
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
