"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Base from "@/components/ui/base";
import {
    alterarRecepcaoModalidade,
    buscaModalidades,
    buscarRecepcoesModalidades,
    cadastrarRecepcaoModalidade,
    excluirRecepcaoModalidade,
    Modalidade,
} from "@/services/api";
import {
    RecepcaoModalidade,
    RecepcaoModalidadePayload,
} from "@/services/api/types";

export type ServicoRecepcao = string | "B" | "C" | "D";

const NOMES_SERVICOS: Record<ServicoRecepcao, string> = {
    "B": "Atendimentos",
    "D": "Agendamento",
    "C": "Resultados",
};

interface FormularioRecepcao {
    modalidades: number[];
    servico: ServicoRecepcao;
    recepcao: string;
    localizacao: string;
    ativo: boolean;
}

const FORMULARIO_INICIAL: FormularioRecepcao = {
    modalidades: [],
    servico: "B",
    recepcao: "",
    localizacao: "",
    ativo: true,
};

export default function RecepcaoModalidadesPage() {
    const [modalidades, setModalidades] = useState<Modalidade[]>([]);
    const [recepcoes, setRecepcoes] = useState<RecepcaoModalidade[]>([]);
    const [formulario, setFormulario] =
        useState<FormularioRecepcao>(FORMULARIO_INICIAL);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(false);
    const [busca, setBusca] = useState("");

    useEffect(() => {
        void carregarDados();
    }, []);

    async function carregarDados() {
        setCarregando(true);

        try {
            console.log("Iniciando modalidades");

            const listaModalidades = await buscaModalidades(10000);

            console.log("Modalidades recebidas:", listaModalidades);

            setModalidades(listaModalidades ?? []);

            const listaRecepcoes = await buscarRecepcoesModalidades();

            console.log("Recepções recebidas:", listaRecepcoes);

            setRecepcoes(listaRecepcoes ?? []);
        } catch (error) {
            setRecepcoes([]);
            console.log("Erro ao carregar dados:", error);
        } finally {
            setCarregando(false);
        }
    }
    function adicionarModalidade(cdModalidade: number) {
        if (!cdModalidade) return;

        setFormulario((estadoAtual) => {
            if (estadoAtual.modalidades.includes(cdModalidade)) {
                return estadoAtual;
            }

            return {
                ...estadoAtual,
                modalidades: [...estadoAtual.modalidades, cdModalidade],
            };
        });
    }

    function removerModalidade(cdModalidade: number) {
        setFormulario((estadoAtual) => ({
            ...estadoAtual,
            modalidades: estadoAtual.modalidades.filter((id) => id !== cdModalidade),
        }));
    }

    function limparFormulario() {
        setFormulario(FORMULARIO_INICIAL);
        setEditandoId(null);
    }

    function editarRecepcao(item: RecepcaoModalidade) {
        setEditandoId(item.id);
        setFormulario({
            modalidades: [item.cd_modalidade],
            servico: item.servico,
            recepcao: item.recepcao,
            localizacao: item.localizacao ?? "",
            ativo: item.ativo,
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }

    async function salvarRecepcao(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (formulario.modalidades.length === 0) {
            alert("Selecione pelo menos uma modalidade.");
            return;
        }

        if (!formulario.recepcao.trim()) {
            alert("Informe a recepção.");
            return;
        }

        setSalvando(true);

        try {
            if (editandoId) {
                const cdModalidade = formulario.modalidades[0];
                const modalidade = modalidades.find(
                    (item) => item.cd_modalidade === cdModalidade,
                );

                const payload: RecepcaoModalidadePayload = {
                    cd_modalidade: cdModalidade,
                    ds_modalidade: modalidade?.ds_modalidade ?? "",
                    servico: formulario.servico,
                    recepcao: formulario.recepcao.trim(),
                    localizacao: formulario.localizacao.trim() || undefined,
                    ativo: formulario.ativo,
                };

                await alterarRecepcaoModalidade(editandoId, payload);
                alert("Recepção atualizada com sucesso.");
            } else {
                const payloads: RecepcaoModalidadePayload[] =
                    formulario.modalidades.map((cdModalidade) => {
                        const modalidade = modalidades.find(
                            (item) => item.cd_modalidade === cdModalidade,
                        );

                        return {
                            cd_modalidade: cdModalidade,
                            ds_modalidade: modalidade?.ds_modalidade ?? "",
                            servico: formulario.servico,
                            recepcao: formulario.recepcao.trim(),
                            localizacao: formulario.localizacao.trim() || undefined,
                            ativo: formulario.ativo,
                        };
                    });

                await Promise.all(
                    payloads.map((payload) => cadastrarRecepcaoModalidade(payload)),
                );

                alert(
                    `${payloads.length} modalidade${payloads.length === 1 ? "" : "s"
                    } cadastrada${payloads.length === 1 ? "" : "s"} com sucesso.`,
                );
            }

            limparFormulario();
            setRecepcoes(await buscarRecepcoesModalidades());
        } catch (error) {
            console.error("Erro ao salvar recepção:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Não foi possível salvar a recepção.",
            );
        } finally {
            setSalvando(false);
        }
    }

    async function excluirRecepcao(item: RecepcaoModalidade) {
        const confirmado = window.confirm(
            `Deseja excluir ${item.ds_modalidade} do serviço ${NOMES_SERVICOS[item.servico]}?`,
        );

        if (!confirmado) return;

        try {
            await excluirRecepcaoModalidade(item.id);

            if (editandoId === item.id) {
                limparFormulario();
            }

            setRecepcoes((estadoAtual) =>
                estadoAtual.filter((recepcao) => recepcao.id !== item.id),
            );
        } catch (error) {
            console.error("Erro ao excluir recepção:", error);
            alert("Não foi possível excluir a recepção.");
        }
    }

    async function alterarStatus(item: RecepcaoModalidade) {
        const payload: RecepcaoModalidadePayload = {
            cd_modalidade: item.cd_modalidade,
            ds_modalidade: item.ds_modalidade,
            servico: item.servico,
            recepcao: item.recepcao,
            localizacao: item.localizacao ?? undefined,
            ativo: !item.ativo,
        };

        try {
            const atualizado = await alterarRecepcaoModalidade(item.id, payload);

            setRecepcoes((estadoAtual) =>
                estadoAtual.map((recepcao) =>
                    recepcao.id === item.id ? atualizado : recepcao,
                ),
            );
        } catch (error) {
            console.error("Erro ao alterar status:", error);
            alert("Não foi possível alterar o status.");
        }
    }

    const modalidadesDisponiveis = useMemo(() => {
        const codigosCadastrados = new Set(
            recepcoes
                .filter((item) => item.servico === formulario.servico)
                .map((item) => item.cd_modalidade),
        );

        return modalidades.filter((modalidade) => {
            const jaSelecionada = formulario.modalidades.includes(
                modalidade.cd_modalidade,
            );
            const jaCadastrada = codigosCadastrados.has(modalidade.cd_modalidade);

            if (editandoId) {
                return formulario.modalidades.includes(modalidade.cd_modalidade);
            }

            return !jaSelecionada && !jaCadastrada;
        });
    }, [modalidades, recepcoes, formulario.modalidades, formulario.servico, editandoId]);

    const recepcoesFiltradas = useMemo(() => {
        const termo = busca.trim().toLocaleLowerCase("pt-BR");

        if (!termo) return recepcoes;

        return recepcoes.filter((item) =>
            [
                item.ds_modalidade,
                NOMES_SERVICOS[item.servico],
                item.servico,
                item.recepcao,
                item.localizacao ?? "",
                String(item.cd_modalidade),
            ].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo)),
        );
    }, [busca, recepcoes]);

    return (
        <Base>
            <div className="min-h-screen bg-gray-50 p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Recepções por modalidade
                    </h1>

                    <p className="mt-2 text-base font-medium text-gray-500">
                        Cadastre a recepção e a localização para cada modalidade do Clinux.
                    </p>
                </div>

                <form
                    onSubmit={salvarRecepcao}
                    className="mb-8 rounded-2xl border bg-white p-6 shadow-sm"
                >
                    <div className="mb-6 flex flex-col gap-2 border-b pb-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                {editandoId ? "Editar recepção" : "Nova recepção"}
                            </h2>

                            <p className="text-sm font-medium text-gray-500">
                                Uma modalidade pode ter uma recepção diferente para cada serviço.
                            </p>
                        </div>

                        {editandoId && (
                            <button
                                type="button"
                                onClick={limparFormulario}
                                className="h-11 rounded-xl border border-gray-300 px-5 font-bold text-gray-700 hover:bg-gray-100"
                            >
                                Cancelar edição
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                            <span className="font-bold text-gray-700">Serviço</span>

                            <select
                                value={formulario.servico}
                                onChange={(event) =>
                                    setFormulario((estadoAtual) => ({
                                        ...estadoAtual,
                                        modalidades: editandoId ? estadoAtual.modalidades : [],
                                        servico: event.target.value as ServicoRecepcao,
                                    }))
                                }
                                disabled={Boolean(editandoId)}
                                className="h-12 rounded-xl border bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-200"
                            >
                                <option value="B">Atendimentos</option>
                                <option value="D">Agendamento</option>
                                <option value="C">Resultados</option>
                            </select>
                        </label>

                        <div className="hidden md:block" />

                        <label className="flex flex-col gap-2 md:col-span-2">
                            <span className="font-bold text-gray-700">Modalidades</span>

                            <select
                                value=""
                                onChange={(event) => {
                                    const cdModalidade = Number(event.target.value);

                                    if (cdModalidade) {
                                        adicionarModalidade(cdModalidade);
                                    }
                                }}
                                disabled={Boolean(editandoId)}
                                className="h-12 rounded-xl border bg-white px-4 text-lg font-semibold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-gray-200"
                            >
                                <option value="">
                                    {editandoId
                                        ? "Modalidade não pode ser alterada durante a edição"
                                        : "+ Adicionar modalidade"}
                                </option>

                                {modalidadesDisponiveis.map((modalidade) => (
                                    <option
                                        key={modalidade.cd_modalidade}
                                        value={modalidade.cd_modalidade}
                                    >
                                        {modalidade.ds_modalidade}
                                    </option>
                                ))}
                            </select>

                            <div className="flex min-h-20 flex-wrap gap-3 rounded-xl border bg-gray-50 p-4">
                                {formulario.modalidades.length === 0 ? (
                                    <div className="flex w-full items-center justify-center font-semibold text-gray-400">
                                        Nenhuma modalidade selecionada
                                    </div>
                                ) : (
                                    formulario.modalidades.map((cdModalidade) => {
                                        const modalidade = modalidades.find(
                                            (item) => item.cd_modalidade === cdModalidade,
                                        );

                                        return (
                                            <div
                                                key={cdModalidade}
                                                className="flex h-10 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 font-semibold text-blue-700"
                                            >
                                                <span>
                                                    {modalidade?.ds_modalidade ??
                                                        `Modalidade ${cdModalidade}`}
                                                </span>

                                                {!editandoId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removerModalidade(cdModalidade)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-red-600"
                                                        aria-label={`Remover ${modalidade?.ds_modalidade ?? cdModalidade
                                                            }`}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="font-bold text-gray-700">Recepção</span>

                            <input
                                value={formulario.recepcao}
                                onChange={(event) =>
                                    setFormulario((estadoAtual) => ({
                                        ...estadoAtual,
                                        recepcao: event.target.value,
                                    }))
                                }
                                placeholder="Ex.: Recepção 1"
                                maxLength={100}
                                className="h-12 rounded-xl border px-4 text-lg font-semibold outline-none focus:border-blue-500"
                            />
                        </label>

                        <label className="flex flex-col gap-2">
                            <span className="font-bold text-gray-700">
                                Localização ou andar
                            </span>

                            <input
                                value={formulario.localizacao}
                                onChange={(event) =>
                                    setFormulario((estadoAtual) => ({
                                        ...estadoAtual,
                                        localizacao: event.target.value,
                                    }))
                                }
                                placeholder="Ex.: Térreo ou Primeiro andar"
                                maxLength={100}
                                className="h-12 rounded-xl border px-4 text-lg font-semibold outline-none focus:border-blue-500"
                            />
                        </label>

                        <div className="flex flex-col gap-2">
                            <span className="font-bold text-gray-700">Situação</span>

                            <button
                                type="button"
                                onClick={() =>
                                    setFormulario((estadoAtual) => ({
                                        ...estadoAtual,
                                        ativo: !estadoAtual.ativo,
                                    }))
                                }
                                className={`flex h-12 items-center justify-between rounded-xl px-4 text-lg font-bold text-white transition ${formulario.ativo ? "bg-green-600" : "bg-gray-400"
                                    }`}
                            >
                                <span>{formulario.ativo ? "Ativa" : "Inativa"}</span>

                                <span
                                    className={`relative h-7 w-14 rounded-full transition ${formulario.ativo ? "bg-green-800" : "bg-gray-500"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${formulario.ativo ? "left-8" : "left-1"
                                            }`}
                                    />
                                </span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={salvando}
                        className="mt-7 h-14 rounded-xl bg-gray-500 px-10 text-xl font-bold text-white shadow-sm hover:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                    >
                        {salvando
                            ? "Salvando..."
                            : editandoId
                                ? "Salvar alterações"
                                : "Cadastrar recepção"}
                    </button>
                </form>

                <div className="rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Recepções cadastradas
                            </h2>

                            <p className="text-sm font-medium text-gray-500">
                                {recepcoes.length} configuração
                                {recepcoes.length === 1 ? "" : "ões"} cadastrada
                                {recepcoes.length === 1 ? "" : "s"}.
                            </p>
                        </div>

                        <input
                            value={busca}
                            onChange={(event) => setBusca(event.target.value)}
                            placeholder="Buscar modalidade ou recepção"
                            className="h-12 w-full rounded-xl border px-4 text-lg font-semibold outline-none focus:border-blue-500 md:w-96"
                        />
                    </div>

                    {carregando ? (
                        <div className="flex min-h-52 items-center justify-center text-lg font-semibold text-gray-500">
                            Carregando...
                        </div>
                    ) : recepcoesFiltradas.length === 0 ? (
                        <div className="flex min-h-52 items-center justify-center rounded-xl border border-dashed bg-gray-50 text-lg font-semibold text-gray-400">
                            Nenhuma recepção encontrada.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 text-sm uppercase tracking-wide text-gray-600">
                                    <tr>
                                        <th className="px-5 py-4">Modalidade</th>
                                        <th className="px-5 py-4">Serviço</th>
                                        <th className="px-5 py-4">Recepção</th>
                                        <th className="px-5 py-4">Localização</th>
                                        <th className="px-5 py-4 text-center">Situação</th>
                                        <th className="px-5 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {recepcoesFiltradas.map((item) => (
                                        <tr
                                            key={item.id}
                                            className={!item.ativo ? "bg-gray-50 opacity-70" : ""}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-gray-900">
                                                    {item.ds_modalidade}
                                                </div>

                                                <div className="text-sm font-medium text-gray-500">
                                                    Código {item.cd_modalidade}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 font-bold text-gray-700">
                                                {NOMES_SERVICOS[item.servico]}
                                            </td>

                                            <td className="px-5 py-4 text-lg font-bold text-gray-800">
                                                {item.recepcao}
                                            </td>

                                            <td className="px-5 py-4 font-semibold text-gray-600">
                                                {item.localizacao || "Não informada"}
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => void alterarStatus(item)}
                                                    className={`rounded-full px-4 py-2 text-sm font-bold text-white ${item.ativo ? "bg-green-600" : "bg-gray-400"
                                                        }`}
                                                >
                                                    {item.ativo ? "Ativa" : "Inativa"}
                                                </button>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => editarRecepcao(item)}
                                                        className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                                                    >
                                                        Editar
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => void excluirRecepcao(item)}
                                                        className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Base>
    );
}