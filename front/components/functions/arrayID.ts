import {
  Atendimento,
} from "../../services/fetchData";
export function ArrayID(arr: Atendimento[]): number[] {
  return arr.map((i) => i.cd_atendimento);
}