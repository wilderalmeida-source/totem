"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type Guiche = {
    id: number;
    numero: string;
    nome: string;
    ativo: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export default function GuichesPage() {
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [guiches, setGuiches] = useState<Guiche[]>([]);
    const [numero, setNumero] = useState("");
    const [nome, setNome] = useState("");
    const [ativo, setAtivo] = useState(true);
    const [editandoId, setEditandoId] = useState<number | null>(null);

    const carregarGuiches = useCallback(async () => {
        const response = await fetch("/api/guiches", {
            cache: "no-store",
        });

        const data = await response.json();
        setGuiches(Array.isArray(data) ? data : []);
    }, []);

    useEffect(() => {
        (async () => {
            try {
                await carregarGuiches();
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [carregarGuiches]);

    function limparFormulario() {
        setNumero("");
        setNome("");
        setAtivo(true);
        setEditandoId(null);
    }

    async function salvarGuiche() {
        const numeroLimpo = numero.trim();
        const nomeLimpo = nome.trim();

        if (!numeroLimpo || !nomeLimpo) {
            alert("Informe o número e o nome do guichê.");
            return;
        }

        setBusy("salvar");

        try {
            const body = {
                numero: numeroLimpo,
                nome: nomeLimpo,
                ativo,
            };

            const url = editandoId ? `/api/guiches/${editandoId}` : "/api/guiches";
            const method = editandoId ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                alert("Erro ao salvar guichê.");
                return;
            }

            limparFormulario();
            await carregarGuiches();
        } finally {
            setBusy(null);
        }
    }

    function editarGuiche(guiche: Guiche) {
        setEditandoId(guiche.id);
        setNumero(guiche.numero);
        setNome(guiche.nome);
        setAtivo(guiche.ativo);
    }

    async function excluirGuiche(id: number) {
        if (!confirm("Deseja excluir este guichê?")) return;

        setBusy(`excluir:${id}`);

        try {
            const response = await fetch(`/api/guiches/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                alert("Erro ao excluir guichê.");
                return;
            }

            await carregarGuiches();

            if (editandoId === id) {
                limparFormulario();
            }
        } finally {
            setBusy(null);
        }
    }

    if (loading) {
        return <div className="p-6">Carregando...</div>;
    }

    return (
        <div className="p-6 space-y-8 [&>a]:hidden">
            <Link href="/configuracao">
                <Button>Configurações</Button>
            </Link>

            <Link href="/status" className="ml-3">
                <Button>Status</Button>
            </Link>

            <div className="border rounded-2xl p-5 shadow-sm bg-white space-y-4">
                <div>
                    <h2 className="text-xl font-bold">Cadastro de guichês</h2>
                    <p className="text-sm text-gray-500">
                        Configure o nome que aparecerá no painel e será falado na chamada.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                        className="border rounded-xl p-2"
                        placeholder='Número. Ex: "01"'
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                    />

                    <input
                        className="border rounded-xl p-2 md:col-span-2"
                        placeholder='Nome. Ex: "Recepção Principal"'
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                    />

                    <label className="border rounded-xl p-2 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={ativo}
                            onChange={(e) => setAtivo(e.target.checked)}
                        />
                        Ativo
                    </label>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <button
                        disabled={busy === "salvar"}
                        onClick={salvarGuiche}
                        className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
                    >
                        {editandoId ? "Atualizar guichê" : "Cadastrar guichê"}
                    </button>

                    {editandoId && (
                        <button
                            onClick={limparFormulario}
                            className="px-3 py-2 rounded-xl border"
                        >
                            Cancelar edição
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left py-2 pr-4">Número</th>
                                <th className="text-left py-2 pr-4">Nome</th>
                                <th className="text-left py-2 pr-4">Ativo</th>
                                <th className="text-left py-2 pr-4">Atualizado</th>
                                <th className="text-right py-2 pr-4">Ações</th>
                            </tr>
                        </thead>

                        <tbody>
                            {guiches.map((guiche) => (
                                <tr key={guiche.id} className="border-b last:border-0">
                                    <td className="py-2 pr-4 font-mono">{guiche.numero}</td>
                                    <td className="py-2 pr-4">{guiche.nome}</td>
                                    <td className="py-2 pr-4">
                                        {guiche.ativo ? "Sim" : "Não"}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                        {guiche.updatedAt
                                            ? new Date(guiche.updatedAt).toLocaleString("pt-BR")
                                            : "-"}
                                    </td>
                                    <td className="py-2 pr-4 text-right space-x-2">
                                        <button
                                            onClick={() => editarGuiche(guiche)}
                                            className="px-3 py-1 rounded-lg border text-xs"
                                        >
                                            Editar
                                        </button>

                                        <button
                                            disabled={busy === `excluir:${guiche.id}`}
                                            onClick={() => excluirGuiche(guiche.id)}
                                            className="px-3 py-1 rounded-lg border text-xs disabled:opacity-60"
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {guiches.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-4 text-gray-500">
                                        Nenhum guichê cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
