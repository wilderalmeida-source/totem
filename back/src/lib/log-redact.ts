// O log de requisições do Fastify grava a URL. Buscas de paciente levam nome, CPF e nascimento
// na query string; aqui ficam só os nomes dos parâmetros.
export function redactUrl(url: string | undefined) {
  if (!url) return url
  const index = url.indexOf('?')
  if (index < 0) return url
  const names = [...new URLSearchParams(url.slice(index + 1)).keys()]
  return names.length ? `${url.slice(0, index)}?${names.map(name => `${name}=[omitido]`).join('&')}` : url.slice(0, index)
}

type LoggedRequest = { method?: string; url?: string; hostname?: string; ip?: string; socket?: { remotePort?: number } }

export function requestSerializer(request: LoggedRequest) {
  return {
    method: request.method,
    url: redactUrl(request.url),
    host: request.hostname,
    remoteAddress: request.ip,
    remotePort: request.socket?.remotePort,
  }
}
