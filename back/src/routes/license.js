"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.licensingRoutes = licensingRoutes;
const prismalog_1 = require("../../config/prismalog");
const persistent_audit_1 = require("../lib/persistent-audit");
const license_manager_1 = require("../lib/license-manager");
const license_admin_proof_1 = require("../lib/license-admin-proof");
const messages = {
    LICENSE_CONFIG_INVALID: 'Configure LICENSE_SERVER_URL e LICENSE_PUBLIC_KEY_JWK no ambiente do backend e recrie o container.',
    LICENSE_FILE_INVALID: 'Arquivo inválido. Envie o JSON de acesso da instalação baixado no painel de licenças.',
    LICENSE_CREDENTIAL_INVALID: 'A credencial não foi reconhecida. Baixe uma nova credencial no painel de licenças.',
    LICENSE_NOT_ACTIVE: 'Esta licença está bloqueada ou expirada no serviço de licenças.',
    LICENSE_SIGNATURE_INVALID: 'Não foi possível confirmar a autenticidade da licença.',
    LICENSE_VERSION_INVALID: 'O serviço retornou uma versão antiga da licença.',
    LICENSE_SERVER_UNREACHABLE: 'Não foi possível conectar ao serviço de licenças. Confira a conexão do backend com a internet.',
    LICENSE_SERVER_UNAVAILABLE: 'O serviço de licenças está temporariamente indisponível.',
    LICENSE_STORAGE_FAILED: 'Não foi possível guardar a licença. Confira o volume persistente do backend.',
};
async function authorized(request) {
    const actor = (0, license_admin_proof_1.readLicenseAdminProof)(request.headers['x-license-admin-proof'], request.headers.authorization, request.method, request.url.split('?')[0], request.body);
    if (!actor)
        return null;
    if (actor.source === 'database') {
        const user = await prismalog_1.PrismaLog.adminUser.findUnique({ where: { username: actor.sub } });
        if (!user?.active || user.mustChangePassword || user.updatedAt.toISOString() !== actor.version ||
            !user.permissions.some(p => p === '*' || p === 'USUARIOS'))
            return null;
    }
    return actor;
}
async function licensingRoutes(app, manager) {
    app.addHook('preHandler', async (request, reply) => {
        if (!(0, license_manager_1.requiresLicense)(request.method, request.routeOptions.url ?? request.url.split('?')[0]))
            return;
        const status = manager.status();
        if (!status.allowed)
            return reply.code(503).header('Cache-Control', 'no-store').send({
                error: 'Totem temporariamente indisponível. Procure a recepção.', code: 'LICENSE_UNAVAILABLE',
            });
    });
    // Minimal availability is safe for the kiosk; credentials and IDs are admin-only.
    app.get('/clinux/license/availability', async (_request, reply) => {
        reply.header('Cache-Control', 'no-store');
        return { allowed: manager.status().allowed };
    });
    app.get('/clinux/license', async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        if (!(await authorized(request)))
            return reply.code(403).send({ error: 'Acesso não permitido.' });
        return manager.status();
    });
    app.post('/clinux/license/activate', { bodyLimit: 8192 }, async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        const actor = await authorized(request);
        if (!actor)
            return reply.code(403).send({ error: 'Acesso não permitido.' });
        try {
            const status = await manager.activate(request.body);
            (0, persistent_audit_1.recordAudit)({ category: 'ADMIN', actor: actor.sub, action: 'licenca_enviada', step: 'licenciamento',
                metadata: { state: status.state, installationId: status.installationId, outcome: status.allowed ? 'CONCLUIDO' : 'BLOQUEADO' } });
            return status;
        }
        catch (error) {
            const code = error instanceof license_manager_1.LicenseError ? error.code : 'LICENSE_STORAGE_FAILED';
            (0, persistent_audit_1.recordAudit)({ category: 'ADMIN', actor: actor.sub, action: 'licenca_envio_falhou', step: 'licenciamento', metadata: { code, outcome: 'FALHOU' } });
            return reply.code(error instanceof license_manager_1.LicenseError ? error.status : 503).send({ error: messages[code] ?? 'Não foi possível validar a licença.', code });
        }
    });
    app.post('/clinux/license/refresh', { bodyLimit: 1024 }, async (request, reply) => {
        reply.header('Cache-Control', 'no-store');
        const actor = await authorized(request);
        if (!actor)
            return reply.code(403).send({ error: 'Acesso não permitido.' });
        await manager.refresh();
        const status = manager.status();
        (0, persistent_audit_1.recordAudit)({ category: 'ADMIN', actor: actor.sub, action: 'licenca_consultada', step: 'licenciamento', metadata: { state: status.state, outcome: status.errorCode ? 'FALHOU' : 'CONCLUIDO' } });
        return status;
    });
}
