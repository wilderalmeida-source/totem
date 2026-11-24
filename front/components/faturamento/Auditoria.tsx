"use client";

import { Fragment, useMemo, useState } from "react";
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronRight, Download, Info, ScanSearch, ShieldCheck, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, Kpi, Painel, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { BarraFiltros, CabecalhoFaturamento, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { ordenarVerificacoes, type Gravidade, type RespostaAuditoria } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const data = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const GRAV: Record<Gravidade, [string, string, string]> = {
  alta: ["Alta", "bg-red-100 text-red-700", "#ef4444"], media: ["Média", "bg-amber-100 text-amber-800", "#f59e0b"], baixa: ["Baixa", "bg-slate-100 text-slate-600", "#94a3b8"],
};
const SERIES: Array<[keyof RespostaAuditoria["evolucao"][number], string, string]> = [
  ["sem_faturamento", "Sem faturamento > 30 dias", "#ef4444"], ["faturado_cancelado", "Faturado com atendimento cancelado", "#b91c1c"],
  ["datas", "Datas incompatíveis", "#f59e0b"], ["sem_informacao", "Sem guia/autorização", "#8b5cf6"], ["valor_zerado", "Valor zerado", "#64748b"],
];

export default function AuditoriaFaturamento() {
  const [f, setF] = useFiltrosFaturamento();
  const { dados, carregando, erro, atualizar } = useResumo<RespostaAuditoria>("/api/backend/clinux/faturamento/auditoria", f);
  const [aberta, setAberta] = useState<string | null>(null);

  const v = useMemo(() => {
    if (!dados) return null;
    const l = ordenarVerificacoes(dados.verificacoes);
    const com = l.filter(x => x.quantidade > 0);
    const por = (g: Gravidade) => com.filter(x => x.gravidade === g);
    return {
      lista: l, alertas: com.reduce((s, x) => s + x.quantidade, 0), impacto: com.reduce((s, x) => s + x.impacto, 0),
      alta: por("alta"), media: por("media"), baixa: por("baixa"),
      evolucao: [...dados.evolucao].sort((a, b) => a.mes.localeCompare(b.mes)).map(e => ({ ...e, rotulo: rotuloMes(e.mes) })),
    };
  }, [dados]);

  function exportar() {
    if (!v) return;
    const cab = ["Verificação", "Gravidade", "Exame", "Atendimento", "Lote", "Guia/número", "Data", "Convênio", "Procedimento", "Valor", "Detalhe"];
    const corpo = v.lista.flatMap(x => x.itens.map(i => [x.titulo, GRAV[x.gravidade][0], i.exame ?? "", i.atendimento ?? "", i.lote ?? "", i.guia ?? "", i.data ?? "", i.convenio ?? "", i.procedimento ?? "", i.valor.toFixed(2).replace(".", ","), i.detalhe ?? ""]));
    const csv = [cab, ...corpo].map(l => l.map(y => `"${String(y).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `auditoria-faturamento-${f.inicio}-a-${f.fim}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Rodando as verificações de auditoria…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/auditoria" titulo="Auditoria automática" icone={ScanSearch} descricao="Possíveis inconsistências nos dados do Clinux. São alertas para conferir, não erros confirmados: a correção é feita no Clinux."
          atualizadoEm={dados?.atualizadoEm} carregando={carregando} onAtualizar={atualizar} />
        <BarraFiltros f={f} setF={setF} comBase={false} />
        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {dados && v && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Alertas encontrados" valor={fmtN(v.alertas)} icone={ScanSearch} variacao={null} detalhe={`${v.lista.filter(x => x.quantidade).length} de ${v.lista.length} verificações com ocorrências`} destaque={COR.primaria} />
              <Kpi titulo="Impacto financeiro estimado" valor={R(v.impacto)} icone={AlertOctagon} variacao={null} detalhe="soma dos valores envolvidos (pode haver sobreposição)" destaque={COR.critico} />
              <Kpi titulo="Gravidade alta" valor={fmtN(v.alta.reduce((s, x) => s + x.quantidade, 0))} icone={AlertTriangle} variacao={null} detalhe={`${R(v.alta.reduce((s, x) => s + x.impacto, 0))} · ${v.alta.length} verificações`} destaque={COR.critico} />
              <Kpi titulo="Gravidade média e baixa" valor={fmtN(v.media.reduce((s, x) => s + x.quantidade, 0) + v.baixa.reduce((s, x) => s + x.quantidade, 0))} icone={Info} variacao={null} detalhe={`média ${fmtN(v.media.reduce((s, x) => s + x.quantidade, 0))} · baixa ${fmtN(v.baixa.reduce((s, x) => s + x.quantidade, 0))}`} destaque={COR.atencao} />
            </div>

            <Painel titulo="Evolução das inconsistências" subtitulo="Ocorrências por mês do exame (6 meses) nas verificações de exame." icone={TrendingUp}>
              {v.evolucao.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer>
                    <LineChart data={v.evolucao} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
                      <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
                      <YAxis tick={eixo} tickLine={false} axisLine={false} width={48} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {SERIES.map(([k, nome, cor]) => <Line key={k} name={nome} type="monotone" dataKey={k} stroke={cor} strokeWidth={2} dot={{ r: 3 }} />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <Vazio altura={260} />}
            </Painel>

            <Painel titulo="Verificações" subtitulo="Ordenadas por gravidade e impacto. Clique para ver as ocorrências (até 200 por verificação)." icone={ShieldCheck}
              acao={<button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={15} />CSV</button>}>
              <div className="space-y-2">
                {v.lista.map(x => (
                  <Fragment key={x.id}>
                    <button onClick={() => setAberta(a => (a === x.id ? null : x.id))} disabled={!x.quantidade}
                      className={`flex w-full flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${x.quantidade ? "border-slate-200 hover:bg-slate-50" : "border-slate-100 opacity-60"}`}>
                      {x.quantidade ? (aberta === x.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : <ShieldCheck size={16} className="text-emerald-600" />}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${GRAV[x.gravidade][1]}`}>{GRAV[x.gravidade][0]}</span>
                      <span className="min-w-0 flex-1"><b className="text-slate-900">{x.titulo}</b><span className="block text-xs text-slate-500">{x.descricao}</span></span>
                      <span className="text-right text-sm tabular-nums">{x.quantidade ? <><b>{fmtN(x.quantidade)}</b> ocorrências<span className="block text-xs text-slate-500">{R(x.impacto)}</span></> : <span className="text-emerald-700">nenhuma ocorrência</span>}</span>
                    </button>
                    {aberta === x.id && x.itens.length > 0 && (
                      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                        <table className="w-full min-w-[900px] text-xs">
                          <thead><tr className="text-left text-slate-500"><th className="px-2 py-1">Exame / atend.</th><th className="px-2 py-1">Lote / guia</th><th className="px-2 py-1">Data</th><th className="px-2 py-1">Convênio</th><th className="px-2 py-1">Procedimento</th><th className="px-2 py-1 text-right">Valor</th><th className="px-2 py-1">Detalhe</th></tr></thead>
                          <tbody>{x.itens.map((i, n) => (
                            <tr key={n} className="border-t border-slate-200">
                              <td className="px-2 py-1">{i.exame ?? "—"}{i.atendimento ? ` / ${i.atendimento}` : ""}</td>
                              <td className="px-2 py-1">{i.lote ?? "—"}{i.guia ? ` · ${i.guia}` : ""}</td>
                              <td className="px-2 py-1">{data(i.data)}</td>
                              <td className="max-w-[160px] truncate px-2 py-1">{i.convenio ?? "—"}</td>
                              <td className="max-w-[200px] truncate px-2 py-1">{i.procedimento ?? "—"}</td>
                              <td className="px-2 py-1 text-right tabular-nums">{formatarReais(i.valor)}</td>
                              <td className="px-2 py-1">{i.detalhe ?? ""}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                        {x.quantidade > x.itens.length && <p className="mt-2 text-xs text-slate-500">Mostrando {x.itens.length} de {fmtN(x.quantidade)} ocorrências (as de maior valor).</p>}
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </Painel>
            <p className="text-xs text-slate-400">Não verificado por falta de dado no Clinux: procedimento realizado × faturado (não há registro separado do procedimento faturado), divergência de quantidade, glosas e lotes sem retorno da operadora (retorno TISS importado só em alguns meses). O histórico de anomalias é mostrado pela evolução mensal.</p>
          </div>
        )}
      </div>
    </main>
  );
}
