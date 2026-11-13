"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TARGET = exports.FLOW = void 0;
exports.identificationAttempts = identificationAttempts;
exports.identificationTarget = identificationTarget;
// Dois contadores de erros de identificação:
// - FLOW: por fluxo de atendimento (x-flow-id). Só para a mensagem "tentativas restantes";
//   o totem zera a cada novo paciente (tipo=RESET), então não protege contra força bruta.
// - TARGET: pelo paciente procurado (CPF ou nome completo). É a proteção real:
//   não depende de login, aparelho ou cabeçalho, e o RESET não zera.
exports.FLOW = { limit: 3, ttl: 10 * 60 * 1000 };
exports.TARGET = { limit: 3, ttl: 30 * 60 * 1000 };
const MAX_ENTRIES = 10000;
const attempts = new Map();
let lastSweep = 0;
function sweep(now) {
    if (now - lastSweep < 1000 && attempts.size < MAX_ENTRIES)
        return;
    lastSweep = now;
    for (const [key, value] of attempts)
        if (value.expires <= now)
            attempts.delete(key);
    // Sem erro geral: no limite, descarta as entradas mais antigas (ordem de inserção do Map).
    for (const key of attempts.keys()) {
        if (attempts.size < MAX_ENTRIES)
            break;
        attempts.delete(key);
    }
}
function identificationAttempts(key, action, now = Date.now(), policy = exports.FLOW) {
    const current = attempts.get(key);
    if (current && current.expires <= now)
        attempts.delete(key);
    const live = current && current.expires > now ? current : undefined;
    if (action === 'reset') {
        attempts.delete(key);
        return policy.limit;
    }
    if (action === 'read')
        return live?.remaining ?? policy.limit;
    sweep(now);
    const remaining = Math.max(0, (live?.remaining ?? policy.limit) - 1);
    attempts.set(key, { remaining, expires: live?.expires ?? now + policy.ttl });
    return remaining;
}
/** Chave do paciente procurado; `#` não é aceito em x-flow-id, então não colide com fluxos. */
function identificationTarget(input) {
    if (input.tipo === 'ID' && input.ds_cpf)
        return `cpf#${input.ds_cpf}`;
    if (input.tipo === 'NOMEDATA' && input.ds_paciente)
        return `nome#${input.ds_paciente.trim().toUpperCase().replace(/\s+/g, ' ')}`;
    return null;
}
