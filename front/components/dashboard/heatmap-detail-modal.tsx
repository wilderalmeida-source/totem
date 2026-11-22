"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { CelulaCalor, SETOR_INFO, Servico, corPorMeta, formatarData, formatarMinutos } from "./wait-charts";

type Item = {
  cdPaciente: number | null; paciente: string | null; data: string; horaSenha: string; horaSaida: string
  minutos: number; modalidade: string; preferencial: boolean; senha: string;
};
type Resposta = { total: number; media: number; itens: Item[] };

type Props = {
  celula: CelulaCalor;
  filtros: { inicio: string; fim: string; servico: Servico; modalidade: string };
  meta: number;
  onFechar: () => void;
};

const hh = (h: number) => `${String(h).padStart(2, "0")}h`;

export function DetalheCalorModal({ celula, filtros, meta, onFechar }: Props) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const controle = new AbortController();
    const qs = new URLSearchParams({ inicio: filtros.inicio, fim: filtros.fim, servico: filtros.servico, diaSemana: String(celula.diaIndice), hora: String(celula.hora) });
    if (filtros.modalidade) qs.set("modalidade", filtros.modalidade);
    fetch(`/api/backend/clinux/dashboard/espera/detalhes?${qs}`, { cache: "no-store", signal: controle.signal })
      .then(async res => { const json = await res.json(); if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os pacientes."); setDados(json); })
      .catch(e => { if (!controle.signal.aborted) setErro(e instanceof Error ? e.message : "Não foi possível carregar os pacientes."); });
    return () => controle.abort();
  }, [celula, filtros]);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", fechar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = overflow; };
  }, [onFechar]);

  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!dados) return [];
    if (!termo) return dados.itens;
    return dados.itens.filter(i => `${i.cdPaciente ?? ""} ${i.paciente ?? ""} ${i.modalidade} ${i.senha}`.toLowerCase().includes(termo));
  }, [dados, busca]);

  const maior = dados?.itens[0]?.minutos ?? 0;
  const acimaMeta = dados?.itens.filter(i => i.minutos > meta).length ?? 0;
  const setor = SETOR_INFO[filtros.servico].concluido;

  function exportarCsv() {
    if (!dados) return;
    const linhas = [
      ["Paciente", "ID paciente", "Data", "Senha emitida", `${setor} às`, "Espera (min)", "Modalidade", "Tipo", "Senha"],
      ...dados.itens.map(i => [i.paciente ?? "", i.cdPaciente ?? "", formatarData(i.data), i.horaSenha, i.horaSaida, String(i.minutos).replace(".", ","), i.modalidade, i.preferencial ? "Preferencial" : "Normal", i.senha]),
    ];
    const csv = linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `espera-${filtros.servico}-${celula.dia}-${hh(celula.hora)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="detalhe-calor-titulo" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{SETOR_INFO[filtros.servico].nome}</p>
            <h2 id="detalhe-calor-titulo" className="text-2xl font-extrabold text-slate-900">{celula.dia} · das {hh(celula.hora)} às {hh(celula.hora + 1)}</h2>
            <p className="text-sm text-slate-500">Senhas emitidas nesse horário, de {formatarData(filtros.inicio)} a {formatarData(filtros.fim)}, da maior para a menor espera.</p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
        </header>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-5 md:grid-cols-4 md:px-6">
          <Resumo rotulo="Pacientes" valor={dados ? dados.total.toLocaleString("pt-BR") : "…"} />
          <Resumo rotulo="Espera média" valor={dados ? formatarMinutos(dados.media) : "…"} cor={dados ? corPorMeta(dados.media, meta) : undefined} />
          <Resumo rotulo="Maior espera" valor={dados ? formatarMinutos(maior) : "…"} cor={dados ? corPorMeta(maior, meta) : undefined} />
          <Resumo rotulo={`Acima da meta (${meta} min)`} valor={dados ? `${acimaMeta} de ${dados.total}` : "…"} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 md:px-6">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-sm">
            <Search size={16} className="text-slate-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, ID, modalidade ou senha" className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
          <button onClick={exportarCsv} disabled={!dados?.itens.length} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={16} />Exportar CSV</button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-5 md:px-6">
          {erro ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{erro}</p>
            : !dados ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-200/70" />)}</div>
            : !itens.length ? <p className="py-10 text-center text-sm text-slate-400">Nenhum paciente encontrado.</p>
            : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="rounded-l-xl px-3 py-2">Paciente</th><th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Senha emitida</th><th className="px-3 py-2">{setor} às</th><th className="px-3 py-2">Modalidade</th>
                    <th className="rounded-r-xl px-3 py-2">Espera</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((i, idx) => {
                    const cor = corPorMeta(i.minutos, meta);
                    return (
                      <tr key={`${i.cdPaciente}-${i.data}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-slate-900">{i.paciente ?? "Sem cadastro"}</span>
                          {i.preferencial && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">Preferencial</span>}
                          {i.cdPaciente !== null && <span className="block text-xs text-slate-400">ID {i.cdPaciente}</span>}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{formatarData(i.data)}</td>
                        <td className="px-3 py-2.5 tabular-nums">{i.horaSenha} <span className="text-xs text-slate-400">({i.senha})</span></td>
                        <td className="px-3 py-2.5 tabular-nums">{i.horaSaida}</td>
                        <td className="px-3 py-2.5">{i.modalidade}</td>
                        <td className="min-w-40 px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full transition-all" style={{ width: `${maior ? Math.max(4, (i.minutos / maior) * 100) : 0}%`, background: cor }} />
                            </div>
                            <span className="w-20 shrink-0 whitespace-nowrap text-right text-xs font-extrabold tabular-nums" style={{ color: cor }}>{formatarMinutos(i.minutos)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          {dados && dados.total >= 200 && <p className="mt-3 text-xs text-slate-400">Mostrando as 200 maiores esperas desse horário.</p>}
        </div>
      </div>
    </div>
  );
}

function Resumo({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{rotulo}</p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums text-slate-900" style={cor ? { color: cor } : undefined}>{valor}</p>
    </div>
  );
}
