"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readLicenseAdminProof = readLicenseAdminProof;
const node_crypto_1 = require("node:crypto");
function readLicenseAdminProof(proof, authorization, method, pathname, body, now = Math.floor(Date.now() / 1000)) {
    if (typeof proof !== 'string' || proof.length > 4096 || typeof authorization !== 'string')
        return null;
    const bearer = /^Bearer\s+(.+)$/i.exec(authorization)?.[1];
    if (!bearer)
        return null;
    const [payload, signature, extra] = proof.split('.');
    if (!payload || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(signature))
        return null;
    const expected = (0, node_crypto_1.createHmac)('sha256', bearer).update(`license-admin:${payload}`).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !(0, node_crypto_1.timingSafeEqual)(received, expected))
        return null;
    try {
        const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const bodyHash = (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(body ?? null)).digest('hex');
        if (!Number.isSafeInteger(value.exp) || value.exp <= now || value.exp > now + 90 || value.method !== method ||
            value.path !== pathname || value.bodyHash !== bodyHash || typeof value.sub !== 'string' ||
            !/^[a-zA-Z0-9_.@-]{1,100}$/.test(value.sub) || !['database', 'bootstrap'].includes(value.source) ||
            !Array.isArray(value.permissions) || !value.permissions.some((p) => p === '*' || p === 'USUARIOS'))
            return null;
        if (value.source === 'database' && typeof value.version !== 'string')
            return null;
        if (value.source === 'bootstrap' && !value.permissions.includes('*'))
            return null;
        return { sub: value.sub, source: value.source, version: value.version, permissions: value.permissions };
    }
    catch {
        return null;
    }
}
