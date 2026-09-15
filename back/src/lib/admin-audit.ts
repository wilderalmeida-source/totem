import type { FastifyInstance } from 'fastify'
import { recordAudit } from './persistent-audit'

// Only configuration endpoints: never inspect patient, authentication or token payloads.
export function isAdminMutation(method: string, route: string) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
    /^\/clinux\/(?:admin\/users(?:\/:id|\/change-password)?|guiches(?:\/:id)?|paineis-config|recepcoes-modalidades(?:\/:id)?|atrasos-config|midias-config|totem-access\/(?:settings|users(?:\/:id)?)|voice\/(?:override(?:\/:year\/:week)?|rate|volume|dictionary(?:\/:key)?)|atencao)$/.test(route)
}

const fields = new Set(('id username displayName active mustChangePassword permissions numero nome ativo paineis cd_modalidade ds_modalidade servico recepcao localizacao toleranceMinutes timeBasis toleranciaMinutos baseHorario playlistAtivaId duracaoImagemSegundos playlists enabled pinValidityDays sessionHours pinExpiresAt mustChangePin version year week voiceName rate volumeSound key value text ok createdAt updatedAt').split(' '))
export function safeAdminValues(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (!fields.has(key)) continue
    // Nested arbitrary JSON is not copied: its presence is enough for this audit.
    if (entry && typeof entry === 'object') {
      result[key] = key === 'permissions' && Array.isArray(entry)
        ? entry.filter(v => typeof v === 'string').slice(0, 50)
        : { supplied: true }
    } else if (typeof entry === 'string') result[key] = entry.slice(0, 1000)
    else if (typeof entry === 'number' || typeof entry === 'boolean' || entry === null) result[key] = entry
  }
  return result
}

export function registerAdminAudit(app: FastifyInstance) {
  app.addHook('onSend', async (request, reply, payload) => {
    const route = request.routeOptions.url ?? ''
    if (!isAdminMutation(request.method, route)) return payload
    const suppliedActor = request.headers['x-admin-actor']
    const actor = typeof suppliedActor === 'string' && /^[a-zA-Z0-9_.@-]{1,100}$/.test(suppliedActor)
      ? suppliedActor : 'api_interna_nao_identificada'
    let result: unknown = null
    if (reply.statusCode < 400 && typeof payload === 'string') {
      try { result = JSON.parse(payload) } catch { /* Non-JSON response. */ }
    }
    const body = request.body && typeof request.body === 'object' ? request.body : {}
    recordAudit({ category: 'ADMIN', actor, action: 'alteracao_administrativa', step: 'administracao',
      metadata: {
        method: request.method, route, requestId: request.id, status: reply.statusCode,
        durationMs: reply.elapsedTime, outcome: reply.statusCode < 400 ? 'CONCLUIDO' : 'FALHOU',
        actorSource: actor === 'api_interna_nao_identificada' ? 'nao_informado' : 'proxy_interno',
        target: safeAdminValues(request.params), requested: safeAdminValues(body), result: safeAdminValues(result),
        credentialChangeRequested: ['password', 'newPassword', 'pin', 'newPin', 'resetPin'].some(key => key in body),
      },
    })
    return payload
  })
}
