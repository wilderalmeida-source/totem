"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sharedHistory = sharedHistory;
/** One process-wide snapshot for simultaneous kiosks; failures are never cached. */
function sharedHistory(ttlMs = 2000) {
    let pending;
    let cached;
    return (load) => {
        if (pending)
            return pending;
        if (cached && Date.now() < cached.expires)
            return Promise.resolve(cached.value);
        pending = Promise.resolve().then(load).then(value => {
            cached = { value, expires: Date.now() + ttlMs };
            return value;
        }).finally(() => { pending = undefined; });
        return pending;
    };
}
