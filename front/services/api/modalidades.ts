import { apiFetch } from "./client"
import { ModalidadesResponse } from "./types"

export const buscaModalidades = async (
  cd_modalidade: number | null = null
): Promise<ModalidadesResponse> => {
  const res = await apiFetch(
    `/clinux/modalidades?cd_modalidade=${cd_modalidade}`,
    { tags: ['pacientes'] }
  )
  return res.json() as Promise<ModalidadesResponse>
}
