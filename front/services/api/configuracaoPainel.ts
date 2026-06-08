export async function buscarConfiguracaoPaineis() {
  const response = await fetch('/api/paineis-config', {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Erro ao buscar configuração dos painéis')
  }

  return response.json()
}

export async function salvarConfiguracaoPaineis(payload: unknown) {
  const response = await fetch('/api/paineis-config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Erro ao salvar configuração dos painéis')
  }

  return response.json()
}