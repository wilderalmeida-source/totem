"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, Droplets, Layers, Grid3x3, ShieldAlert, Stethoscope, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Kpi, Painel, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { Alternador } from "@/components/dashboard/laudos-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { RankingBarras, type ItemRanking } from "@/components/dashboard/diretoria-charts";
import { BarraFiltros, CabecalhoFaturamento, Secao, useFiltrosFaturamento, useResumo } from "@/components/faturamento/comum";
import { formatarReais, rotuloMes } from "@/lib/diretoria";
import { comContraste, diasMedios, pct, taxaGlosa, tendencia, ticket, type Grupo, type RespostaCruzado, type RespostaResumo } from "@/lib/faturamento";

const R = (n: number) => formatarReais(n, true);
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");
const fmtP = (n: number | null) => (n === null ? "—" : `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`);
const CORES = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9", "#84cc16", "#ec4899"];
type RankProc = "faturado" | "volume" | "menorVolume" | "valorMedio" | "glosa" | "taxaGlosa";

export default function ModalidadesProcedimentos() {
  const [f, setF] = useFiltrosFaturamento();
  const r = useResumo<RespostaResumo>("/api/backend/clinux/faturamento/resumo", f);
  const c = useResumo<RespostaCruzado>("/api/backend/clinux/faturamento/cruzado", f);
  const [rank, setRank] = useState<RankProc>("faturado");
  const [matriz, setMatriz] = useState<"faturado" | "exames">("faturado");
  const [procsGrafico, setProcsGrafico] = useState<number[]>([]);

  const nomeMod = (id: number | null) => (id === null ? "Sem modalidade" : r.dados?.nomes.modalidades[id] ?? c.dados?.nomes.modalidades[id] ?? `Modalidade ${id}`);
  const nomeProc = (id: number | null) => (id === null ? "Sem procedimento" : r.dados?.nomes.procedimentos[id] ?? c.dados?.nomes.procedimentos[id] ?? `Procedimento ${id}`);

  const mods = useMemo(() => {
    if (!r.dados || !c.dados) return [];
    return r.dados.modalidades.map(g => ({ g, nome: nomeMod(g.id), ...tendencia(c.dados!.mensalMod.filter(x => x.modalidade === g.id).map(x => ({ mes: x.mes, valor: x.producao }))) }))
      .sort((a, b) => b.g.producao - a.g.producao);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.dados, c.dados]);

  const contraste = useMemo(() => {
    const l = r.dados?.procedimentos ?? [];
    const com = l.filter(g => comContraste(nomeProc(g.id))), sem = l.filter(g => !comContraste(nomeProc(g.id)));
    const s = (x: Grupo[]) => ({ faturado: x.reduce((a, g) => a + g.faturado, 0), exames: x.reduce((a, g) => a + g.exames, 0), producao: x.reduce((a, g) => a + g.producao, 0) });
    return { com: s(com), sem: s(sem) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.dados]);

  const rankingProc: ItemRanking[] = (r.dados?.procedimentos ?? []).filter(g => g.exames > 0).map(g => {
    const valor = { faturado: g.faturado, volume: g.exames, menorVolume: g.exames, valorMedio: ticket(g), glosa: g.glosa, taxaGlosa: taxaGlosa(g) ?? 0 }[rank];
    return { chave: String(g.id), nome: `${g.id ?? "—"} · ${nomeProc(g.id)}`, valor, negativo: rank === "glosa" || rank === "taxaGlosa", detalhe: `${fmtN(g.exames)} exames · ticket ${formatarReais(ticket(g))}` };
  }).sort((a, b) => (rank === "menorVolume" ? a.valor - b.valor : b.valor - a.valor));
  const fmtRank = rank === "volume" || rank === "menorVolume" ? fmtN : rank === "taxaGlosa" ? (n: number) => fmtP(n) : rank === "valorMedio" ? (n: number) => formatarReais(n) : undefined;

  // Matriz modalidade x convênio (os 8 maiores convênios do período).
  const tabela = useMemo(() => {
    if (!c.dados) return null;
    const porConv = new Map<number | null, number>();
    for (const x of c.dados.convMod) porConv.set(x.convenio, (porConv.get(x.convenio) ?? 0) + x.faturado);
    const convs = [...porConv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    const modsIds = [...new Set(c.dados.convMod.map(x => x.modalidade))];
    const v = (m: number | null, cv: number | null) => c.dados!.convMod.filter(x => x.modalidade === m && x.convenio === cv).reduce((s, x) => s + (matriz === "faturado" ? x.faturado : x.exames), 0);
    const max = Math.max(1, ...modsIds.flatMap(m => convs.map(cv => v(m, cv))));
    return { convs, mods: modsIds, v, max };
  }, [c.dados, matriz]);

  // Evolução mensal dos procedimentos (os 5 maiores por padrão).
  const topProcs = useMemo(() => {
    if (!c.dados) return [];
    const m = new Map<number, number>();
    for (const x of c.dados.mensalProc) if (x.procedimento !== null) m.set(x.procedimento, (m.get(x.procedimento) ?? 0) + x.producao);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }, [c.dados]);
  const escolhidos = procsGrafico.length ? procsGrafico : topProcs.slice(0, 5);
  const serieProcs = useMemo(() => {
    if (!c.dados) return [];
    const meses = [...new Set(c.dados.mensalProc.map(x => x.mes))].sort();
    return meses.map(mes => ({ mes, rotulo: rotuloMes(mes), ...Object.fromEntries(escolhidos.map(p => { const x = c.dados!.mensalProc.find(y => y.mes === mes && y.procedimento === p); return [`p${p}`, x ? x.producao : 0]; })), ...Object.fromEntries(escolhidos.map(p => { const x = c.dados!.mensalProc.find(y => y.mes === mes && y.procedimento === p); return [`t${p}`, x && x.exames ? x.producao / x.exames : 0]; })) }));
  }, [c.dados, escolhidos]);
  const [serieMetrica, setSerieMetrica] = useState<"p" | "t">("p");

  const carregando = r.carregando || c.carregando;
  const total = r.dados?.totais;

  return (
    <main className="p-4 md:p-8">
      <AvisoCarregando ativo={carregando} mensagem="Carregando modalidades e procedimentos…" />
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <CabecalhoFaturamento atual="/faturamento/modalidades" titulo="Modalidades e procedimentos" icone={Layers} descricao="Ressonância, tomografia, ultrassonografia, raio-X, mamografia, densitometria e demais modalidades do Clinux."
          atualizadoEm={r.dados?.atualizadoEm} carregando={carregando} onAtualizar={() => { r.atualizar(); c.atualizar(); }} />
        <BarraFiltros f={f} setF={setF} />
        {(r.erro || c.erro) && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{r.erro || c.erro}</div>}

        {r.dados && c.dados && total && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi titulo="Modalidades com produção" valor={fmtN(mods.filter(m => m.g.exames).length)} icone={Layers} variacao={null} detalhe={`${R(total.producao)} produzido`} destaque={COR.primaria} />
              <Kpi titulo="Exames com contraste" valor={R(contraste.com.faturado)} icone={Droplets} variacao={null} detalhe={`${fmtN(contraste.com.exames)} exames · ${fmtP(pct(contraste.com.producao, total.producao))} da produção (pelo nome do procedimento)`} destaque={COR.secundaria} />
              <Kpi titulo="Exames sem contraste" valor={R(contraste.sem.faturado)} icone={Stethoscope} variacao={null} detalhe={`${fmtN(contraste.sem.exames)} exames faturados ou não`} destaque={COR.texto} />
              <Kpi titulo="Procedimentos realizados" valor={fmtN(r.dados.procedimentos.filter(p => p.exames).length)} icone={BadgeDollarSign} variacao={null} detalhe="os 400 de maior produção" destaque={COR.ok} />
            </div>

            <Painel titulo="Indicadores por modalidade" subtitulo="Crescimento: último mês contra o anterior (produção, 13 meses)." icone={Layers}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500">
                    <th className="rounded-l-xl bg-slate-50 px-3 py-2 text-left">Modalidade</th><th className="bg-slate-50 px-3 py-2">Produzido</th><th className="bg-slate-50 px-3 py-2">Faturado</th>
                    <th className="bg-slate-50 px-3 py-2">Part.</th><th className="bg-slate-50 px-3 py-2">Exames</th><th className="bg-slate-50 px-3 py-2">Ticket</th><th className="bg-slate-50 px-3 py-2">Glosa</th>
                    <th className="bg-slate-50 px-3 py-2">Não faturado</th><th className="bg-slate-50 px-3 py-2">Dias p/ faturar</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Crescimento</th>
                  </tr></thead>
                  <tbody>
                    {mods.map(({ g, nome, crescimento }) => (
                      <tr key={String(g.id)} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-2 font-semibold">{nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{R(g.producao)}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">{R(g.faturado)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmtP(pct(g.faturado, total.faturado))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtN(g.exames)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatarReais(ticket(g))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{g.glosa ? <span className="text-red-600">{fmtP(taxaGlosa(g))}</span> : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-700">{g.pendente ? R(g.pendente) : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{diasMedios(g) === null ? "—" : `${diasMedios(g)!.toLocaleString("pt-BR")} d`}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${crescimento === null ? "text-slate-400" : crescimento >= 0 ? "text-emerald-600" : "text-red-600"}`}>{crescimento === null ? "—" : `${crescimento > 0 ? "+" : ""}${fmtP(crescimento)}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Painel>

            <Secao titulo="Procedimentos" acao={<Alternador valor={rank} onChange={x => setRank(x as RankProc)} opcoes={[["faturado", "Mais faturados"], ["volume", "Maior volume"], ["menorVolume", "Menor volume"], ["valorMedio", "Maior valor médio"], ["glosa", "Maior glosa"], ["taxaGlosa", "Taxa de glosa"]]} />}>
              <Painel titulo="Ranking de procedimentos" icone={Stethoscope}><RankingBarras itens={rankingProc} limite={15} formatar={fmtRank} cor={rank.includes("losa") ? COR.critico : COR.primaria} /></Painel>
            </Secao>

            <Painel titulo="Modalidade × convênio" subtitulo="Os 8 maiores convênios do período." icone={Grid3x3}
              acao={<Alternador valor={matriz} onChange={x => setMatriz(x as typeof matriz)} opcoes={[["faturado", "Faturado"], ["exames", "Exames"]]} />}>
              {tabela ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-xs">
                    <thead><tr className="text-slate-500"><th className="px-2 py-2 text-left">Modalidade</th>{tabela.convs.map(cv => <th key={String(cv)} className="max-w-[110px] truncate px-2 py-2" title={cv === null ? "" : c.dados!.nomes.convenios[cv]}>{cv === null ? "Sem convênio" : c.dados!.nomes.convenios[cv] ?? cv}</th>)}</tr></thead>
                    <tbody>
                      {tabela.mods.map(m => (
                        <tr key={String(m)}>
                          <td className="px-2 py-1 font-semibold text-slate-700">{nomeMod(m)}</td>
                          {tabela.convs.map(cv => { const v = tabela.v(m, cv); return <td key={String(cv)} className="px-1 py-1"><div className="rounded-md px-1.5 py-1.5 text-center font-bold tabular-nums" style={{ background: v ? `rgba(37, 99, 235, ${0.08 + (v / tabela.max) * 0.8})` : "#f8fafc", color: v / tabela.max > 0.5 ? "#fff" : "#0f172a" }}>{v ? (matriz === "exames" ? fmtN(v) : R(v)) : "—"}</div></td>; })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Vazio altura={200} />}
            </Painel>

            <Painel titulo="Evolução mensal dos procedimentos" subtitulo="13 meses. Escolha os procedimentos (até 8) entre os 40 de maior produção." icone={TrendingUp}
              acao={<Alternador valor={serieMetrica} onChange={x => setSerieMetrica(x as "p" | "t")} opcoes={[["p", "Produção"], ["t", "Valor médio"]]} />}>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {topProcs.slice(0, 40).map(p => {
                  const ativo = escolhidos.includes(p);
                  return <button key={p} onClick={() => setProcsGrafico(ativo ? escolhidos.filter(x => x !== p) : [...escolhidos, p].slice(-8))} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${ativo ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>{nomeProc(p)}</button>;
                })}
              </div>
              {serieProcs.length ? (
                <div className="h-[320px]">
                  <ResponsiveContainer>
                    <LineChart data={serieProcs} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
                      <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
                      <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={x => formatarReais(x, true).replace("R$ ", "")} />
                      <Tooltip content={({ active, payload, label }) => active && payload?.length ? <CaixaTooltip titulo={String(label)} linhas={escolhidos.map((p, i) => ({ cor: CORES[i % CORES.length], rotulo: nomeProc(p), valor: formatarReais(Number((payload[0].payload as Record<string, number>)[`${serieMetrica}${p}`]) || 0) }))} /> : null} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {escolhidos.map((p, i) => <Line key={p} name={nomeProc(p)} type="monotone" dataKey={`${serieMetrica}${p}`} stroke={CORES[i % CORES.length]} strokeWidth={2} dot={false} />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <Vazio altura={300} />}
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Participação no faturamento" subtitulo="Modalidades." icone={Layers}><RankingBarras itens={mods.map(m => ({ chave: String(m.g.id), nome: m.nome, valor: m.g.faturado, detalhe: fmtP(pct(m.g.faturado, total.faturado)) }))} limite={10} /></Painel>
              <Painel titulo="Produção não faturada" subtitulo="Por modalidade." icone={ShieldAlert}><RankingBarras itens={mods.map(m => ({ chave: String(m.g.id), nome: m.nome, valor: m.g.pendente, detalhe: `${fmtN(m.g.examesPendentes)} exames` }))} limite={10} cor={COR.atencao} vazio="Nada pendente." /></Painel>
            </div>
            <p className="text-xs text-slate-400">Contraste: identificado pelo nome do procedimento (“contraste”, “c/ contr.”, “gadolínio”). Modalidade × unidade: há uma só unidade cadastrada.</p>
          </div>
        )}
      </div>
    </main>
  );
}
