import moment from "moment";

import { Paciente } from "@/services/api";

export type TipoBusca = "DATA" | "CPF" | "NOME";

export const COMMON_NAMES = ["MARIA", "JOAO", "JOSÉ", "JOSE"];

export function onlyNumbers(value: string) {
  return (value ?? "").replace(/\D/g, "");
}

export function normalizePaciente(paciente: Paciente): Paciente {
  return {
    cd_paciente: paciente.cd_paciente ?? undefined,
    ds_nome: paciente.ds_nome ?? paciente.ds_paciente ?? "",
    dt_nascimento: paciente.dt_nascimento ?? "",
    ds_cpf: paciente.ds_cpf ?? "",
  };
}

export function isCommonShortName(term: string) {
  const value = term.toUpperCase().trim();
  return COMMON_NAMES.some((nome) => value.includes(nome)) && value.length <= 7;
}

export function isValidDateBR(value: string) {
  const number = onlyNumbers(value);
  if (number.length !== 8) return false;

  const day = Number(number.substring(0, 2));
  const month = Number(number.substring(2, 4));
  const year = Number(number.substring(4, 8));
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function toISODateBR(value: string) {
  const number = onlyNumbers(value);
  const day = Number(number.substring(0, 2));
  const month = Number(number.substring(2, 4));
  const year = Number(number.substring(4, 8));

  return new Date(year, month - 1, day).toISOString();
}

export function formatBirthDate(value?: string) {
  if (!value) return "SEM DATA";
  return moment(value).utc().format("DD/MM/YYYY");
}

export function getInputMask(tipo: TipoBusca) {
  if (tipo === "DATA") return "00/00/0000";
  if (tipo === "CPF") return "000.000.000-00";
  return "";
}

export function getInputPlaceholder(tipo: TipoBusca) {
  if (tipo === "DATA") return "Digite a Data de Nascimento";
  if (tipo === "CPF") return "Digite seu CPF";
  return "Digite seu Nome";
}
