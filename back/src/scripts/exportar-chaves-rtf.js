"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nomeArquivoSeguro = nomeArquivoSeguro;
exports.nomeDaChave = nomeDaChave;
exports.salvarChave = salvarChave;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
function nomeArquivoSeguro(nome, id) {
    let base = (nome ?? '').normalize('NFC')
        .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_')
        .trim().replace(/[. ]+$/g, '').slice(0, 120);
    if (!base)
        base = `chave_${id}`;
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(base))
        base = `_${base}`;
    return base;
}
function nomeDaChave(nome, observacao, medico, codigo, id) {
    // Reserva espaço para cada parte, para nomes longos não eliminarem o autor.
    const titulo = (nome?.trim() || `chave_${id}`).slice(0, 40);
    const detalhe = observacao?.trim().slice(0, 30);
    const autor = (medico?.trim() || (codigo != null ? `medico_${codigo}` : '')).slice(0, 40);
    return `${titulo}${detalhe ? ` (${detalhe})` : ''}${autor ? ` - ${autor}` : ''}`;
}
async function salvarChave(diretorio, nome, id, conteudo) {
    const base = nomeArquivoSeguro(nome, id);
    let tentativa = 0;
    for (;;) {
        const sufixo = tentativa === 0 ? '' : tentativa === 1 ? `_${id}` : `_${id}_${tentativa}`;
        const arquivo = node_path_1.default.join(diretorio, `${base}${sufixo}.rtf`);
        try {
            // Não sobrescreve arquivos de outra chave ou de uma exportação anterior.
            await (0, promises_1.writeFile)(arquivo, Buffer.from(conteudo), { flag: 'wx' });
            return arquivo;
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
            tentativa++;
        }
    }
}
async function main() {
    await Promise.resolve().then(() => __importStar(require('dotenv/config')));
    const { prisma } = await Promise.resolve().then(() => __importStar(require('../../config/prismaDB')));
    try {
        const diretorio = node_path_1.default.resolve(process.argv[2] || process.env.CHAVES_RTF_OUTPUT_DIR || 'export/chaves-rtf');
        await (0, promises_1.mkdir)(diretorio, { recursive: true });
        let cursor;
        let encontrados = 0, exportados = 0, vazios = 0;
        for (;;) {
            const chaves = await prisma.laudos_chaves.findMany({
                select: { cd_chave: true, ds_chave: true, ds_observacao: true, cd_medico: true, bb_chave: true,
                    medicos: { select: { ds_medico: true } } },
                orderBy: { cd_chave: 'asc' }, take: 200,
                ...(cursor === undefined ? {} : { cursor: { cd_chave: cursor }, skip: 1 }),
            });
            if (!chaves.length)
                break;
            for (const chave of chaves) {
                encontrados++;
                if (!chave.bb_chave?.length) {
                    vazios++;
                    continue;
                }
                const nome = nomeDaChave(chave.ds_chave, chave.ds_observacao, chave.medicos?.ds_medico, chave.cd_medico, chave.cd_chave);
                await salvarChave(diretorio, nome, chave.cd_chave, chave.bb_chave);
                exportados++;
            }
            cursor = chaves[chaves.length - 1].cd_chave;
        }
        console.log(`Diretório: ${diretorio}`);
        console.log(`Chaves encontradas: ${encontrados}; arquivos exportados: ${exportados}; sem bb_chave: ${vazios}`);
    }
    finally {
        await prisma.$disconnect();
    }
}
if (require.main === module)
    main().catch(() => {
        console.error('Falha ao exportar laudos_chaves. Confira a conexão, permissões e diretório de saída. Arquivos já exportados foram preservados.');
        process.exitCode = 1;
    });
