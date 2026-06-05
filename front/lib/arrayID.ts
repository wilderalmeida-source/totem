import { Atendimento } from "@/services/api"
export function arrayID(arr: Atendimento[]): number[] {
  return arr.map((i) => i.cd_atendimento)
}
