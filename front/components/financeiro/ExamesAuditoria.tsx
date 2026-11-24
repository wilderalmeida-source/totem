"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Download, Info, Search, ShieldAlert, Stethoscope, Ticket } from "lucide-react";
import { COR, Kpi, Painel } from "@/components/dashboard/wait-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { formatarReais } from "@/lib/diretoria";
import {
  csvForaDoPadrao, descreverDesvio, nomeConvenio, nomeModalidade, nomePaciente, nomeProcedimento, ticketGeral, ticketPorModalidade,
  type RespostaExames, type Rigor,
} from "@/lib/financeiro-exames";

const R = (n: number | null) => (n === null ? "—" : formatarReais(n));
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null, sinal = false) => (n === null ? "—" : `${sinal && n > 0 ? "+" : ""}${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const dataBr = (iso: string) => iso.split("-").reverse().join("/");

export default function ExamesAuditoria({ inicio, fim, versao }: { inicio: string; fim: string; versao: number }) {
  const [rigor, setRigor] = useState<Rigor>("normal");
  const [dados, setDados] = useState<RespostaExames | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [direcao, setDirecao] = useState<"todos" | "acima" | "abaixo">("todos");
  const [modalidade, setModalidade] = useState<string>("");
  const pedido = useRef(0);
  const ultimaVersao = useRef(versao);

  const carregar = useCallback(async (forcar: boolean) => {
    const n = ++pedido.current;
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/financeiro/exames?${new URLSearchParams({ inicio, fim, rigor, ...(forcar ? { atualizar: "1" } : {}) })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os exames.");
      if (n === pedido.current) { setDados(json); setErro(""); }
    } catch (e) {
      if (n === pedido.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar os exames.");
    } finally {
      if (n === pedido.current) setCarregando(false);
    }
  }, [inicio, fim, rigor]);

  // O botão Atualizar da tela aumenta "versao": recalcula sem usar o cache do servidor.
  useEffect(() => {
    const forcar = versao !== ultimaVersao.current;
    ultimaVersao.current = versao;
    void carregar(forcar);
  }, [carregar, versao]);

  const ticket = useMemo(() => (dados ? ticketPorModalidade(dados) : []), [dados]);
  const geral = useMemo(() => ticketGeral(ticket), [ticket]);
  const maiorTicket = Math.max(0, ...ticket.map(t => t.ticketAtendimento ?? 0));

  const itens = useMemo(() => {
    if (!dados) return [];
    const termo = busca.trim().toLowerCase();
    return dados.foraDoPadrao.itens.filter(i => {
      if (direcao !== "todos" && descreverDesvio(i).direcao !== direcao) return false;
      if (modalidade && String(i.cdModalidade ?? "-") !== modalidade) return false;
      if (!termo) return true;
      return [nomePaciente(dados, i), nomeProcedimento(dados, i), nomeConvenio(dados, i), String(i.cdAtendimento), String(i.cdExame)].some(t => t.toLowerCase().includes(termo));
    });
  }, [dados, busca, direcao, modalidade]);
  const acima = dados ? dados.foraDoPadrao.itens.filter(i => i.valor > i.grupo.mediana).length : 0;
  const abaixo = dados ? dados.foraDoPadrao.itens.length - acima : 0;
  const modalidadesFora = useMemo(() => {
    if (!dados) return [];
    const m = new Map<string, string>();
    for (const i of dados.foraDoPadrao.itens) m.set(String(i.cdModalidade ?? "-"), nomeModalidade(dados, i));
    return [...m].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [dados]);

  function exportar() {
    if (!dados) return;
    const blob = new Blob(["﻿" + csvForaDoPadrao(dados, itens)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `exames-fora-do-padrao_${inicio}_${fim}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando os exames…" />
      {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}
      {dados && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Valor dos exames" valor={formatarReais(geral.valor, true)} icone={Stethoscope} variacao={null} detalhe={`${fmtN(geral.exames)} exames realizados no período`} destaque={COR.primaria} />
          <Kpi titulo="Valor médio por exame" valor={R(geral.porExame)} icone={Ticket} variacao={null} detalhe="convênio + particular" destaque={COR.secundaria} />
          <Kpi titulo="Exames fora do padrão" valor={fmtN(dados.foraDoPadrao.total)} icone={ShieldAlert} variacao={null} detalhe={`${fmtN(acima)} acima · ${fmtN(abaixo)} abaixo do normal`} destaque={dados.foraDoPadrao.total ? COR.critico : COR.ok} />
          <Kpi titulo="Diferença para o normal" valor={formatarReais(dados.foraDoPadrao.impacto, true)} icone={AlertTriangle} variacao={null} detalhe="soma de (valor − valor normal) dos exames fora do padrão" destaque={COR.atencao} />
        </div>

        <Painel titulo="Ticket médio por modalidade" icone={Ticket}
          subtitulo={`Valor dos exames da modalidade ÷ atendimentos com exame dela. Variação em relação a ${dataBr(dados.anterior.inicio)} – ${dataBr(dados.anterior.fim)}.`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Modalidade</th><th className="py-2 pr-3 text-right">Atendimentos</th><th className="py-2 pr-3 text-right">Exames</th>
                <th className="py-2 pr-3 text-right">Valor</th><th className="py-2 pr-3">Ticket por atendimento</th><th className="py-2 pr-3 text-right">Variação</th>
                <th className="py-2 pr-3 text-right">Por exame</th><th className="py-2 pr-3 text-right">Convênio</th><th className="py-2 pr-3 text-right">Particular</th>
              </tr></thead>
              <tbody>{ticket.map(t => (
                <tr key={String(t.cdModalidade)} className="border-b border-slate-100 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{t.nome}<span className="block text-xs font-normal text-slate-400">{fmtP(t.participacao)} do valor</span></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtN(t.atendimentos)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{fmtN(t.exames)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatarReais(t.valor, true)}</td>
                  <td className="py-2 pr-3"><div className="flex items-center gap-2"><span className="w-24 shrink-0 text-right font-bold tabular-nums text-slate-900">{R(t.ticketAtendimento)}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-500" style={{ width: `${maiorTicket ? ((t.ticketAtendimento ?? 0) / maiorTicket) * 100 : 0}%` }} /></span></div></td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-semibold ${t.variacao === null ? "text-slate-400" : t.variacao >= 0 ? "text-emerald-600" : "text-red-600"}`} title={t.ticketAnterior === null ? "Sem atendimentos no período anterior" : `Antes: ${R(t.ticketAnterior)}`}>{fmtP(t.variacao, true)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums" title={`Mediana por exame: ${R(t.medianaExame)}`}>{R(t.ticketExame)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{R(t.ticketConvenio)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{R(t.ticketParticular)}</td>
                </tr>
              ))}</tbody>
            </table>
            {!ticket.length && <p className="py-8 text-center text-slate-500">Nenhum exame realizado no período.</p>}
          </div>
          <p className="mt-3 text-xs text-slate-500">Convênio e Particular: ticket só dos atendimentos que tiveram valor de convênio ou particular naquela modalidade. Passe o mouse em &quot;Por exame&quot; para ver a mediana.</p>
        </Painel>

        <Painel titulo="Exames com valor fora do padrão" icone={ShieldAlert}
          subtitulo="Cada exame é comparado com os exames do mesmo procedimento no mesmo convênio no período. Abra a auditoria pelo atendimento."
          acao={<div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {([["normal", "Fora do normal"], ["extremo", "Só os extremos"]] as const).map(([id, rot]) => (
                <button key={id} onClick={() => setRigor(id)} className={`rounded-lg px-3 py-1.5 transition ${rigor === id ? "bg-white text-slate-900 shadow" : "text-slate-500"}`}>{rot}</button>
              ))}
            </div>
            <button onClick={exportar} disabled={!itens.length} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Download size={14} />Planilha</button>
          </div>}>
          <div className="mb-4 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-slate-700">
            <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
            <p><b>Como funciona:</b> o valor normal é a <b>mediana</b> dos exames do mesmo procedimento e convênio (o valor do meio, que não é puxado pelos próprios erros como a média). Entra na lista o exame que fica muito longe da faixa em que estão os valores comuns
              {rigor === "normal" ? " (1,5 vez essa faixa abaixo ou acima dela)" : " (3 vezes essa faixa: só os casos extremos)"}, com ao menos 5% (e R$ 1) de diferença. Só entram grupos com {dados.minimoGrupo} exames ou mais: foram comparados {fmtN(dados.foraDoPadrao.examesAnalisados)} exames em {fmtN(dados.foraDoPadrao.gruposAnalisados)} grupos. O desvio padrão aparece em cada linha como referência.</p>
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"><Search size={16} className="text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Paciente, atendimento, procedimento ou convênio" className="w-full bg-transparent outline-none" /></label>
            <select value={direcao} onChange={e => setDirecao(e.target.value as typeof direcao)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="todos">Acima e abaixo</option><option value="acima">Só acima do normal</option><option value="abaixo">Só abaixo do normal</option>
            </select>
            <select value={modalidade} onChange={e => setModalidade(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="">Todas as modalidades</option>{modalidadesFora.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          </div>
          {dados.foraDoPadrao.total > dados.foraDoPadrao.itens.length && <p className="mb-3 text-xs font-semibold text-amber-700">Mostrando os {fmtN(dados.foraDoPadrao.itens.length)} exames com maior diferença de {fmtN(dados.foraDoPadrao.total)}. Reduza o período ou use &quot;Só os extremos&quot;.</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead><tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Data</th><th className="py-2 pr-3">Paciente</th><th className="py-2 pr-3">Atendimento</th><th className="py-2 pr-3">Procedimento</th>
                <th className="py-2 pr-3">Convênio</th><th className="py-2 pr-3 text-right">Valor</th><th className="py-2 pr-3 text-right">Normal</th><th className="py-2 pr-3 text-right">Diferença</th><th className="py-2 pr-3 text-right">Desvios</th>
              </tr></thead>
              <tbody>{itens.map(i => {
                const x = descreverDesvio(i);
                return (
                  <tr key={i.cdExame} className="border-b border-slate-100 align-top last:border-0">
                    <td className="py-2 pr-3 tabular-nums">{dataBr(i.data)}</td>
                    <td className="py-2 pr-3 font-semibold text-slate-800">{nomePaciente(dados, i)}</td>
                    <td className="py-2 pr-3 tabular-nums"><b>{i.cdAtendimento}</b><span className="block text-xs text-slate-400">exame {i.cdExame}</span></td>
                    <td className="py-2 pr-3">{nomeProcedimento(dados, i)}<span className="block text-xs text-slate-400">{nomeModalidade(dados, i)}</span></td>
                    <td className="py-2 pr-3">{nomeConvenio(dados, i)}</td>
                    <td className="py-2 pr-3 text-right font-bold tabular-nums" title={`Convênio ${R(i.convenio)} · Particular ${R(i.particular)}`}>{R(i.valor)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums" title={`Faixa comum: ${R(i.grupo.q1)} a ${R(i.grupo.q3)} · média ${R(i.grupo.media)} · desvio padrão ${R(i.grupo.desvio)}`}>{R(i.grupo.mediana)}<span className="block text-xs text-slate-400">{fmtN(i.grupo.exames)} exames</span></td>
                    <td className={`py-2 pr-3 text-right font-semibold tabular-nums ${x.direcao === "acima" ? "text-amber-700" : "text-red-600"}`}>
                      <span className="inline-flex items-center gap-1">{x.direcao === "acima" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}{R(Math.abs(x.diferenca))}</span>
                      <span className="block text-xs font-normal">{fmtP(x.percentual, true)}</span></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-slate-600">{x.desvios === null ? "—" : x.desvios.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            {!itens.length && <p className="py-8 text-center text-slate-500">{dados.foraDoPadrao.itens.length ? "Nenhum exame com esses filtros." : "Nenhum exame com valor fora do padrão no período."}</p>}
          </div>
          <p className="mt-3 text-xs text-slate-500">Passe o mouse em &quot;Normal&quot; para ver a faixa comum, a média e o desvio padrão do grupo; em &quot;Valor&quot;, a parte do convênio e a particular. &quot;Desvios&quot; = quantos desvios padrão o valor está da média.</p>
        </Painel>
      </>}
    </div>
  );
}
