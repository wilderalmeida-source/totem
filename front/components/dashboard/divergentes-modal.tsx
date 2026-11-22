"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Download, Search, UserX, X } from "lucide-react";
import { formatarData } from "./wait-charts";

// Ficha em que quem chamou a senha não é quem concluiu a ficha: erro "Botão Ficha não marcado" de quem chamou.
export type FichaDivergente = {
  cdAtendimento: number
  data: string
  horaChamada: string
  horaFicha: string
  cdFuncionarioSenha: number | null
  funcionarioSenha: string | null
  senhaPeloLog?: boolean      // false: não há "H. Senha" no log do Clinux; usa o funcionário gravado na senha do totem
  cdFuncionario: number | null
  funcionario: string | null
  modalidade: string
  convenio: string | null
  cdPaciente: number | null
  paciente: string | null
}

const quemChamou = (f: FichaDivergente) => f.funcionarioSenha ?? (f.cdFuncionarioSenha === null ? "Sem registro de quem chamou" : `Funcionário ${f.cdFuncionarioSenha}`);
const quemFez = (f: FichaDivergente) => f.funcionario ?? "Não informado";
const chavePar = (f: FichaDivergente) => `${f.cdFuncionarioSenha ?? "-"}>${f.cdFuncionario ?? "-"}`;

export function DivergentesModal({ fichas, onFechar }: { fichas: FichaDivergente[]; onFechar: () => void }) {
  const [busca, setBusca] = useState("");
  const [par, setPar] = useState<string | null>(null);
  const [limite, setLimite] = useState(50);

  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", fechar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = overflow; };
  }, [onFechar]);

  // Combinações "chamou → fez a ficha" mais frequentes: mostram onde está o problema de processo.
  const pares = useMemo(() => {
    const mapa = new Map<string, { chave: string; chamou: string; fez: string; total: number }>();
    for (const f of fichas) {
      const k = chavePar(f);
      const p = mapa.get(k) ?? { chave: k, chamou: quemChamou(f), fez: quemFez(f), total: 0 };
      p.total += 1;
      mapa.set(k, p);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }, [fichas]);
  const semRegistro = fichas.filter(f => f.cdFuncionarioSenha === null).length;
  const semLog = fichas.filter(f => f.senhaPeloLog === false).length;

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return fichas
      .filter(f => !par || chavePar(f) === par)
      .filter(f => !termo || [f.cdAtendimento, f.paciente, f.cdPaciente, quemChamou(f), quemFez(f), f.modalidade, f.convenio].join(" ").toLowerCase().includes(termo))
      .sort((a, b) => b.data.localeCompare(a.data) || b.horaFicha.localeCompare(a.horaFicha));
  }, [fichas, busca, par]);

  function exportarCsv() {
    const cab = ["Nº atendimento", "Paciente", "ID paciente", "Data", "Chamada", "Quem chamou a senha", "Ficha", "Quem fez a ficha", "Modalidade", "Convênio"];
    const corpo = lista.map(f => [f.cdAtendimento, f.paciente ?? "", f.cdPaciente ?? "", formatarData(f.data), f.horaChamada, quemChamou(f), f.horaFicha, quemFez(f), f.modalidade, f.convenio ?? ""]);
    const csv = [cab, ...corpo].map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "fichas-funcionarios-diferentes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="divergentes-titulo" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Erro: botão Ficha não marcado</p>
            <h2 id="divergentes-titulo" className="text-2xl font-extrabold text-slate-900">Quem chamou a senha não marcou a ficha</h2>
            <p className="text-sm text-slate-500">
              {fichas.length.toLocaleString("pt-BR")} fichas · {pares.length.toLocaleString("pt-BR")} combinações diferentes
              {semRegistro > 0 && <> · <b className="text-amber-700">{semRegistro.toLocaleString("pt-BR")} senhas sem registro de quem chamou</b></>}
              {semLog > 0 && <> · <b className="text-amber-700">{semLog.toLocaleString("pt-BR")} sem &quot;H. Senha&quot; no log do Clinux</b></>}
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-5 md:p-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Quem esqueceu → quem marcou a ficha · clique para filtrar</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {pares.slice(0, 12).map(p => {
              const ativo = par === p.chave;
              return (
                <button key={p.chave} onClick={() => { setPar(ativo ? null : p.chave); setLimite(50); }}
                  className={`flex max-w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition ${ativo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"}`}>
                  <span className="truncate font-semibold">{p.chamou}</span>
                  <ArrowRight size={13} className="shrink-0 opacity-60" />
                  <span className="truncate font-semibold">{p.fez}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 font-extrabold tabular-nums ${ativo ? "bg-white/20" : "bg-amber-100 text-amber-800"}`}>{p.total.toLocaleString("pt-BR")}</span>
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-md">
              <Search size={16} className="text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nº atendimento, paciente, funcionário…" className="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            <button onClick={exportarCsv} disabled={!lista.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={15} />Exportar CSV</button>
          </div>

          {lista.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Nº atend.</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Chamou a senha</th><th className="px-3 py-2">Fez a ficha</th><th className="px-3 py-2">Modalidade · convênio</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.slice(0, limite).map(f => (
                    <tr key={f.cdAtendimento} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-3 py-2.5">
                        <button type="button" title="Copiar nº do atendimento" onClick={() => void navigator.clipboard?.writeText(String(f.cdAtendimento))}
                          className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 transition hover:bg-blue-100 hover:text-blue-700">{f.cdAtendimento}</button>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{f.paciente ?? "Sem cadastro"}</span>{f.cdPaciente !== null && <span className="block text-xs text-slate-400">ID {f.cdPaciente}</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatarData(f.data)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`flex items-center gap-1.5 font-semibold ${f.cdFuncionarioSenha === null ? "text-amber-700" : "text-slate-900"}`}>{f.cdFuncionarioSenha === null && <UserX size={14} />}{quemChamou(f)}</span>
                        <span className="block text-xs tabular-nums text-slate-400">às {f.horaChamada}{f.senhaPeloLog === false && <span className="ml-1 font-semibold text-amber-600">· sem log da H. Senha</span>}</span>
                      </td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{quemFez(f)}</span><span className="block text-xs tabular-nums text-slate-400">às {f.horaFicha}</span></td>
                      <td className="px-3 py-2.5 text-slate-600">{f.modalidade}<span className="block text-xs text-slate-400">{f.convenio ?? "Sem convênio"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lista.length > limite && <button onClick={() => setLimite(n => n + 100)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Mostrar mais ({(lista.length - limite).toLocaleString("pt-BR")} restantes)</button>}
            </div>
          ) : <p className="py-8 text-center text-sm text-slate-400">Nenhuma ficha com esse filtro.</p>}
        </div>
      </div>
    </div>
  );
}
