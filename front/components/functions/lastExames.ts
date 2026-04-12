import {
  BuscaAtendimentos,
  Atendimento,
} from "../../services/fetchData";

export async function EntregaDeExames(cd_paciente: number): Promise<Atendimento[]> {
  const now = new Date();
  now.setHours(0,0,0,0)
  const hoje = new Date()
  hoje.setHours(23,0,0,0)
  const tresMesesAtras = new Date();
  tresMesesAtras.setMonth(now.getMonth() - 3);

  const atendimentos: Atendimento[] = await BuscaAtendimentos({
    cd_paciente,
    date: { from: tresMesesAtras, to: hoje },
  });

  if (atendimentos && atendimentos.length > 0) {
    return atendimentos
  }else{
    return []
  }
}