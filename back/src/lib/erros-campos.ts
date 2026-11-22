// Campos que a recepção preenche na ficha. Uma alteração em um deles depois da ficha concluída
// conta como erro de atendimento. Chave = "tabela.coluna" como aparece em log_clinux (em minúsculas).
// Campos preenchidos por outros setores (laudo, faturamento, glosa, peso/altura do técnico…) ficam de fora.

export type OrigemErro = 'exame' | 'atendimento' | 'paciente'

// Colunas com código que vale a pena traduzir para nome na tela.
export type Tradutor = 'plano' | 'procedimento' | 'medico' | 'paciente'

type Campo = { rotulo: string; traduzir?: Tradutor }

export const CAMPOS_EXAME: Record<string, Campo> = {
  cd_plano: { rotulo: 'Plano de saúde', traduzir: 'plano' },
  cd_subplano: { rotulo: 'Subplano' },
  nr_vl_franquia: { rotulo: 'Franquia' },
  cd_procedimento: { rotulo: 'Procedimento', traduzir: 'procedimento' },
  nr_exame: { rotulo: 'Quantidade' },
  cd_medico: { rotulo: 'Médico solicitante', traduzir: 'medico' },
  cd_cbos: { rotulo: 'CBOS' },
  cd_prestador: { rotulo: 'Código prestador' },
  ds_guia: { rotulo: 'Guia operadora' },
  ds_guia_operadora: { rotulo: 'Guia operadora' },
  ds_guia_prestador: { rotulo: 'Guia prestador' },
  dt_solicitacao: { rotulo: 'Solicitação da guia' },
  ds_matricula: { rotulo: 'Matrícula' },
  dt_carteira: { rotulo: 'Validade da carteira' },
  ds_titular: { rotulo: 'Titular' },
  ds_autorizacao: { rotulo: 'Nº autorização (senha)' },
  dt_autorizacao: { rotulo: 'Data da autorização' },
  dt_senha: { rotulo: 'Validade da autorização' },
  ds_exame_realizado: { rotulo: 'Exame realizado' },
  sn_laudar_exame: { rotulo: 'Não laudar' },
}

export const CAMPOS_ATENDIMENTO: Record<string, Campo> = {
  dt_data: { rotulo: 'Data do exame' },
  dt_hora: { rotulo: 'Hora do exame' },
  cd_paciente: { rotulo: 'Paciente do atendimento', traduzir: 'paciente' },
  cd_medico: { rotulo: 'Médico', traduzir: 'medico' },
}

export const CAMPOS_PACIENTE: Record<string, Campo> = {
  ds_paciente: { rotulo: 'Nome' },
  ds_paciente_social: { rotulo: 'Nome social' },
  dt_nascimento: { rotulo: 'Data de nascimento' },
  ds_sexo: { rotulo: 'Sexo' },
  ds_cpf: { rotulo: 'CPF' },
  ds_rg: { rotulo: 'RG' },
  ds_cns: { rotulo: 'Cartão SUS (CNS)' },
  ds_mae: { rotulo: 'Nome da mãe' },
  ds_pai: { rotulo: 'Nome do pai' },
  ds_civil: { rotulo: 'Estado civil' },
  ds_telefone: { rotulo: 'Telefone' },
  ds_celular: { rotulo: 'Celular' },
  ds_email: { rotulo: 'E-mail' },
  // Endereço (CEP, logradouro, número, complemento, bairro, cidade, estado) não conta como erro.
  cd_plano: { rotulo: 'Plano (cadastro)', traduzir: 'plano' },
  ds_matricula: { rotulo: 'Matrícula (cadastro)' },
}

export const CAMPOS: Record<OrigemErro, Record<string, Campo>> = {
  exame: CAMPOS_EXAME,
  atendimento: CAMPOS_ATENDIMENTO,
  paciente: CAMPOS_PACIENTE,
}

export const colunas = (origem: OrigemErro) => Object.keys(CAMPOS[origem])
