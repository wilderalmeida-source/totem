import { ZodError } from 'zod'

// Detalhes de erro para a resposta HTTP: só erros de validação (zod) vão para o cliente.
// Erros de banco/Prisma podem trazer a consulta e valores (nome, CPF); ficam só no log, sem a mensagem.
export function clientErrorDetails(err: unknown, log: { error: (obj: object, msg: string) => void }) {
  if (err instanceof ZodError) return { details: err.issues }
  const e = err as { code?: unknown; name?: unknown } | null
  log.error({ code: e?.code, name: e?.name }, 'Falha interna')
  return {}
}
