"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pacientesRoute = pacientesRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
const search_validation_1 = require("../lib/search-validation");
const patient_diagnostics_1 = require("../lib/patient-diagnostics");
const identification_attempts_1 = require("../lib/identification-attempts");
const patientQuery = zod_1.z.union([
    zod_1.z.object({ tipo: zod_1.z.literal('RESET'), ds_paciente: zod_1.z.string().max(150).optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.undefined().optional(), cd_paciente: search_validation_1.positiveId }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('ID'), ds_cpf: search_validation_1.cpf, dt_nascimento: search_validation_1.birthDate }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('NOMEDATA'), ds_paciente: search_validation_1.patientName, dt_nascimento: search_validation_1.birthDate }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('NOME'), ds_paciente: search_validation_1.patientName, dt_nascimento: search_validation_1.birthDate.optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('MASK').optional(), ds_cpf: search_validation_1.cpf }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('DATA').optional(), dt_nascimento: search_validation_1.birthDate, ds_paciente: search_validation_1.patientName.optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.undefined().optional(), ds_paciente: search_validation_1.prefixName }).strict(),
]);
async function pacientesRoute(fastify) {
    function gerarECompletarDezDatas(datasReaisBanco) {
        const listaDatasFormata = [];
        // 1. FORÇA a conversão de todas as datas reais para string ISO e adiciona na lista
        datasReaisBanco.forEach(data => {
            if (data) {
                try {
                    let dataISO;
                    // Se já for um objeto Date nativo
                    if (data instanceof Date) {
                        dataISO = data.toISOString();
                    }
                    // Se for uma string (comum ao trafegar dados ou de certos bancos)
                    else if (typeof data === 'string') {
                        dataISO = new Date(data).toISOString();
                    }
                    else {
                        dataISO = new Date(data).toISOString();
                    }
                    // Só adiciona se for uma string ISO válida e não estiver duplicada
                    if (dataISO && !listaDatasFormata.includes(dataISO)) {
                        listaDatasFormata.push(dataISO);
                    }
                }
                catch (e) {
                    console.error("Erro crítico ao processar data real do banco:", data, e);
                }
            }
        });
        // 2. Intervalo de anos para preencher as datas falsas
        const anoInicio = 1975;
        const anoFim = 2005;
        // 3. Preenche até ter exatamente 10 strings de datas distintas
        while (listaDatasFormata.length < 10) {
            const ano = Math.floor(Math.random() * (anoFim - anoInicio + 1)) + anoInicio;
            const mes = Math.floor(Math.random() * 12);
            const dia = Math.floor(Math.random() * 28) + 1;
            const dataFalsaUTC = new Date(Date.UTC(ano, mes, dia, 0, 0, 0, 0));
            const dataFalsaISO = dataFalsaUTC.toISOString();
            if (!listaDatasFormata.includes(dataFalsaISO)) {
                listaDatasFormata.push(dataFalsaISO);
            }
        }
        // 4. Embaralha tudo (reais e falsas juntas) usando Fisher-Yates
        for (let i = listaDatasFormata.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [listaDatasFormata[i], listaDatasFormata[j]] = [listaDatasFormata[j], listaDatasFormata[i]];
        }
        // 5. Retorna no formato exato que o seu front-end precisa
        return listaDatasFormata.map(dataStr => ({
            dt_nascimento: dataStr
        }));
    }
    fastify.get('/clinux/pacientes', async (request, reply) => {
        const inicio = Date.now();
        const recebido = (0, patient_diagnostics_1.describePatientInput)(request.query);
        const query = patientQuery.safeParse(request.query ?? {});
        if (!query.success) {
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { recebido, etapa: 'validacao_zod', resultado: 'filtros_invalidos', prismaExecutado: false,
                validacaoCampos: {
                    nomeValido: search_validation_1.patientName.safeParse(request.query?.ds_paciente).success,
                    nascimentoValido: search_validation_1.birthDate.safeParse(request.query?.dt_nascimento).success,
                    formatoNascimentoEsperado: 'AAAA-MM-DD ou ISO UTC; data deve existir no calendario',
                    cpfValido: search_validation_1.cpf.safeParse(request.query?.ds_cpf).success,
                },
                erros: query.error.issues.map(issue => ({ campo: issue.path.join('.'), codigo: issue.code })) });
            return reply.code(400).send({ error: 'Filtros de paciente inválidos.' });
        }
        const input = query.data;
        // Contador de UX por fluxo; nao substitui protecao contra forca bruta.
        const headerFlow = request.headers['x-flow-id'];
        const flow = typeof headerFlow === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(headerFlow) ? headerFlow : request.id;
        if (input.tipo === 'RESET') {
            const tentativas = (0, identification_attempts_1.identificationAttempts)(flow, 'reset');
            return reply.send([{ tentativas }]);
        }
        if ((input.tipo === 'ID' || input.tipo === 'NOMEDATA') && (0, identification_attempts_1.identificationAttempts)(flow, 'read') === 0) {
            return reply.send([{ tentativas: 0 }]);
        }
        const where = {};
        let select;
        if ('cd_paciente' in input) {
            where.cd_paciente = input.cd_paciente;
            select = { cd_paciente: true, ds_paciente: true, dt_nascimento: true };
        }
        else if (input.tipo === 'ID') {
            where.ds_cpf = input.ds_cpf;
            where.dt_nascimento = input.dt_nascimento;
            select = { cd_paciente: true, ds_paciente: true, dt_nascimento: true };
        }
        else if (input.tipo === 'NOMEDATA' || input.tipo === 'NOME') {
            // Busca candidatos; a igualdade do nome completo normalizado é conferida abaixo.
            // Escapa os curingas LIKE para que caracteres do nome sejam literais.
            where.ds_paciente = { contains: input.ds_paciente.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' };
            if (input.dt_nascimento)
                where.dt_nascimento = input.dt_nascimento;
            select = input.tipo === 'NOMEDATA'
                ? { cd_paciente: true, ds_paciente: true, dt_nascimento: true }
                : { ds_paciente: true, dt_nascimento: true };
        }
        else if ('ds_cpf' in input) {
            where.ds_cpf = input.ds_cpf;
            select = { dt_nascimento: true };
        }
        else if ('dt_nascimento' in input) {
            where.dt_nascimento = input.dt_nascimento;
            if (input.ds_paciente)
                where.ds_paciente = { contains: input.ds_paciente, mode: 'insensitive' };
            select = input.tipo === 'DATA'
                ? { cd_paciente: true, ds_paciente: true, dt_nascimento: true }
                : { dt_nascimento: true };
        }
        else {
            where.ds_paciente = { startsWith: input.ds_paciente, mode: 'insensitive' };
            select = { ds_paciente: true };
        }
        const distinct = !('cd_paciente' in input) && input.tipo !== 'DATA' && input.tipo !== 'ID' && input.tipo !== 'NOMEDATA'
            ? ('dt_nascimento' in input || 'ds_cpf' in input || input.tipo === 'NOME' ? ['dt_nascimento'] : ['ds_paciente'])
            : [];
        if (input.tipo === 'NOME')
            distinct.splice(0, distinct.length, 'ds_paciente', 'dt_nascimento');
        const consultar = () => prismaDB_1.prisma.pacientes.findMany({ where, select, distinct, orderBy: { ds_paciente: 'asc' }, take: search_validation_1.SEARCH_LIMIT + 1 });
        let pacientes;
        try {
            pacientes = await consultar();
        }
        catch (error) {
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { recebido, normalizado: (0, patient_diagnostics_1.describePatientInput)(input), ramo: input.tipo ?? 'FILTRO',
                operacao: 'prisma.pacientes.findMany', resultado: 'erro_prisma', duracaoMs: Date.now() - inicio,
                codigo: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'DESCONHECIDO' });
            throw error;
        }
        const retornados = pacientes.length;
        (0, patient_diagnostics_1.patientDiagnostic)(request.id, { recebido, normalizado: (0, patient_diagnostics_1.describePatientInput)(input), ramo: input.tipo ?? 'FILTRO',
            operacao: 'prisma.pacientes.findMany', duracaoMs: Date.now() - inicio,
            filtro: { ...where, ds_cpf: where.ds_cpf ? '[omitido]' : undefined },
            resultado: retornados > search_validation_1.SEARCH_LIMIT ? 'limite_excedido' : 'consulta_concluida', retornados,
            correspondenciasNomeCompleto: input.tipo === 'NOME' || input.tipo === 'NOMEDATA'
                ? pacientes.filter(p => p.ds_paciente?.trim().toUpperCase() === input.ds_paciente.trim().toUpperCase()).length : undefined,
            amostra: pacientes.slice(0, 10).map(p => (0, patient_diagnostics_1.describePatientInput)(p)), amostraLimitada: retornados > 10 });
        if (pacientes.length > search_validation_1.SEARCH_LIMIT) {
            pacientes = pacientes.slice(0, search_validation_1.SEARCH_LIMIT);
            reply.header('X-Result-Truncated', 'true');
        }
        if (input.tipo === 'NOME' || input.tipo === 'NOMEDATA') {
            const nome = input.ds_paciente.trim().toUpperCase();
            pacientes = pacientes.filter(p => p.ds_paciente?.trim().toUpperCase() === nome);
        }
        if ((input.tipo === 'ID' || input.tipo === 'NOMEDATA') && !pacientes.length) {
            const tentativas = (0, identification_attempts_1.identificationAttempts)(flow, 'fail');
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'identificacao_incorreta', tentativas, flow });
            return reply.send([{ tentativas }]);
        }
        if ((input.tipo === 'ID' || input.tipo === 'NOMEDATA') && pacientes.length === 1)
            (0, identification_attempts_1.identificationAttempts)(flow, 'reset');
        if (input.tipo === 'NOME') {
            const datas = [...new Set(pacientes.map(p => p.dt_nascimento?.toISOString()).filter((data) => Boolean(data)))];
            if (datas.length > 0 && datas.length < 10)
                return reply.send(gerarECompletarDezDatas(datas));
            return reply.send(datas.map(dt_nascimento => ({ dt_nascimento })));
        }
        if (input.tipo === 'MASK' && pacientes.length > 0 && pacientes.length < 10) {
            return reply.send(gerarECompletarDezDatas(pacientes.map(p => p.dt_nascimento)));
        }
        return reply.send(pacientes);
    });
    fastify.post("/clinux/pacientes", async (request, reply) => {
        const bodySchema = zod_1.z.object({
            ds_paciente: zod_1.z.string(),
            dt_nascimento: zod_1.z.string().trim().min(1).optional()
        });
        try {
            const { ds_paciente, dt_nascimento } = bodySchema.parse(request.body ?? {});
            let pacientes = null;
            let tentativas = 0;
            while (tentativas < 3) {
                try {
                    pacientes = await prismaDB_1.prisma.pacientes.create({
                        data: {
                            ds_paciente: ds_paciente.toUpperCase(),
                            dt_nascimento,
                            cd_funcionario: 50
                        },
                        select: { ds_paciente: true, dt_nascimento: true, cd_paciente: true },
                    });
                    break;
                }
                catch (e) {
                    if (e.code === 'P2002') {
                        tentativas++;
                    }
                    else {
                        throw e;
                    }
                }
            }
            if (!pacientes) {
                return reply.status(500).send({ error: 'Não foi possível gerar um ID único' });
            }
            return reply.send(pacientes);
        }
        catch (err) {
            return reply.status(400).send({
                error: "Requisição inválida",
                details: err?.errors ?? String(err),
            });
        }
    });
}
