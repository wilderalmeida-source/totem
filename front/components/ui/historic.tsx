'use client'

import { useEffect, useState, useMemo, useCallback, useRef, useTransition } from 'react'
import Image from 'next/image'
import ok from '@/assets/icons/ok.png'
import atention from '@/assets/icons/atention.png'
import { buscaPaciente, buscaSenhas, SenhasResponse, Senha } from '@/services/api'

function uniqBy<T>(arr: T[], keyFn: (x: T) => string): T[] {
  const seen = new Set<string>()

  return arr.filter((item) => {
    const key = keyFn(item)

    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function getAtendimento(senha: Senha) {
  const atendimento = senha.atendimentos

  if (Array.isArray(atendimento)) {
    return atendimento[0] ?? null
  }

  return atendimento ?? null
}

function getNomePaciente(senha: Senha) {
  return (
    senha.ds_paciente ??
    getAtendimento(senha)?.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente
  )
}

function StatusIcon({ done }: { done: boolean }) {
  return done ? (
    <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
  ) : (
    <Image className="mx-auto" width={20} height={20} src={atention} alt="Aguardando" />
  )
}

interface TabelaSenhasProps {
  titulo: string
  itens: Senha[]
  getNome: (s: Senha) => string | undefined
  getKey: (s: Senha) => string
  loading: boolean
}

function TabelaSenhas({ titulo, itens, getNome, getKey, loading }: TabelaSenhasProps) {
  const atendidos = itens.filter((s) => s.dt_saida).length

  return (
    <div className="mr-5">
      <div className="ml-3">
        <h1 className="text-xl font-semibold">{titulo}</h1>
        <h2>
          Total: {itens.length} | Atendidos: {atendidos} | Restantes:{' '}
          {itens.length - atendidos}
        </h2>
      </div>

      <div className="overflow-y-auto h-80 no-scrollbar xl:h-36 lg:h-44">
        {loading && <div className="p-2 text-sm text-gray-500">Atualizando…</div>}

        {!loading && (
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 h-4">
            <thead className="text-xs text-gray-700 uppercase sticky top-0">
              <tr>
                <th className="px-6 py-3 w-64 bg-slate-300">Nome</th>
                <th className="px-6 py-3 w-1/5 bg-slate-300">Status</th>
              </tr>
            </thead>

            <tbody className="h-4 bg-ternary">
              {itens.map((senha) => {
                const nome = getNome(senha)

                if (!nome) return null

                return (
                  <tr
                    key={getKey(senha)}
                    className="border-b bg-gray-200/[0.6] dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    <td className="font-bold uppercase w-64">
                      <p className="px-2 truncate w-64">{nome}</p>
                    </td>

                    <td className="px-3 py-2 w-1/5">
                      <StatusIcon done={!!senha.dt_saida} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function Historic() {
  const [dados, setDados] = useState<SenhasResponse>({
    senhasnr: [],
    senhas: [],
  })

  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const requestRef = useRef<AbortController | null>(null)
  const stoppedRef = useRef(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    void buscaPaciente({ ds_paciente: 'RE', tipo: 'RESET' }).catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    if (stoppedRef.current || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    try {
      setLoading(true)
      const response = await buscaSenhas(controller.signal)
      if (controller.signal.aborted || stoppedRef.current) return
      setError(false)

      startTransition(() => {
        setDados(response)
      })
    } catch {
      if (!stoppedRef.current) setError(true)
    } finally {
      clearTimeout(timeout)
      if (requestRef.current === controller) {
        requestRef.current = null
        if (!stoppedRef.current) setLoading(false)
      }
    }
  }, [startTransition])

  const throttleRef = useRef<number | null>(null)

  const scheduleFetch = useCallback(() => {
    if (stoppedRef.current) return
    if (throttleRef.current !== null) return

    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null
      void fetchData()
    }, 250)
  }, [fetchData])

  useEffect(() => {
    let aborted = false
    stoppedRef.current = false

    void fetchData()

    const eventSource = new EventSource('/api/events')

    eventSource.onmessage = (event) => {
      try {
        const bridgePayload = JSON.parse(event.data)
        const msg = JSON.parse(bridgePayload.message)

        if (!msg || (msg.type && !['db', 'tcp'].includes(msg.type))) return

        if (!aborted) scheduleFetch()
      } catch {
        console.warn('Erro de conexão com os eventos em tempo real')
      }
    }

    const stop = () => {
      aborted = true
      stoppedRef.current = true
      requestRef.current?.abort()
      requestRef.current = null

      if (throttleRef.current) {
        clearTimeout(throttleRef.current)
        throttleRef.current = null
      }

      eventSource.close()
    }
    window.addEventListener('totem-service-selected', stop)
    return () => {
      stop()
      window.removeEventListener('totem-service-selected', stop)
    }
  }, [fetchData, scheduleFetch])

  const senhasAtendimento = useMemo(() => {
    return uniqBy(dados?.senhas ?? [], (senha) => {
      const atendimento = getAtendimento(senha)
      const paciente = atendimento?.pacientes_atendimentos_cd_pacienteTopacientes
      const id = paciente?.cd_paciente ?? atendimento?.cd_atendimento ?? senha.cd_senha
      const status = senha.dt_saida ? 'finalizado' : 'pendente'

      return `${id}|${status}`
    })
  }, [dados?.senhas])

  const senhasEntrega = useMemo(() => {
    return uniqBy(dados?.senhasnr ?? [], (senha) => {
      const atendimento = getAtendimento(senha)
      const paciente = atendimento?.pacientes_atendimentos_cd_pacienteTopacientes
      const id = paciente?.cd_paciente ?? atendimento?.cd_atendimento ?? senha.cd_senha
      const status = senha.dt_saida ? 'finalizado' : 'pendente'

      return `${id}|${status}`
    })
  }, [dados?.senhasnr])

  return (
    <>
      {error && <p role="status" className="ml-3 text-sm text-gray-500">Histórico indisponível no momento. Você pode selecionar um serviço normalmente.</p>}
      <div className="ml-3 flex">
        <TabelaSenhas
          titulo="Atendimento"
          itens={senhasAtendimento}
          getNome={getNomePaciente}
          getKey={(senha) => `a-${senha.cd_senha}-${senha.dt_saida ? '1' : '0'}`}
          loading={loading}
        />

        <TabelaSenhas
          titulo="Entrega"
          itens={senhasEntrega}
          getNome={getNomePaciente}
          getKey={(senha) => `e-${senha.cd_senha}-${senha.dt_saida ? '1' : '0'}`}
          loading={loading}
        />
      </div>

      {isPending && (
        <div className="ml-3 mt-2 text-xs text-gray-400 animate-pulse">
          Sincronizando dados…
        </div>
      )}
    </>
  )
}
