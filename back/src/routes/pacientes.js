"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pacientesRoute = pacientesRoute;
const zod_1 = require("zod");
const prismaDB_1 = require("../../config/prismaDB");
const search_validation_1 = require("../lib/search-validation");
const patient_diagnostics_1 = require("../lib/patient-diagnostics");
const identification_attempts_1 = require("../lib/identification-attempts");
const flow_audit_1 = require("../lib/flow-audit");
const decoy_dates_1 = require("../lib/decoy-dates");
const qr_guard_1 = require("../lib/qr-guard");
const patientQuery = zod_1.z.union([
    zod_1.z.object({ tipo: zod_1.z.literal('RESET'), ds_paciente: zod_1.z.string().max(150).optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.undefined().optional(), cd_paciente: search_validation_1.positiveId }).strict(),
    // QR "paciente-atendimento": o atendimento precisa pertencer ao paciente.
    zod_1.z.object({ tipo: zod_1.z.literal('QRATEND'), cd_paciente: search_validation_1.positiveId, cd_atendimento: search_validation_1.positiveId }).strict(),
    // QR antigo (só o código do paciente): aceito enquanto QR_LEGADO não for "false" no env.backend.
    zod_1.z.object({ tipo: zod_1.z.literal('QRLEGADO'), cd_paciente: search_validation_1.positiveId }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('ID'), ds_cpf: search_validation_1.cpf, dt_nascimento: search_validation_1.birthDate }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('NOMEDATA'), ds_paciente: search_validation_1.patientName, dt_nascimento: search_validation_1.birthDate, cd_paciente: search_validation_1.positiveId.optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('NOME'), ds_paciente: search_validation_1.patientName, dt_nascimento: search_validation_1.birthDate.optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('MASK').optional(), ds_cpf: search_validation_1.cpf }).strict(),
    zod_1.z.object({ tipo: zod_1.z.literal('DATA').optional(), dt_nascimento: search_validation_1.birthDate, ds_paciente: search_validation_1.patientName.optional() }).strict(),
    zod_1.z.object({ tipo: zod_1.z.undefined().optional(), ds_paciente: search_validation_1.prefixName }).strict(),
]);
async function pacientesRoute(fastify) {
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
        // Contador de UX por fluxo (o totem zera via RESET); a proteção contra força bruta é o contador por alvo abaixo.
        const headerFlow = request.headers['x-flow-id'];
        const flow = typeof headerFlow === 'string' && /^[a-zA-Z0-9_.:-]{1,100}$/.test(headerFlow) ? headerFlow : request.id;
        if (input.tipo === 'RESET') {
            const tentativas = (0, identification_attempts_1.identificationAttempts)(flow, 'reset');
            return reply.send([{ tentativas }]);
        }
        if (input.tipo === 'QRLEGADO' && process.env.QR_LEGADO === 'false') {
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'qr_legado_desativado', ramo: 'QRLEGADO' });
            return reply.code(403).send({ error: 'QR Code antigo desativado.', code: 'QR_LEGADO_DESATIVADO' });
        }
        if (input.tipo === 'QRATEND') {
            if ((0, qr_guard_1.qrBlocked)()) {
                (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'qr_bloqueado', ramo: 'QRATEND' });
                return reply.code(429).send({ error: 'Leitura de QR temporariamente bloqueada.', code: 'QR_BLOQUEADO' });
            }
            const hoje = (0, search_validation_1.todayBrazil)();
            const seisMesesAtras = new Date(hoje);
            seisMesesAtras.setUTCMonth(seisMesesAtras.getUTCMonth() - 6);
            const atendimento = await prismaDB_1.prisma.atendimentos.findFirst({
                where: {
                    cd_atendimento: input.cd_atendimento, cd_paciente: input.cd_paciente,
                    dt_data: { gte: seisMesesAtras },
                    OR: [{ ds_status: null }, { ds_status: { not: 1 } }], // 1 = cancelado
                },
                select: { pacientes_atendimentos_cd_pacienteTopacientes: { select: { cd_paciente: true, ds_paciente: true, dt_nascimento: true } } },
            });
            const paciente = atendimento?.pacientes_atendimentos_cd_pacienteTopacientes;
            if (!paciente) {
                const bloqueou = (0, qr_guard_1.qrFailure)();
                (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: bloqueou ? 'qr_bloqueado_por_erros' : 'qr_nao_confere', ramo: 'QRATEND', duracaoMs: Date.now() - inicio });
                if (bloqueou)
                    (0, flow_audit_1.flowAudit)('qr_bloqueado', 'identificacao', { outcome: 'FALHOU', motivo: 'muitos_qr_invalidos' });
                return reply.send([]);
            }
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'qr_confere', ramo: 'QRATEND', duracaoMs: Date.now() - inicio });
            return reply.send([paciente]);
        }
        const confirmacao = input.tipo === 'ID' || input.tipo === 'NOMEDATA';
        // Erros também contam pelo paciente procurado: trocar x-flow-id, aparelho ou chamar RESET não renova as tentativas.
        const alvo = confirmacao ? (0, identification_attempts_1.identificationTarget)(input) : null;
        if (confirmacao && ((0, identification_attempts_1.identificationAttempts)(flow, 'read') === 0 || (alvo && (0, identification_attempts_1.identificationAttempts)(alvo, 'read', Date.now(), identification_attempts_1.TARGET) === 0))) {
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'identificacao_bloqueada', flow, alvoBloqueado: Boolean(alvo && (0, identification_attempts_1.identificationAttempts)(alvo, 'read', Date.now(), identification_attempts_1.TARGET) === 0) });
            return reply.send([{ tentativas: 0 }]);
        }
        const where = {};
        let select;
        if ('cd_paciente' in input && input.tipo !== 'NOMEDATA') {
            where.cd_paciente = input.cd_paciente;
            select = { cd_paciente: true, ds_paciente: true, dt_nascimento: true };
        }
        else if (input.tipo === 'ID') {
            where.ds_cpf = input.ds_cpf;
            where.dt_nascimento = input.dt_nascimento;
            select = { cd_paciente: true, ds_paciente: true, dt_nascimento: true };
        }
        else if (input.tipo === 'NOMEDATA' || input.tipo === 'NOME') {
            if (input.tipo === 'NOMEDATA' && input.cd_paciente !== undefined)
                where.cd_paciente = input.cd_paciente;
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
        // A busca inicial por data só precisa confirmar a existência daquela data.
        const somenteData = 'dt_nascimento' in input && input.tipo === undefined && !('ds_paciente' in input);
        const porCodigo = where.cd_paciente !== undefined;
        const limite = somenteData || porCodigo ? 1 : input.tipo === 'ID' ? 2 : search_validation_1.SEARCH_LIMIT + 1;
        const ordenarPorNome = !somenteData && !porCodigo && !('ds_cpf' in input);
        const consultar = () => prismaDB_1.prisma.pacientes.findMany({ where, select,
            ...(!somenteData && distinct.length ? { distinct } : {}),
            ...(ordenarPorNome ? { orderBy: { ds_paciente: 'asc' } } : {}), take: limite });
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
        if (confirmacao && !pacientes.length) {
            let tentativas = (0, identification_attempts_1.identificationAttempts)(flow, 'fail');
            if (alvo)
                tentativas = Math.min(tentativas, (0, identification_attempts_1.identificationAttempts)(alvo, 'fail', Date.now(), identification_attempts_1.TARGET));
            (0, patient_diagnostics_1.patientDiagnostic)(request.id, { resultado: 'identificacao_incorreta', tentativas, flow });
            return reply.send([{ tentativas }]);
        }
        if (confirmacao && pacientes.length === 1) {
            (0, identification_attempts_1.identificationAttempts)(flow, 'reset');
            if (alvo)
                (0, identification_attempts_1.identificationAttempts)(alvo, 'reset', Date.now(), identification_attempts_1.TARGET);
        }
        if (input.tipo === 'NOME') {
            const datas = [...new Set(pacientes.map(p => p.dt_nascimento?.toISOString()).filter((data) => Boolean(data)))];
            if (datas.length > 0 && datas.length < 10)
                return reply.send((0, decoy_dates_1.decoyBirthDates)(input.ds_paciente, datas));
            return reply.send(datas.map(dt_nascimento => ({ dt_nascimento })));
        }
        if (input.tipo === 'MASK' && pacientes.length > 0 && pacientes.length < 10) {
            return reply.send((0, decoy_dates_1.decoyBirthDates)(input.ds_cpf, pacientes.map(p => p.dt_nascimento)));
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
            (0, flow_audit_1.flowAudit)('cadastro_paciente_iniciado', 'cadastro', { tamanhoNome: ds_paciente.length });
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
                (0, flow_audit_1.flowAudit)('cadastro_paciente_falhou', 'cadastro', { code: 'P2002', outcome: 'FALHOU' });
                return reply.status(500).send({ error: 'Não foi possível gerar um ID único' });
            }
            (0, flow_audit_1.flowAudit)('cadastro_paciente_confirmado', 'cadastro', { cd_paciente: pacientes.cd_paciente, outcome: 'CONCLUIDO' });
            return reply.send(pacientes);
        }
        catch (err) {
            const code = typeof err?.code === 'string' && /^[A-Z0-9_]{1,50}$/.test(err.code) ? err.code : 'PATIENT_CREATE_ERROR';
            (0, flow_audit_1.flowAudit)('cadastro_paciente_falhou', 'cadastro', { code, outcome: 'DESCONHECIDO' });
            return reply.status(400).send({
                error: "Requisição inválida",
                details: err?.errors ?? String(err),
            });
        }
    });
}
