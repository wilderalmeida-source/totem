"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, RotateCcw, Save, Target } from "lucide-react";
import { Painel } from "@/components/dashboard/wait-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { celulaOrcada, folhaDeReceita, formatarValor, realizadoPorFolha, valorLinha, type LinhaEstrutura, type RespostaValores } from "@/lib/dre";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const num = (s: string) => { const n = Number(s.replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };

// Orçamento anual por linha da DRE e mês. Receitas e despesas são digitadas em valores positivos; a DRE aplica o sinal.
export function OrcamentoDre({ estrutura, podeEditar }: { estrutura: LinhaEstrutura[]; podeEditar: boolean }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [valores, setValores] = useState<Record<string, number[]>>({});
  const [info, setInfo] = useState<{ atualizadoEm: string | null; atualizadoPor: string | null }>({ atualizadoEm: null, atualizadoPor: null });
  const [alterado, setAlterado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [crescimento, setCrescimento] = useState("5");
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/backend/clinux/dre/orcamento?ano=${ano}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível carregar o orçamento.");
      setValores(j.valores ?? {}); setInfo({ atualizadoEm: j.atualizadoEm, atualizadoPor: j.atualizadoPor }); setAlterado(false); setMsg("");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erro"); } finally { setCarregando(false); }
  }, [ano]);
  useEffect(() => { void carregar(); }, [carregar]);

  const totais = useMemo(() => Array.from({ length: 12 }, (_, i) => celulaOrcada(estrutura, { [ano]: valores }, [`${ano}-${String(i + 1).padStart(2, "0")}`])), [estrutura, valores, ano]);
  const anual = useMemo(() => celulaOrcada(estrutura, { [ano]: valores }, MESES.map((_, i) => `${ano}-${String(i + 1).padStart(2, "0")}`)), [estrutura, valores, ano]);

  const editar = (folha: string, i: number, texto: string) => {
    setValores(v => { const linha = [...(v[folha] ?? Array(12).fill(0))]; linha[i] = num(texto); return { ...v, [folha]: linha }; });
    setAlterado(true);
  };

  async function copiarRealizado() {
    setCarregando(true); setMsg("");
    try {
      const r = await fetch(`/api/backend/clinux/dre/valores?de=${ano - 1}-01&ate=${ano - 1}-12`, { cache: "no-store" });
      const j: RespostaValores & { error?: string } = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Não foi possível ler o realizado.");
      setValores(realizadoPorFolha(estrutura, j, ano - 1, 1 + num(crescimento) / 100));
      setAlterado(true);
      setMsg(`Preenchido com o realizado de ${ano - 1} ${num(crescimento) >= 0 ? "+" : ""}${crescimento}%. Revise e salve.`);
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erro"); } finally { setCarregando(false); }
  }

  async function salvar() {
    setSalvando(true); setMsg("");
    try {
      const limpo = Object.fromEntries(Object.entries(valores).filter(([, l]) => l.some(Boolean)).map(([k, l]) => [k, l.map(x => Math.round(x * 100) / 100)]));
      const r = await fetch(`/api/backend/clinux/dre/orcamento/${ano}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valores: limpo }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 403 ? "Seu usuário não tem permissão para editar o orçamento." : j.error ?? "Não foi possível salvar.");
      await carregar();
      setMsg("Orçamento salvo. Ative “Orçado × realizado” no demonstrativo para comparar.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Erro"); } finally { setSalvando(false); }
  }

  return (
    <div className="space-y-4">
      <AvisoCarregando ativo={carregando} mensagem="Carregando o orçamento…" />
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Ano
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 px-2 font-bold">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 1 - i).map(a => <option key={a}>{a}</option>)}
          </select>
        </label>
        {podeEditar && (
          <>
            <span className="flex items-center gap-2 text-sm text-slate-600">
              <button onClick={() => void copiarRealizado()} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 hover:bg-slate-50"><Copy size={15} />Copiar realizado de {ano - 1}</button>
              com <input value={crescimento} onChange={e => setCrescimento(e.target.value)} className="h-9 w-16 rounded-lg border border-slate-200 px-2 text-right" inputMode="decimal" /> % de ajuste
            </span>
            <button onClick={() => void carregar()} disabled={!alterado} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RotateCcw size={15} />Descartar</button>
            <button onClick={() => void salvar()} disabled={!alterado || salvando} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow hover:bg-blue-700 disabled:opacity-50">
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Salvar
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-slate-400">{info.atualizadoEm ? `Salvo por ${info.atualizadoPor} em ${new Date(info.atualizadoEm).toLocaleString("pt-BR")}` : "Nenhum orçamento salvo para este ano."}</span>
      </section>
      {!podeEditar && <p className="text-sm text-slate-500">Somente leitura: editar o orçamento exige “DRE — editar estrutura e orçamento”.</p>}
      {msg && <p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{msg}</p>}

      <Painel titulo={`Orçamento ${ano}`} subtitulo="Valores positivos por linha e mês (receitas e despesas). Totais e resultado calculados pela estrutura da DRE." icone={Target}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
              <th className="sticky left-0 z-10 rounded-l-xl bg-slate-50 px-3 py-2 text-left">Linha</th>
              {MESES.map(m => <th key={m} className="bg-slate-50 px-2 py-2">{m}</th>)}
              <th className="rounded-r-xl bg-blue-50 px-3 py-2 text-blue-800">Ano</th>
            </tr></thead>
            <tbody>
              {estrutura.map(l => l.tipo === "total" ? (
                <tr key={l.id} className={`border-b border-slate-100 ${l.memo ? "italic text-violet-700" : "bg-blue-50/60 font-extrabold text-slate-900"}`}>
                  <td className="sticky left-0 z-10 bg-blue-50 px-3 py-2">{l.nome}</td>
                  {totais.map((c, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{formatarValor(valorLinha(c, l.id))}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums">{formatarValor(valorLinha(anual, l.id))}</td>
                </tr>
              ) : [
                <tr key={l.id} className="border-b border-slate-100 font-bold text-slate-900">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">{l.nome}</td>
                  {totais.map((c, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{formatarValor(valorLinha(c, l.id))}</td>)}
                  <td className="px-3 py-2 text-right tabular-nums">{formatarValor(valorLinha(anual, l.id))}</td>
                </tr>,
                ...l.folhas.map(f => (
                  <tr key={f.id} className="border-b border-slate-100 text-slate-700">
                    <td className="sticky left-0 z-10 bg-white py-1.5 pl-8 pr-3">{f.nome}<span className="ml-1 text-[10px] text-slate-400">{folhaDeReceita(f.id) ? "receita" : "despesa"}</span></td>
                    {MESES.map((_, i) => (
                      <td key={i} className="px-1 py-1">
                        <input disabled={!podeEditar} defaultValue={valores[f.id]?.[i] ? formatarValor(valores[f.id][i]) : ""} key={`${ano}-${f.id}-${i}-${valores[f.id]?.[i] ?? 0}`}
                          onBlur={e => editar(f.id, i, e.target.value)} inputMode="decimal"
                          className="h-8 w-full min-w-[84px] rounded-md border border-slate-200 px-1.5 text-right text-xs tabular-nums disabled:bg-slate-50" />
                      </td>
                    ))}
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatarValor((valores[f.id] ?? []).reduce((s, x) => s + x, 0))}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}
