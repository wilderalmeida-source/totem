import { buscaAtendimentos, buscaPaciente, type Atendimento, type Paciente } from "@/services/api";
import { entregaDeExames } from "@/services/entregadeexames";
import { DadosPaciente } from "@/components/modals/patientModal";

interface RetornoPacienteCPF {
  dados: DadosPaciente | null;
  exames: Atendimento[] | null;
  tentativas: number | null;
  invalido: string | null;
}

export async function buscarPacienteCPF(
  ds_cpf: string,
  dt_nascimento: string,
  servico: string,
  preferencial: number
): Promise<RetornoPacienteCPF> {
  const listpaciente = await buscaPaciente({
    ds_cpf,
    dt_nascimento,
    tipo: "ID",
  });

  if (!listpaciente || listpaciente.length === 0) {
    return {
      dados: null,
      exames: null,
      tentativas: null,
      invalido: "Paciente não encontrado.",
    };
  }

  const paciente = listpaciente[0];

  if (!paciente.cd_paciente) {
    return {
      dados: null,
      exames: null,
      tentativas: paciente.tentativas ?? null,
      invalido: "CPF ou data de nascimento inválidos.",
    };
  }

  let exames: Atendimento[] | null = null;

  if (servico === "C") {
    const entrega = await entregaDeExames(paciente.cd_paciente);
    exames = entrega
      ? entrega.slice(0, 10)
      : [];
  } else {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const atendimento = await buscaAtendimentos({
      cd_paciente: paciente.cd_paciente,
      date: { from: hoje },
    });

    const statusPermitidos = [2, 3, 7];

    exames = atendimento
      ? atendimento.filter(
        (i) =>
          i.exames &&
          i.exames.length > 0 &&
          i.ds_status &&
          statusPermitidos.includes(i.ds_status)
      )
      : [];
  }

  return {
    dados: {
      cd_paciente: listpaciente[0].cd_paciente,
      ds_paciente: listpaciente[0].ds_paciente,
      dt_nascimento: listpaciente[0].dt_nascimento,
      servico,
      preferencial,
      tipo: "CPF",
    },
    exames,
    tentativas: null,
    invalido: null,
  };
}