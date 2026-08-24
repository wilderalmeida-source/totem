export async function buscarConfiguracaoPaineis() {
  const response = await fetch('/api/backend/clinux/paineis-config', {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Erro ao buscar configuração dos painéis')
  }

  return response.json()
}

export async function salvarConfiguracaoPaineis(payload: unknown) {
  const response = await fetch('/api/backend/clinux/paineis-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null
    throw new Error(data?.error || 'Erro ao salvar configuração dos painéis')
  }

  return response.json()
}
