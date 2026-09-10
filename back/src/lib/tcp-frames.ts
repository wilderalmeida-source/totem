import { StringDecoder } from 'node:string_decoder'

export function createTcpFrames(onMessage: (message: string) => void, maxBytes = 65536) {
  const decoder = new StringDecoder('utf8')
  const delimiter = '-GUICHE'
  let pending = ''
  return {
    push(chunk: Buffer) {
      pending += decoder.write(chunk)
      let end: number
      while ((end = pending.indexOf(delimiter)) !== -1) {
        const message = pending.slice(0, end + delimiter.length).replace(/^[\r\n]+/, '')
        pending = pending.slice(end + delimiter.length)
        if (Buffer.byteLength(message) > maxBytes) throw new Error('TCP_FRAME_TOO_LARGE')
        onMessage(message)
      }
      if (Buffer.byteLength(pending) > maxBytes) throw new Error('TCP_FRAME_TOO_LARGE')
    },
    finish() {
      const incomplete = pending + decoder.end()
      pending = ''
      return incomplete.trim().length > 0
    },
  }
}
