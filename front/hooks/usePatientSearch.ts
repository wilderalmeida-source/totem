import { useCallback, useState } from "react";

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

  const clearPatients = useCallback(() => {
    setPacientes([]);
    setError(null);
  }, []);

  const pesquisar = useCallback(
    async (valor: string) => {
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

        const result = await buscaPaciente(
          tipo === "NOME"
            ? { ds_paciente: term }
            : tipo === "CPF"
              ? { ds_cpf: number, tipo: "MASK" }
              : { dt_nascimento: toISODateBR(number) }
        );

        setPacientes((result ?? []).map(normalizePaciente));
      } catch (err) {
        console.error("Erro ao pesquisar paciente:", err);
        setPacientes([]);
        setError("Não foi possível buscar o paciente. Tente novamente.");
      } finally {
        setLoading(false);
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
