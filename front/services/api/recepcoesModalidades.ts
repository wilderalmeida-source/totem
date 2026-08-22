import { apiFetch } from './client'
import type {
    RecepcaoModalidade,
    RecepcaoModalidadePayload,
    ServicoRecepcao
} from './types'

type ErroApi = {
    message?: string
    error?: string
    code?: string
}

async function lerErro(
    response: Response,
    mensagemPadrao: string
): Promise<never> {
    const erro = (await response.json().catch(() => null)) as ErroApi | null

    if (
        response.status === 409 ||
        erro?.code === 'P2002' ||
        erro?.message?.includes('Unique')
    ) {
        throw new Error(
            'Essa modalidade já possui uma recepção cadastrada.'
        )
    }

    throw new Error(
        erro?.message ??
        erro?.error ??
        mensagemPadrao
    )
}

export const buscarRecepcoesModalidades = async (): Promise<
    RecepcaoModalidade[]
> => {
    const res = await apiFetch('/clinux/recepcoes-modalidades', {
        tags: ['recepcoes-modalidades'],
    })

    const dados = await res.json()

    return dados.map((item: any) => ({
        id: Number(item.id),
        cd_modalidade: Number(item.cd_modalidade),
        ds_modalidade: String(item.ds_modalidade),
        recepcao: String(item.recepcao),
        servico: (item.servico) as ServicoRecepcao,
        localizacao:
            item.localizacao === null || item.localizacao === undefined
                ? null
                : String(item.localizacao),
        ativo: Boolean(item.ativo),
        createdAt: item.createdAt ? String(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? String(item.updatedAt) : undefined,
    }))
}

export async function buscarRecepcaoPorModalidade(
    cdModalidade: number
) {
    const response = await apiFetch(
        `/clinux/recepcoes-modalidades/${cdModalidade}`,
        {
            cache: 'no-store',
        }
    )

    if (response.status === 404) {
        return null
    }

    if (!response.ok) {
        return lerErro(
            response,
            'Erro ao buscar a recepção da modalidade.'
        )
    }

    return response.json() as Promise<RecepcaoModalidade[]>
}

export async function cadastrarRecepcaoModalidade(
    dados: RecepcaoModalidadePayload
) {
    const response = await apiFetch('/clinux/recepcoes-modalidades', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
    })

    if (!response.ok) {
        return lerErro(
            response,
            'Não foi possível cadastrar a recepção.'
        )
    }

    return response.json() as Promise<RecepcaoModalidade[]>
}

export async function alterarRecepcaoModalidade(
    id: number,
    dados: RecepcaoModalidadePayload
): Promise<RecepcaoModalidade> {
    const response = await apiFetch(
        `/clinux/recepcoes-modalidades/${id}`,
        {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados),
        }
    )

    if (!response.ok) {
        return lerErro(
            response,
            'Não foi possível alterar a recepção.'
        )
    }

    return response.json()
}

export async function excluirRecepcaoModalidade(id: number) {
    const res = await apiFetch(
        `/clinux/recepcoes-modalidades/${id}`,
        {
            method: 'DELETE',
        }
    )

    return res.json()
}
