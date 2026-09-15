import { useCallback, useRef, useState } from "react";
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

  const clearPatients = useCallback(() => {
    sequence.current += 1;
    setLoading(false);
    setPacientes([]);
    setError(null);
  }, []);

  const pesquisar = useCallback(
    async (valor: string) => {
      const requestId = ++sequence.current;
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
              : { dt_nascimento: toISODateBR(number) }
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

  return {
    pacientes,
    loading,
    error,
    pesquisar,
    clearPatients,
  };
}
