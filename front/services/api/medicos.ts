import { apiFetch } from "./client"

export const buscaMedicos = async (): Promise<unknown[]> => {
  const res = await apiFetch('/clinux/medicos')
  return res.json() as Promise<unknown[]>
}

export const buscaSalas = async (): Promise<unknown[]> => {
  const res = await apiFetch('/clinux/salas')
  return res.json() as Promise<unknown[]>
}
