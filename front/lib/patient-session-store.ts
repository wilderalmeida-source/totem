import { createHash, randomBytes } from 'node:crypto'
import { PATIENT_IDLE_MS, PATIENT_MAX_MS } from './patient-session-config'

type Session = { patientId: number; expiresAt: number; absoluteExpiresAt: number; busy: boolean }
const globalStore = globalThis as typeof globalThis & { totemPatientSessions?: Map<string, Session> }
const sessions = globalStore.totemPatientSessions ??= new Map<string, Session>()
const key = (token: string) => createHash('sha256').update(token).digest('hex')

// Sessões locais ao processo Next. Reinícios invalidam todos os identificadores.
export function createPatientSession(patientId: number, now = Date.now()) {
  if (!Number.isSafeInteger(patientId) || patientId <= 0) throw new Error('Paciente inválido')
  for (const [id, session] of sessions) if (session.expiresAt <= now) sessions.delete(id)
  if (sessions.size >= 10000) throw new Error('Limite de sessões atingido')
  const token = randomBytes(32).toString('base64url')
  const session = { patientId, expiresAt: now + PATIENT_IDLE_MS, absoluteExpiresAt: now + PATIENT_MAX_MS, busy: false }
  sessions.set(key(token), session)
  return { token, ...session }
}

export function readPatientSession(token?: string, now = Date.now()) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const session = sessions.get(key(token))
  if (!session) return null
  if (session.expiresAt <= now || session.absoluteExpiresAt <= now) {
    sessions.delete(key(token))
    return null
  }
  return { ...session }
}

export function revokePatientSession(token?: string) {
  if (token) sessions.delete(key(token))
}

export function touchPatientSession(token?: string, now = Date.now()) {
  const session = readPatientSession(token, now)
  if (!session || !token) return null
  session.expiresAt = Math.min(now + PATIENT_IDLE_MS, session.absoluteExpiresAt)
  sessions.set(key(token), session)
  return session
}

export function lockPatientSession(token: string) {
  const session = readPatientSession(token)
  if (!session || session.busy) return null
  sessions.set(key(token), { ...session, busy: true })
  return session
}

export function unlockPatientSession(token: string) {
  const session = readPatientSession(token)
  if (session) sessions.set(key(token), { ...session, busy: false })
}
