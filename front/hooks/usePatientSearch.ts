import { useCallback, useEffect, useRef, useState } from "react";
import { auditTotem } from '@/lib/audit-client';
import { identificationValues } from '@/lib/identification-diagnostic';

import { buscaPaciente, Paciente } from "@/services/api";
import {
  isCommonShortName,
  isValidDateBR,
  normalizePaciente,
  onlyNumbers,
  TipoBusca,
  toISODateBR,
} from "@/lib/patientUtils";

export function usePatientSearch(tipo: TipoBusca) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sequence = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => {
    sequence.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
  }, [tipo]);

  const clearPatients = useCallback(() => {
    sequence.current += 1;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    setLoading(false);
    setPacientes([]);
    setError(null);
  }, []);

  const executarPesquisa = useCallback(
    async (valor: string) => {
      const requestId = ++sequence.current;
      const requestController = new AbortController();
      controller.current = requestController;
      setLoading(false);
      const term = (valor ?? "").toUpperCase().trim();
      const number = onlyNumbers(valor);

      setError(null);

      if (tipo === "NOME") {
        if (term.length <= 4 || isCommonShortName(term)) {
          setPacientes([]);
          return;
        }
      }

      if (tipo === "CPF" && number.length !== 11) {
        setPacientes([]);
        return;
      }

      if (tipo === "DATA" && !isValidDateBR(number)) {
        setPacientes([]);
        return;
      }

      try {
        setLoading(true);
        auditTotem('identificacao_entrada_original', 'busca', { tipo, entrada: identificationValues(
          tipo === 'NOME' ? { ds_paciente: valor } : tipo === 'DATA' ? { dt_nascimento: valor } : { ds_cpf: valor }
        ) });

        const result = await buscaPaciente(
          tipo === "NOME"
            ? { ds_paciente: term }
            : tipo === "CPF"
              ? { ds_cpf: number, tipo: "MASK" }
              : { dt_nascimento: toISODateBR(number) },
          requestController.signal
        );

        if (requestId !== sequence.current) return;
        setPacientes((result ?? []).map(normalizePaciente));
      } catch (err) {
        if (requestId !== sequence.current) return;
        console.error("Erro ao pesquisar paciente:", err);
        setPacientes([]);
        setError(err instanceof Error ? err.message : "Falha ao buscar paciente.");
      } finally {
        if (requestId === sequence.current) setLoading(false);
      }
    },
    [tipo]
  );

  const pesquisar = useCallback((valor: string) => {
    sequence.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    setPacientes([]);
    setError(null);
    setLoading(false);
    if (tipo === 'NOME') {
      timer.current = setTimeout(() => { timer.current = null; void executarPesquisa(valor); }, 200);
    } else {
      void executarPesquisa(valor);
    }
  }, [executarPesquisa, tipo]);

  return {
    pacientes,
    loading,
    error,
    pesquisar,
    clearPatients,
  };
}
