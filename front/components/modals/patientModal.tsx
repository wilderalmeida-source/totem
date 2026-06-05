'use client'

import { Dispatch, SetStateAction, useState } from 'react'
import Image from 'next/image'
import moment from 'moment'
import OrbitProgress from 'react-loading-indicator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { sendClinux } from '@/services/sendClinux'
import { buscaPaciente, type Atendimento } from '@/services/api'
import { entregaDeExames } from '@/services/entregadeexames'
import ok from '@/assets/icons/ok.png'
import atention from '@/assets/icons/atention.png'

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface DadosPaciente {
  ds_paciente?: string
  ds_telefone?: string
  ds_celular?: string
  ds_celular_web?: string
  cd_paciente?: number
  dt_nascimento?: string
  servico: string | null
  preferencial: number | undefined | null
  qr?: boolean
  ds_cpf?: string
  ds_observacao?: string
  tipo?: string
}

interface DialogPatientProps {
  showModal: boolean
  setShowModal: Dispatch<SetStateAction<boolean>>
  dados: DadosPaciente | null
  setDados: Dispatch<SetStateAction<DadosPaciente | null>>
  exames: Atendimento[] | null
  setExames: Dispatch<SetStateAction<Atendimento[] | null>>
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  tentativas: number | null
  setTentativas: Dispatch<SetStateAction<number | null>>
  invalido: string | null
  setInvalido: Dispatch<SetStateAction<string | null>>
}

// ─── Sub-componente: ícone de status ─────────────────────────────────────────
function StatusIcon({ done }: { done: boolean }) {
  return done
    ? <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
    : <Image className="mx-auto" width={20} height={20} src={atention} alt="Caution" />
}

// ─── Sub-componente: label de serviço ────────────────────────────────────────
const SERVICO_LABEL: Record<string, string> = {
  C: 'Entrega de Exames',
  D: 'Agendamento',
}

