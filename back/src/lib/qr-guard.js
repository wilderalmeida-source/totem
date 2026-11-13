"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QR_GUARD = void 0;
exports.qrBlocked = qrBlocked;
exports.qrFailure = qrFailure;
exports.qrGuardReset = qrGuardReset;
// Trava global da leitura de QR (paciente-atendimento), somando todos os totens.
// Quem usa direito não erra, porque o par vem impresso pelo sistema; erros seguidos indicam
// alguém tentando adivinhar combinações. Não depende de login, aparelho ou cabeçalho.
exports.QR_GUARD = { maxFailures: 10, windowMs: 5 * 60 * 1000, blockMs: 5 * 60 * 1000 };
let failures = [];
let blockedUntil = 0;
function qrBlocked(now = Date.now()) {
    return now < blockedUntil;
}
/** Registra um QR que não confere. Retorna true se a leitura de QR acabou de ser bloqueada. */
function qrFailure(now = Date.now()) {
    failures = failures.filter(time => now - time < exports.QR_GUARD.windowMs);
    failures.push(now);
    if (failures.length < exports.QR_GUARD.maxFailures)
        return false;
    failures = [];
    blockedUntil = now + exports.QR_GUARD.blockMs;
    return true;
}
function qrGuardReset() {
    failures = [];
    blockedUntil = 0;
}
