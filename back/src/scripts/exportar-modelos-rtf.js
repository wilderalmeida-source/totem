"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const prismaDB_1 = require("../../config/prismaDB");
function nomeArquivoSeguro(nome, cdModelo) {
    let seguro = nome
        .normalize('NFC')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .replace(/[. ]+$/g, '')
        .trim();
    if (!seguro)
        seguro = `modelo_${cdModelo}`;
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(seguro))
        seguro = `_${seguro}`;
    return seguro;
}
async function exportar() {
    const argumentoDiretorio = process.argv[2];
    const diretorio = node_path_1.default.resolve(argumentoDiretorio || process.env.MODELOS_RTF_OUTPUT_DIR || 'export/modelos-rtf');
    await (0, promises_1.mkdir)(diretorio, { recursive: true });
    const modelos = await prismaDB_1.prisma.modelos.findMany({
        select: { cd_modelo: true, ds_modelo: true, bb_modelo: true },
        orderBy: { cd_modelo: 'asc' },
    });
    const nomesUsados = new Set();
    let exportados = 0;
    let semConteudo = 0;
    for (const modelo of modelos) {
        if (!modelo.bb_modelo || modelo.bb_modelo.length === 0) {
            semConteudo += 1;
            console.warn(`Modelo ${modelo.cd_modelo} (${modelo.ds_modelo}) sem conteúdo em bb_modelo.`);
            continue;
        }
        const baseOriginal = nomeArquivoSeguro(modelo.ds_modelo, modelo.cd_modelo);
        let base = baseOriginal;
        let sequencia = 2;
        while (nomesUsados.has(base.toLocaleLowerCase('pt-BR'))) {
            base = `${baseOriginal}_${sequencia}`;
            sequencia += 1;
        }
        nomesUsados.add(base.toLocaleLowerCase('pt-BR'));
        await (0, promises_1.writeFile)(node_path_1.default.join(diretorio, `${base}.rtf`), Buffer.from(modelo.bb_modelo));
        exportados += 1;
    }
    console.log(`Diretório: ${diretorio}`);
    console.log(`Modelos encontrados: ${modelos.length}`);
    console.log(`Arquivos RTF exportados: ${exportados}`);
    console.log(`Modelos sem bb_modelo: ${semConteudo}`);
}
exportar()
    .catch((error) => {
    console.error('Falha ao exportar modelos de laudo:', error);
    process.exitCode = 1;
})
    .finally(async () => {
    await prismaDB_1.prisma.$disconnect();
});
