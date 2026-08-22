"use client";

import Link from "next/link";

import { Paciente } from "@/services/api";
import { formatBirthDate, TipoBusca } from "@/lib/patientUtils";
import { auditTotem } from "@/lib/audit-client";

interface PatientListProps {
  pacientes: Paciente[];
  tipo: TipoBusca;
  servico: string;
  preferencial: number;
  loading?: boolean;
  error?: string | null;
  onCPFPatientClick: (paciente: Paciente) => void;
}

export function PatientList({
  pacientes,
  tipo,
  servico,
  preferencial,
  loading,
  error,
  onCPFPatientClick,
}: PatientListProps) {
  const pacientesExibidos =
    tipo === "DATA" && pacientes.length > 0
      ? [pacientes[0]]
      : pacientes;
  return (
    <div className="flex mt-2">
      <ul className="px-3 h-48 w-full overflow-y-auto mb-5 rounded-lg border-2 border-gray-500">
        {loading && <li className="text-3xl mb-3">Buscando...</li>}

        {error && <li className="text-3xl mb-3 text-red-600">{error}</li>}

        {!loading &&
          !error &&
          pacientesExibidos.map((paciente, index) => {
            const label =
              tipo === "DATA" || tipo === "CPF"
                ? formatBirthDate(paciente.dt_nascimento)
                : paciente.ds_nome || "SEM NOME";

            if (tipo === "CPF") {
              return (
                <li
                  className="text-4xl mb-3 cursor-pointer"
                  key={paciente.cd_paciente ?? index}
                  onClick={() => { auditTotem('resultado_busca_selecionado', 'paciente', { tipo, pacienteId: paciente.cd_paciente }); onCPFPatientClick(paciente) }}
                >
                  {label}
                </li>
              );
            }

            return (
              <li className="text-4xl mb-3" key={paciente.cd_paciente ?? index}>
                <Link
                  onClick={() => auditTotem('resultado_busca_selecionado', 'paciente', { tipo, pacienteId: paciente.cd_paciente })}
                  href={{
                    pathname: "/date",
                    query: {
                      servico,
                      preferencial: String(preferencial),
                      nome:
                        tipo === "DATA"
                          ? paciente.dt_nascimento
                          : paciente.ds_nome ?? "",
                      tipo,
                    },
                  }}
                >
                  {label}
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
