const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createTcpFrames } = require('../src/lib/tcp-frames');
test('fragmentos inclusive UTF8 e delimitador sao reconstituidos', () => {
  const messages = []; const frames = createTcpFrames(m => messages.push(m));
  const raw = 'B-FN-0001-01-TOTEM-JOS' + String.fromCharCode(201) + '-TOTEM-GUICHE';
  for (const byte of Buffer.from(raw)) frames.push(Buffer.from([byte]));
  assert.deepEqual(messages, [raw]); assert.equal(frames.finish(), false);
});
test('mensagens juntas sao separadas e cauda incompleta aguarda', () => {
  const messages = []; const frames = createTcpFrames(m => messages.push(m));
  frames.push(Buffer.from('A-GUICHE\r\nB-GUICHEC-GUI'));
  assert.deepEqual(messages, ['A-GUICHE', 'B-GUICHE']);
  frames.push(Buffer.from('CHE')); assert.deepEqual(messages, ['A-GUICHE', 'B-GUICHE', 'C-GUICHE']);
});
test('conexoes independentes e fechamento incompleto nao emitem chamada', () => {
  const messages = []; const first = createTcpFrames(m => messages.push(m));
  const second = createTcpFrames(m => messages.push(m));
  first.push(Buffer.from('A-GUI')); second.push(Buffer.from('B-GUICHE'));
  assert.equal(first.finish(), true); assert.deepEqual(messages, ['B-GUICHE']);
});
test('limite de mensagem impede acumulo ilimitado', () => {
  const frames = createTcpFrames(() => {}, 8);
  assert.throws(() => frames.push(Buffer.from('123456789')), /TCP_FRAME_TOO_LARGE/);
});
