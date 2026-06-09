export type GerarSenhaBody = {
  cd_paciente: number
  servico: string
  preferencial?: number | null
  cd_modalidade?: number
}