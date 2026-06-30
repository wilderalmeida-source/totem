import { GerarSenhaBody } from './senha.types'
import { gerarSenhaEntrega } from './gerar-senha-entrega.service'
import { gerarSenhaAtendimento } from './gerar-senha-atendimento.service'

export async function gerarSenhaService(body: GerarSenhaBody) {
    const { cd_paciente, servico } = body
    if (!cd_paciente) {
        throw new Error('Paciente inválido')
    }

    if (servico === 'C') {
        return gerarSenhaEntrega(body)
    }
    return gerarSenhaAtendimento(body)
}