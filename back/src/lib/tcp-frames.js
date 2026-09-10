"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTcpFrames = createTcpFrames;
const node_string_decoder_1 = require("node:string_decoder");
function createTcpFrames(onMessage, maxBytes = 65536) {
    const decoder = new node_string_decoder_1.StringDecoder('utf8');
    const delimiter = '-GUICHE';
    let pending = '';
    return {
        push(chunk) {
            pending += decoder.write(chunk);
            let end;
            while ((end = pending.indexOf(delimiter)) !== -1) {
                const message = pending.slice(0, end + delimiter.length).replace(/^[\r\n]+/, '');
                pending = pending.slice(end + delimiter.length);
                if (Buffer.byteLength(message) > maxBytes)
                    throw new Error('TCP_FRAME_TOO_LARGE');
                onMessage(message);
            }
            if (Buffer.byteLength(pending) > maxBytes)
                throw new Error('TCP_FRAME_TOO_LARGE');
        },
        finish() {
            const incomplete = pending + decoder.end();
            pending = '';
            return incomplete.trim().length > 0;
        },
    };
}
