"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LicenseManager = exports.LicenseError = exports.licenseUpload = void 0;
exports.verifyLicenseToken = verifyLicenseToken;
exports.requiresLicense = requiresLicense;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const node_perf_hooks_1 = require("node:perf_hooks");
const zod_1 = require("zod");
const license_trust_1 = require("./license-trust");
exports.licenseUpload = zod_1.z.object({
    installationId: zod_1.z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,79}$/),
    licenseId: zod_1.z.string().uuid(),
    credential: zod_1.z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
class LicenseError extends Error {
    code;
    status;
    constructor(code, status = 503) {
        super(code);
        this.code = code;
        this.status = status;
    }
}
exports.LicenseError = LicenseError;
function verifyLicenseToken(token, credentials, trust, now, nonce) {
    try {
        if (typeof token !== 'string' || token.length > 8192)
            throw new Error();
        const parts = token.split('.');
        if (parts.length !== 3 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part)))
            throw new Error();
        const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
        if (header.alg !== 'EdDSA' || header.typ !== 'JWT' || header.kid !== trust.keyId)
            throw new Error();
        if (!(0, node_crypto_1.verify)(null, Buffer.from(`${parts[0]}.${parts[1]}`), (0, node_crypto_1.createPublicKey)({ key: trust.publicJwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url')))
            throw new Error();
        const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (claims.iss !== trust.issuer || claims.aud !== trust.audience || claims.sub !== credentials.licenseId ||
            claims.installationId !== credentials.installationId || !['active', 'blocked', 'expired'].includes(claims.status) ||
            typeof claims.nonce !== 'string' || !/^[a-zA-Z0-9_-]{22,128}$/.test(claims.nonce) || (nonce !== undefined && claims.nonce !== nonce))
            throw new Error();
        if (![claims.iat, claims.nbf, claims.exp, claims.licenseExpiresAt, claims.version, claims.nextCheckAt].every(Number.isSafeInteger) ||
            [claims.iat, claims.nbf, claims.exp, claims.licenseExpiresAt, claims.nextCheckAt].some(value => value <= 0 || value > 253402300799) ||
            claims.version < 1 || claims.iat > now + 30 || claims.nbf !== claims.iat || claims.exp <= claims.iat ||
            claims.exp - claims.iat > 604800 || claims.nextCheckAt !== claims.iat + 300 ||
            (claims.status === 'active' && claims.exp > claims.licenseExpiresAt) || (nonce !== undefined && claims.exp <= now))
            throw new Error();
        return claims;
    }
    catch {
        throw new LicenseError('LICENSE_SIGNATURE_INVALID');
    }
}
class LicenseManager {
    options;
    stored = null;
    claims = null;
    initialized = false;
    error = null;
    storageFailed = false;
    lastAttemptAt = null;
    queue = Promise.resolve();
    refreshing = null;
    timer;
    trust;
    fetcher;
    clock;
    constructor(options) {
        this.options = options;
        try {
            this.trust = options.trust ?? (0, license_trust_1.readLicenseTrust)();
        }
        catch {
            this.trust = null;
            this.error = 'LICENSE_CONFIG_INVALID';
        }
        this.fetcher = options.fetcher ?? fetch;
        const wall = Date.now(), monotonic = node_perf_hooks_1.performance.now();
        this.clock = options.now ?? (() => Math.floor(Math.max(Date.now(), wall + node_perf_hooks_1.performance.now() - monotonic) / 1000));
    }
    exclusive(operation) {
        const next = this.queue.then(operation);
        this.queue = next.catch(() => undefined);
        return next;
    }
    async initialize() {
        if (!this.trust) {
            this.initialized = true;
            return;
        }
        try {
            const content = await (0, promises_1.readFile)(node_path_1.default.join(this.options.directory, 'state.json'), 'utf8');
            if (content.length > 16384)
                throw new Error();
            const value = JSON.parse(content);
            if (value.format !== 1)
                throw new Error();
            const credentials = exports.licenseUpload.parse(value.credentials);
            this.claims = verifyLicenseToken(value.token, credentials, this.trust, this.clock());
            this.stored = { format: 1, credentials, token: value.token };
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                this.error = 'LICENSE_CACHE_INVALID';
                this.storageFailed = true;
            }
        }
        this.initialized = true;
    }
    start() {
        if (this.timer)
            return;
        void this.refresh().catch(() => undefined);
        this.timer = setInterval(() => { void this.refresh().catch(() => undefined); }, 300000);
        this.timer.unref();
    }
    async stop() { if (this.timer)
        clearInterval(this.timer); this.timer = undefined; await this.queue; }
    status() {
        const now = this.clock(), claims = this.claims;
        let state = !this.initialized ? 'starting' : 'unconfigured';
        let allowed = false;
        if (!this.trust)
            state = 'configuration_error';
        else if (this.storageFailed)
            state = 'storage_error';
        else if (claims && this.stored) {
            if (claims.iat > now + 30)
                state = 'clock_error';
            else if (claims.status === 'blocked')
                state = 'blocked';
            else if (claims.status === 'expired' || claims.licenseExpiresAt <= now)
                state = 'expired';
            else if (claims.exp <= now)
                state = 'unavailable';
            else {
                allowed = true;
                state = this.error ? 'offline' : 'active';
            }
        }
        return { state, allowed, installationId: this.stored?.credentials.installationId ?? null,
            licenseId: this.stored?.credentials.licenseId ?? null, version: claims?.version ?? null,
            licenseExpiresAt: claims ? new Date(claims.licenseExpiresAt * 1000).toISOString() : null,
            authorizationExpiresAt: claims ? new Date(claims.exp * 1000).toISOString() : null,
            lastValidatedAt: claims ? new Date(claims.iat * 1000).toISOString() : null,
            lastAttemptAt: this.lastAttemptAt ? new Date(this.lastAttemptAt * 1000).toISOString() : null,
            errorCode: this.error };
    }
    async remote(credentials) {
        const trust = this.trust;
        if (!trust)
            throw new LicenseError('LICENSE_CONFIG_INVALID');
        this.lastAttemptAt = this.clock();
        const nonce = (0, node_crypto_1.randomBytes)(24).toString('base64url');
        let response;
        try {
            response = await this.fetcher(new URL('/v1/license/check', trust.url), {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credentials.credential}` },
                body: JSON.stringify({ installationId: credentials.installationId, nonce }),
                signal: AbortSignal.timeout(8000), redirect: 'error', cache: 'no-store',
            });
        }
        catch {
            throw new LicenseError('LICENSE_SERVER_UNREACHABLE');
        }
        if (!response.ok) {
            await response.body?.cancel();
            throw new LicenseError(response.status === 401 ? 'LICENSE_CREDENTIAL_INVALID' : 'LICENSE_SERVER_UNAVAILABLE', response.status === 401 ? 422 : 503);
        }
        const reader = response.body?.getReader();
        if (!reader)
            throw new LicenseError('LICENSE_RESPONSE_INVALID');
        let content = '';
        try {
            const chunks = [];
            let size = 0;
            while (true) {
                const chunk = await reader.read();
                if (chunk.done)
                    break;
                size += chunk.value.length;
                if (size > 10000) {
                    await reader.cancel();
                    throw new Error();
                }
                chunks.push(chunk.value);
            }
            content = Buffer.concat(chunks).toString('utf8');
        }
        catch {
            throw new LicenseError('LICENSE_RESPONSE_INVALID');
        }
        finally {
            reader.releaseLock();
        }
        let token;
        try {
            token = JSON.parse(content).token;
        }
        catch {
            throw new LicenseError('LICENSE_RESPONSE_INVALID');
        }
        const claims = verifyLicenseToken(token, credentials, trust, this.clock(), nonce);
        if (this.claims && this.stored?.credentials.licenseId === credentials.licenseId) {
            if (claims.version < this.claims.version || (claims.version === this.claims.version &&
                this.claims.status !== 'active' && claims.status === 'active'))
                throw new LicenseError('LICENSE_VERSION_INVALID');
        }
        return { token, claims };
    }
    async persist(state) {
        if (this.options.persist)
            return this.options.persist(state);
        await (0, promises_1.mkdir)(this.options.directory, { recursive: true, mode: 0o700 });
        const temp = node_path_1.default.join(this.options.directory, `state-${(0, node_crypto_1.randomBytes)(12).toString('hex')}.tmp`);
        try {
            const file = await (0, promises_1.open)(temp, 'wx', 0o600);
            try {
                await file.writeFile(JSON.stringify(state));
                await file.sync();
            }
            finally {
                await file.close();
            }
            await (0, promises_1.rename)(temp, node_path_1.default.join(this.options.directory, 'state.json'));
            if (process.platform !== 'win32') {
                const directory = await (0, promises_1.open)(this.options.directory, 'r');
                try {
                    await directory.sync();
                }
                finally {
                    await directory.close();
                }
            }
        }
        finally {
            await (0, promises_1.unlink)(temp).catch(() => undefined);
        }
    }
    async accept(credentials, result) {
        const before = this.status().state;
        const stored = { format: 1, credentials, token: result.token };
        // A confirmed denial is effective immediately, even if disk persistence fails.
        if (result.claims.status !== 'active') {
            this.stored = stored;
            this.claims = result.claims;
        }
        try {
            await this.persist(stored);
        }
        catch {
            this.storageFailed = true;
            this.error = 'LICENSE_STORAGE_FAILED';
            throw new LicenseError(this.error);
        }
        this.stored = stored;
        this.claims = result.claims;
        this.error = null;
        this.storageFailed = false;
        if (before !== this.status().state)
            this.options.event?.('licenca_estado_alterado', { state: this.status().state, version: result.claims.version });
    }
    activate(input) {
        return this.exclusive(async () => {
            const parsed = exports.licenseUpload.safeParse(input);
            if (!parsed.success)
                throw new LicenseError('LICENSE_FILE_INVALID', 400);
            const result = await this.remote(parsed.data);
            if (result.claims.status !== 'active' && parsed.data.licenseId !== this.stored?.credentials.licenseId)
                throw new LicenseError('LICENSE_NOT_ACTIVE', 422);
            await this.accept(parsed.data, result);
            return this.status();
        });
    }
    refresh() {
        if (this.refreshing)
            return this.refreshing;
        this.refreshing = this.exclusive(async () => {
            if (!this.stored)
                return;
            try {
                await this.accept(this.stored.credentials, await this.remote(this.stored.credentials));
            }
            catch (error) {
                const code = error instanceof LicenseError ? error.code : 'LICENSE_SERVER_UNAVAILABLE';
                if (this.error !== code)
                    this.options.event?.('licenca_verificacao_falhou', { code });
                this.error = code;
            }
        }).finally(() => { this.refreshing = null; });
        return this.refreshing;
    }
}
exports.LicenseManager = LicenseManager;
function requiresLicense(method, pathname) {
    return /^\/clinux\/(pacientes|agenda|totem)(\/|$)/.test(pathname) ||
        (/^\/clinux\/senhas(\/|$)/.test(pathname) && method !== 'GET' && method !== 'HEAD');
}
