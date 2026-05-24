'use client'

import React, { createContext, Dispatch, SetStateAction } from "react"
import PatientModal from "./patientModal"

interface Paciente {
  ds_paciente?: string
  ds_telefone?: string | undefined
  ds_celular?: string | undefined
  ds_celular_web?: string | undefined
  cd_paciente?: number | undefined
  dt_nascimento?: string | undefined
  servico: string | null
  preferencial: number | null | undefined
  qr?: boolean | undefined
  ds_observacao?: string | undefined
  ds_cpf?: string | undefined
  tipo?: string | undefined
}

// Se você ainda precisar de um tipo local de atendimento para outras telas,
// mantenha-o com outro nome. Para o contexto, usaremos `Atendimento` do fetchData.
// interface AtendimentoUI { ... }

export const modalContext = createContext<{
  setShowModal: Dispatch<SetStateAction<boolean>>
  setDados: Dispatch<SetStateAction<Paciente | null>>
  // ⬅ agora usa o tipo unificado
}>({
  setShowModal: () => { },
  setDados: () => { },
})

export default function ModalProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Certifique-se de que PatientModal retorne setters compatíveis:
  // setExames: Dispatch<SetStateAction<Atendimento[] | null>>
  const { setShowModal, DialogPatient, setDados } = PatientModal()

  return (
    <modalContext.Provider value={{ setShowModal, setDados }}>
      <DialogPatient />
      {children}
    </modalContext.Provider>
  )
}
