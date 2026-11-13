"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decoyBirthDates = decoyBirthDates;
const node_crypto_1 = require("node:crypto");
const TOTAL = 10;
const FIRST_YEAR = 1930;
let fallbackSecret = null;
function secret() {
    const configured = process.env.DECOY_DATES_SECRET || process.env.ADMIN_SECRET || process.env.TOKEN_API_INT || process.env.TOKENAPIINT;
    if (configured)
        return configured;
    // Sem segredo configurado as datas ficam estáveis só até reiniciar o processo.
    if (!fallbackSecret) {
        console.warn('DECOY_DATES_SECRET ausente: datas de confirmação mudarão a cada reinício.');
        fallbackSecret = (0, node_crypto_1.randomBytes)(32);
    }
    return fallbackSecret;
}
function toIsoDay(value) {
    if (!value)
        return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime()))
        return null;
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}
/**
 * Completa as datas reais com datas falsas até somar 10.
 * As falsas dependem só de `key` (nome ou CPF pesquisado) e de um segredo do servidor:
 * a mesma pesquisa devolve sempre a mesma lista, então repetir a busca não revela a data real.
 */
function decoyBirthDates(key, realDates, now = new Date()) {
    const dates = [...new Set(realDates.map(toIsoDay).filter((date) => Boolean(date)))];
    const start = Date.UTC(FIRST_YEAR, 0, 1);
    const end = Date.UTC(now.getUTCFullYear() - 1, 11, 31);
    const span = Math.floor((end - start) / 86_400_000) + 1;
    const normalizedKey = key.trim().toUpperCase().replace(/\s+/g, ' ');
    for (let counter = 0; dates.length < TOTAL && counter < 1000; counter++) {
        const digest = (0, node_crypto_1.createHmac)('sha256', secret()).update(`decoy-birth:${normalizedKey}:${counter}`).digest();
        const candidate = new Date(start + (digest.readUInt32BE(0) % span) * 86_400_000).toISOString();
        if (!dates.includes(candidate))
            dates.push(candidate);
    }
    return dates.sort().map(dt_nascimento => ({ dt_nascimento }));
}
