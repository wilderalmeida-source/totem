"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionHash = exports.validPin = void 0;
exports.hashPin = hashPin;
exports.verifyPin = verifyPin;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const derive = (0, node_util_1.promisify)(node_crypto_1.scrypt);
const validPin = (pin) => /^\d{4,12}$/.test(pin);
exports.validPin = validPin;
const sessionHash = (token) => (0, node_crypto_1.createHash)('sha256').update(token).digest('hex');
exports.sessionHash = sessionHash;
async function hashPin(pin) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const hash = await derive(pin, salt, 64);
    return `${salt}:${hash.toString('hex')}`;
}
async function verifyPin(pin, stored) {
    const [salt, hex] = stored.split(':');
    if (!salt || !/^[a-f0-9]{128}$/.test(hex ?? ''))
        return false;
    const hash = await derive(pin, salt, 64);
    return (0, node_crypto_1.timingSafeEqual)(hash, Buffer.from(hex, 'hex'));
}
