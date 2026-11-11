"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readLicenseTrust = readLicenseTrust;
const node_crypto_1 = require("node:crypto");
// Read server-only configuration. Uploaded licenses cannot supply a key or URL.
function readLicenseTrust(env = process.env) {
    try {
        const url = new URL(env.LICENSE_SERVER_URL?.trim() ?? '');
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/')
            throw new Error();
        const publicJwk = JSON.parse(env.LICENSE_PUBLIC_KEY_JWK ?? '');
        if (!publicJwk || publicJwk.kty !== 'OKP' || publicJwk.crv !== 'Ed25519' ||
            typeof publicJwk.x !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(publicJwk.x) ||
            Object.keys(publicJwk).some(key => !['kty', 'crv', 'x'].includes(key)))
            throw new Error();
        (0, node_crypto_1.createPublicKey)({ key: publicJwk, format: 'jwk' });
        const keyId = env.LICENSE_KEY_ID?.trim() || 'totem-licencas-v1';
        const issuer = env.LICENSE_ISSUER?.trim() || 'urn:totem:licencas';
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(keyId) || issuer.length > 200)
            throw new Error();
        return { url: url.origin, publicJwk, keyId, issuer, audience: 'totem-backend' };
    }
    catch {
        throw new Error('LICENSE_CONFIG_INVALID');
    }
}
