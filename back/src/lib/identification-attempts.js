"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identificationAttempts = identificationAttempts;
const LIMIT = 3;
const TTL = 10 * 60 * 1000;
const attempts = new Map();
function identificationAttempts(flow, action, now = Date.now()) {
    for (const [key, value] of attempts)
        if (value.expires <= now)
            attempts.delete(key);
    if (action === 'reset') {
        attempts.delete(flow);
        return LIMIT;
    }
    const current = attempts.get(flow);
    if (action === 'read')
        return current?.remaining ?? LIMIT;
    if (!current && attempts.size >= 10000)
        throw new Error('Limite de fluxos de identificacao atingido');
    const remaining = Math.max(0, (current?.remaining ?? LIMIT) - 1);
    attempts.set(flow, { remaining, expires: current?.expires ?? now + TTL });
    return remaining;
}