// ─── DialogPatient ────────────────────────────────────────────────────────────
export function DialogPatient({
  showModal, setShowModal,
  dados, setDados,
  exames, setExames,
  loading, setLoading,
  tentativas,
  invalido,
}: DialogPatientProps) {

  const irParaInicio = () => {
    setTimeout(() => { setLoading(false); window.location.href = '/' }, 600)
  }

  const gerarSenha = async (valorQR: string | null = null) => {
    // Fluxo QR
    if (dados?.qr) {
      if (!valorQR) { window.alert('PACIENTE NÃO ENCONTRADO'); return }

      const listpaciente = await buscaPaciente({ cd_paciente: parseInt(valorQR) })
      if (!listpaciente?.length) { window.alert('PACIENTE NÃO ENCONTRADO'); return }

      const newDados = { ...listpaciente[0], servico: dados.servico, preferencial: dados.preferencial }

      if (dados.servico === 'C' && listpaciente[0].cd_paciente) {
        const entrega = await entregaDeExames(listpaciente[0].cd_paciente)
        setExames(entrega.filter((i) => [5].includes(i.status ?? -999)).slice(0, 10))
      }

      setDados(newDados)
      return
    }

    // Fluxo normal
    if (!dados) return
    setLoading(true)
    await sendClinux({
      cd_paciente: dados.cd_paciente,
      ds_paciente: dados.ds_paciente,
      dt_nascimento: dados.dt_nascimento,
      preferencial: dados.preferencial,
      servico: dados.servico,
    })
    irParaInicio()
  }

  const handleCancelar = () => {
    const semPacienteNovo = !dados?.cd_paciente && !dados?.qr && dados?.tipo !== 'NEW'
    if (tentativas && tentativas <= 0 && semPacienteNovo) {
      irParaInicio()
    } else {
      setShowModal(false)
    }
  }

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent>
        {/* Header */}
        {!invalido && (
          <DialogHeader>
            <DialogTitle className="text-xl font-normal">
              {SERVICO_LABEL[dados?.servico ?? ''] ?? 'Atendimento'}
            </DialogTitle>
            <DialogDescription className="text-3xl font-bold text-black">
              {dados?.qr ? dados.ds_paciente : `NOME: ${dados?.ds_paciente}`}
            </DialogDescription>
          </DialogHeader>
        )}

        {/* Conteúdo principal */}
        {invalido ? (
          <div>
            <h2 className="font-bold text-xl">{invalido}</h2>
            <p>Você tem {tentativas} tentativas restantes!</p>
          </div>
        ) : (
          <div>
            {dados?.ds_telefone && <h2 className="font-bold text-xl">Telefone: {dados.ds_telefone}</h2>}
            {dados?.ds_celular && <h2 className="font-bold text-xl">Celular: {dados.ds_celular}</h2>}
            {dados?.ds_celular_web && <h2 className="font-bold text-xl">Celular 2: {dados.ds_celular_web}</h2>}
            {dados?.ds_observacao && (
              <div>
                <h2 className="font-bold text-xl">Obs.:</h2>
                <p>{dados.ds_observacao}</p>
              </div>
            )}
            {dados?.cd_paciente && <h2 className="font-bold text-xl">ID Paciente: {dados.cd_paciente}</h2>}
            {dados?.dt_nascimento && (
              <h2 className="font-bold text-xl">
                Data de Nascimento: {moment(dados.dt_nascimento).utc().format('DD/MM/YYYY')}
              </h2>
            )}
          </div>
        )}

        {/* Tabela de exames */}
        {!invalido && exames && exames.length > 0 && (
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase sticky top-0">
              <tr>
                <th className="px-6 py-3 w-64 bg-slate-300">Exame</th>
                <th className="px-6 py-3 w-1/5 bg-slate-300">Laudado</th>
              </tr>
            </thead>
            <tbody>
              {exames.flatMap((atend, ai) =>
                (atend.exames ?? []).map((exame, ei) => (
                  <tr key={`${ai}-${ei}`}>
                    <td>{exame.procedimentos_exames_cd_procedimentoToprocedimentos?.ds_procedimento}</td>
                    <td><StatusIcon done={!!exame.dt_assinado} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Form QR oculto */}
        {dados?.qr && (
          <form
            className="opacity-0"
            onSubmit={(e) => {
              e.preventDefault()
              const valor = (e.currentTarget.elements.namedItem('ID') as HTMLInputElement).value
              void gerarSenha(valor)
            }}
          >
            <input type="text" name="ID" autoFocus />
            <button type="submit">enviar</button>
          </form>
        )}

        {/* Botão OK */}
        {!dados?.qr && dados?.servico !== '' && !invalido && (
          <Button variant="outline" className="bg-green-400" onClick={() => void gerarSenha()} disabled={loading}>
            {loading ? <OrbitProgress /> : 'OK'}
          </Button>
        )}

        {/* Botão Cancelar */}
        <Button variant="outline" className="bg-red-400" onClick={handleCancelar}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ─── PatientModal (wrapper com estado) ───────────────────────────────────────
export default function PatientModal() {
  const [showModal, setShowModal] = useState(false)
  const [dados, setDados] = useState<DadosPaciente | null>(null)
  const [exames, setExames] = useState<Atendimento[] | null>(null)
  const [tentativas, setTentativas] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [invalido, setInvalido] = useState<string | null>(null)

  const Modal = () => (
    <DialogPatient
      showModal={showModal} setShowModal={setShowModal}
      dados={dados} setDados={setDados}
      exames={exames} setExames={setExames}
      loading={loading} setLoading={setLoading}
      tentativas={tentativas} setTentativas={setTentativas}
      invalido={invalido} setInvalido={setInvalido}
    />
  )

  return { setShowModal, DialogPatient: Modal, setDados, setExames, setLoading, setTentativas, setInvalido }
}