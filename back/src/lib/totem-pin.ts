import { randomBytes, scrypt, createHash, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
export const validPin = (pin: string) => /^\d{4,12}$/.test(pin)
export const sessionHash = (token: string) => createHash('sha256').update(token).digest('hex')
export async function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(pin, salt, 64) as Buffer
  return `${salt}:${hash.toString('hex')}`
}
export async function verifyPin(pin: string, stored: string) {
  const [salt, hex] = stored.split(':')
  if (!salt || !/^[a-f0-9]{128}$/.test(hex ?? '')) return false
  const hash = await derive(pin, salt, 64) as Buffer
  return timingSafeEqual(hash, Buffer.from(hex, 'hex'))
}
