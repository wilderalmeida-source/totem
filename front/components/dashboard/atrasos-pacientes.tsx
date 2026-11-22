"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlarmClock, AlertTriangle, BadgeCheck, CalendarRange, Clock3, Download, Info, Layers, MousePointerClick, RefreshCw,
  Search, Stethoscope, Timer, UserRoundCheck, Users, X,
} from "lucide-react";
import { COR, CaixaTooltip, Kpi, Painel, Vazio, eixo, formatarData, formatarMinutos } from "./wait-charts";
import { diasDoPeriodo } from "@/lib/desempenho";
import {
  FAIXAS, ROTULO_DIM_ATRASO, agruparAtrasos, atrasado, estatAtraso, faixa, filtrarAtrasos,
  type DimAtraso, type GrupoAtraso, type LinhaAtraso, type SelecaoAtraso,
} from "@/lib/atrasos";
import { AvisoCarregando } from "@/components/dashboard/carregando";

type Resposta = { periodo: { inicio: string; fim: string }; toleranciaPadrao: number; semEntrada: number; inconsistentes: number; linhas: LinhaAtraso[]; atualizadoEm: string };
type Metrica = "percentual" | "atrasados" | "mediaAtraso";

const MINIMO = 5;
const fmtN = (n: number) => n.toLocaleString("pt-BR");
const fmtP = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const cursor = { fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" };
const opacidade = (chave: string, sel?: string) => (!sel || sel === chave ? 1 : 0.28);
const corPercentual = (p: number) => (p >= 30 ? COR.critico : p >= 15 ? COR.atencao : COR.ok);
const minutosTexto = (m: number) => (Math.abs(m) >= 60 ? formatarMinutos(Math.abs(m)) : `${Math.round(Math.abs(m))} min`);

export function AtrasosPacientes({ inicio, fim, recarregar }: { inicio: string; fim: string; recarregar: number }) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tolerancia, setTolerancia] = useState<number | null>(null);
  const [sel, setSel] = useState<SelecaoAtraso>({});
  const [metricaMedico, setMetricaMedico] = useState<Metrica>("percentual");
  const [metricaConvenio, setMetricaConvenio] = useState<Metrica>("percentual");
  const [verLista, setVerLista] = useState(false);
  const fecharLista = useCallback(() => setVerLista(false), []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/dashboard/atrasos-pacientes?${new URLSearchParams({ inicio, fim })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      setDados(json);
      setTolerancia(t => t ?? json.toleranciaPadrao ?? 0);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim]);

  useEffect(() => { void carregar(); }, [carregar, recarregar]);
  useEffect(() => { setSel({}); setVerLista(false); }, [inicio, fim]);

  const tol = tolerancia ?? 0;
  const alternar = useCallback((d: DimAtraso) => (chave: string) => setSel(s => ({ ...s, [d]: s[d] === chave ? undefined : chave })), []);
  const linhas = useMemo(() => dados?.linhas ?? [], [dados]);
  const filtradas = useMemo(() => filtrarAtrasos(linhas, sel, tol), [linhas, sel, tol]);
  const r = useMemo(() => estatAtraso(filtradas, tol), [filtradas, tol]);
  const grupos = useCallback((d: DimAtraso) => agruparAtrasos(filtrarAtrasos(linhas, sel, tol, d), d, tol), [linhas, sel, tol]);
  const porModalidade = useMemo(() => grupos("modalidade"), [grupos]);
  const porMedico = useMemo(() => grupos("medico"), [grupos]);
  const porConvenio = useMemo(() => grupos("convenio"), [grupos]);
  const porHora = useMemo(() => grupos("hora").sort((a, b) => a.chave.localeCompare(b.chave)), [grupos]);
  const porFaixa = useMemo(() => {
    const mapa = new Map(grupos("faixa").map(g => [g.chave, g.total]));
    return FAIXAS.map(f => ({ chave: f.id, nome: f.nome, cor: f.cor, total: mapa.get(f.id) ?? 0 }));
  }, [grupos]);
  const porDia = useMemo(() => {
    const mapa = new Map(grupos("data").map(g => [g.chave, g]));
    return diasDoPeriodo(inicio, fim).map(dia => {
      const g = mapa.get(dia);
      return { chave: dia, rotulo: formatarData(dia, true), total: g?.total ?? 0, atrasados: g?.atrasados ?? 0, percentual: g?.percentual ?? 0 };
    });
  }, [grupos, inicio, fim]);

  const chips = (Object.entries(sel) as Array<[DimAtraso, string | undefined]>).filter(([, v]) => v !== undefined).map(([d, v]) => {
    const g = agruparAtrasos(linhas, d, tol).find(x => x.chave === v);
    return { d, v: v!, nome: g?.nome ?? v! };
  });

  const pior = (gs: GrupoAtraso[]) => gs.filter(g => g.total >= MINIMO && g.atrasados > 0).sort((a, b) => b.percentual - a.percentual)[0];
  const piorModalidade = pior(porModalidade);
  const piorMedico = pior(porMedico);
  const piorConvenio = pior(porConvenio);
  const totemFonte = filtradas.filter(l => l.fonte === "totem").length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <p className="flex items-start gap-2 text-sm text-slate-600">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
          <span>
            <b>Chegada prevista</b> = horário do exame − antecedência da sala (a mesma do totem). Comparada com a <b>H. Entrada</b> do paciente (sem ela, a hora da senha no totem).
            Um registro por paciente por dia, pelo primeiro exame.
            {dados && dados.semEntrada > 0 && <> {fmtN(dados.semEntrada)} pacientes sem hora de entrada ficaram de fora.</>}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm" title="Minutos depois da chegada prevista que ainda contam como no horário (padrão: configuração de atrasos do totem).">
            <Timer size={16} className="text-slate-400" />Tolerância
            <input type="number" min={0} max={120} value={tol} onChange={e => setTolerancia(Math.min(120, Math.max(0, Number(e.target.value) || 0)))} className="w-10 bg-transparent text-right font-bold outline-none" />
            min
          </label>
          <button onClick={() => void carregar()} disabled={carregando} aria-label="Atualizar" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />
          </button>
        </div>
      </section>

      <div className="flex min-h-10 flex-wrap items-center gap-2">
        {chips.length ? (
          <>
            <span className="text-sm font-semibold text-slate-500">Filtrando por:</span>
            {chips.map(c => (
              <button key={c.d} onClick={() => alternar(c.d)(c.v)} className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-1.5 pl-3 pr-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                <span className="text-blue-500">{ROTULO_DIM_ATRASO[c.d]}:</span>{c.nome}<X size={14} />
              </button>
            ))}
            <button onClick={() => setSel({})} className="text-sm font-bold text-slate-500 hover:text-slate-900 hover:underline">Limpar tudo</button>
          </>
        ) : (
          <span className="flex items-center gap-2 text-sm text-slate-400"><MousePointerClick size={16} />Dica: clique em uma modalidade, médico, convênio, faixa, dia ou horário para filtrar.</span>
        )}
      </div>

      {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

      <AvisoCarregando ativo={carregando} />
      {!dados && carregando ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
      ) : dados && (
        <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo="Pacientes analisados" valor={fmtN(r.total)} icone={Users} variacao={null} detalhe={totemFonte ? `${fmtN(totemFonte)} com entrada pela senha do totem` : "entrada pela H. Entrada do Clinux"} destaque={COR.texto} />
            <Kpi titulo="Chegaram atrasados" valor={fmtP(r.percentual)} icone={AlarmClock} variacao={null} detalhe={`${fmtN(r.atrasados)} pacientes depois da chegada prevista + ${tol} min`} destaque={corPercentual(r.percentual)} />
            <Kpi titulo="Atraso médio" valor={minutosTexto(r.mediaAtraso)} icone={Clock3} variacao={null} detalhe={`entre os atrasados · ${formatarMinutos(r.minutosAtraso)} no total`} destaque={COR.atencao} />
            <Kpi titulo="Chegaram depois do exame" valor={fmtN(r.aposExame)} icone={AlertTriangle} variacao={null} detalhe={`${fmtP(r.percentualAposExame)} entraram após o horário do próprio exame`} destaque={COR.critico} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Destaque icone={Layers} rotulo="Modalidade com mais atrasos" grupo={piorModalidade} cor={COR.secundaria} onClick={piorModalidade ? () => alternar("modalidade")(piorModalidade.chave) : undefined} />
            <Destaque icone={Stethoscope} rotulo="Médico com mais atrasos" grupo={piorMedico} cor={COR.critico} onClick={piorMedico ? () => alternar("medico")(piorMedico.chave) : undefined} />
            <Destaque icone={BadgeCheck} rotulo="Convênio com mais atrasos" grupo={piorConvenio} cor={COR.atencao} onClick={piorConvenio ? () => alternar("convenio")(piorConvenio.chave) : undefined} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Painel titulo="Como os pacientes chegam" subtitulo="Entrada em relação à chegada prevista. Clique em uma faixa para filtrar." icone={UserRoundCheck}>
              <GraficoFaixas dados={porFaixa} selecionado={sel.faixa} onSelecionar={alternar("faixa")} />
            </Painel>
            <Painel titulo="Atrasos por dia" subtitulo="Barras: pacientes atrasados · Linha: % de atrasados. Clique para filtrar o dia." icone={CalendarRange}>
              <GraficoDias dados={porDia} selecionado={sel.data} onSelecionar={alternar("data")} />
            </Painel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Painel titulo="Modalidades" subtitulo="% de pacientes que chegaram atrasados por modalidade" icone={Layers}>
              <Ranking grupos={porModalidade} metrica="percentual" selecionado={sel.modalidade} onSelecionar={alternar("modalidade")} limite={8} />
            </Painel>
            <Painel titulo="Horário do exame" subtitulo="% de atrasados conforme o horário marcado. Clique para filtrar." icone={Clock3}>
              <GraficoHora grupos={porHora} selecionado={sel.hora} onSelecionar={alternar("hora")} />
            </Painel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Painel titulo="Médicos" subtitulo="De quais médicos os pacientes mais chegam atrasados" icone={Stethoscope}
              acao={<Alternador valor={metricaMedico} onChange={v => setMetricaMedico(v as Metrica)} />}>
              <Ranking grupos={porMedico} metrica={metricaMedico} selecionado={sel.medico} onSelecionar={alternar("medico")} limite={12} />
            </Painel>
            <Painel titulo="Convênios" subtitulo="Em quais convênios os pacientes mais chegam atrasados" icone={BadgeCheck}
              acao={<Alternador valor={metricaConvenio} onChange={v => setMetricaConvenio(v as Metrica)} />}>
              <Ranking grupos={porConvenio} metrica={metricaConvenio} selecionado={sel.convenio} onSelecionar={alternar("convenio")} />
            </Painel>
          </div>

          <Painel titulo="Pacientes atrasados" subtitulo={`${fmtN(r.atrasados)} pacientes com os filtros atuais, do maior atraso para o menor`} icone={AlarmClock}>
            <ListaPacientes linhas={filtradas.filter(l => atrasado(l, tol))} tolerancia={tol} />
          </Painel>
        </div>
      )}

      {chips.length > 0 && dados && !verLista && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            <span className="min-w-0 truncate text-sm text-slate-600"><b className="text-slate-900">{chips.map(c => c.nome).join(" · ")}</b> · {fmtN(filtradas.length)} pacientes · {fmtN(r.atrasados)} atrasados</span>
            <button onClick={() => setVerLista(true)} disabled={!filtradas.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50"><Users size={16} />Ver pacientes</button>
            <button onClick={() => setSel({})} aria-label="Limpar filtros" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
      )}
      {verLista && <ModalPacientes titulo={chips.map(c => c.nome).join(" · ") || "Todos os pacientes"} linhas={filtradas} tolerancia={tol} onFechar={fecharLista} />}
    </div>
  );
}

function Alternador({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  const opcoes: Array<[Metrica, string]> = [["percentual", "% atrasados"], ["atrasados", "Qtd."], ["mediaAtraso", "Atraso médio"]];
  return (
    <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
      {opcoes.map(([id, rotulo]) => (
        <button key={id} onClick={() => onChange(id)} className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${valor === id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"}`}>{rotulo}</button>
      ))}
    </div>
  );
}

function Destaque({ icone: Icone, rotulo, grupo, cor, onClick }: { icone: typeof Timer; rotulo: string; grupo?: GrupoAtraso; cor: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}><Icone size={22} /></span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{rotulo}</span>
        <span className="block truncate text-lg font-extrabold text-slate-900">{grupo?.nome ?? "—"}</span>
        <span className="block text-xs text-slate-500">{grupo ? `${fmtP(grupo.percentual)} · ${fmtN(grupo.atrasados)} de ${fmtN(grupo.total)} pacientes` : `nenhum com ${MINIMO}+ pacientes e atrasos`}</span>
      </span>
    </button>
  );
}

function linhasTooltip(g: GrupoAtraso) {
  return [
    { cor: corPercentual(g.percentual), rotulo: "Chegaram atrasados", valor: `${fmtN(g.atrasados)} de ${fmtN(g.total)} (${fmtP(g.percentual)})` },
    { cor: COR.atencao, rotulo: "Atraso médio", valor: minutosTexto(g.mediaAtraso) },
    { cor: COR.critico, rotulo: "Depois do horário do exame", valor: fmtN(g.aposExame) },
  ];
}

function Ranking({ grupos, metrica, selecionado, onSelecionar, limite = 10 }: { grupos: GrupoAtraso[]; metrica: Metrica; selecionado?: string; onSelecionar: (c: string) => void; limite?: number }) {
  const [todos, setTodos] = useState(false);
  const poucos = (g: GrupoAtraso) => g.total < MINIMO;
  const ordenados = [...grupos].filter(g => metrica === "percentual" || g.atrasados > 0)
    .sort((a, b) => Number(poucos(a)) - Number(poucos(b)) || b[metrica] - a[metrica] || b.total - a.total);
  if (!ordenados.some(g => g.atrasados > 0)) return <Vazio altura={220} />;
  const visiveis = todos ? ordenados : ordenados.slice(0, limite);
  const valor = (g: GrupoAtraso) => (metrica === "percentual" ? fmtP(g.percentual) : metrica === "atrasados" ? fmtN(g.atrasados) : minutosTexto(g.mediaAtraso));
  const qtdPoucos = ordenados.filter(poucos).length;
  return (
    <div>
      <div style={{ height: Math.max(200, visiveis.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={visiveis} layout="vertical" margin={{ top: 0, right: 120, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} horizontal={false} />
            <XAxis type="number" tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="nome" tick={{ ...eixo, fontWeight: 600 }} tickLine={false} axisLine={false} width={160} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
            <Tooltip cursor={cursor} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const g = payload[0].payload as GrupoAtraso;
              return <CaixaTooltip titulo={g.nome} linhas={linhasTooltip(g)} rodape="Clique para filtrar e ver os pacientes" />;
            }} />
            <Bar dataKey={metrica} radius={[0, 8, 8, 0]} barSize={22} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(visiveis[i].chave)}>
              {visiveis.map(g => <Cell key={g.chave} fill={poucos(g) ? "#94a3b8" : corPercentual(g.percentual)} fillOpacity={opacidade(g.chave, selecionado)} />)}
              <LabelList dataKey={metrica} position="right" content={(p) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = p as { x?: number; y?: number; width?: number; height?: number; index?: number };
                const g = visiveis[index];
                return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="middle" fontSize={12} fontWeight={700} fill={COR.texto}>
                  {valor(g)} <tspan fontWeight={400}>· {fmtN(g.atrasados)}/{fmtN(g.total)}{poucos(g) ? " · poucos dados" : ""}</tspan>
                </text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Ao lado: atrasados/pacientes{qtdPoucos ? ` · em cinza: menos de ${MINIMO} pacientes (${qtdPoucos})` : ""}</span>
        {ordenados.length > limite && <button onClick={() => setTodos(v => !v)} className="shrink-0 font-bold text-blue-600 hover:underline">{todos ? "Ver menos" : `Ver todos (${ordenados.length})`}</button>}
      </div>
    </div>
  );
}

function GraficoFaixas({ dados, selecionado, onSelecionar }: { dados: Array<{ chave: string; nome: string; cor: string; total: number }>; selecionado?: string; onSelecionar: (c: string) => void }) {
  const total = dados.reduce((s, d) => s + d.total, 0);
  if (!total) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="nome" tick={{ ...eixo, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => v.replace(" atrasado", "").replace("Dentro da ", "")} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as { nome: string; cor: string; total: number };
            return <CaixaTooltip titulo={d.nome} linhas={[{ cor: d.cor, rotulo: "Pacientes", valor: `${fmtN(d.total)} (${fmtP((d.total / total) * 100)})` }]} rodape="Clique para filtrar" />;
          }} />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={56} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={d.cor} fillOpacity={opacidade(d.chave, selecionado)} />)}
            <LabelList dataKey="total" position="top" fontSize={11} fontWeight={700} fill={COR.texto} formatter={(v: number) => (v ? `${Math.round((v / total) * 100)}%` : "")} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficoDias({ dados, selecionado, onSelecionar }: { dados: Array<{ chave: string; rotulo: string; total: number; atrasados: number; percentual: number }>; selecionado?: string; onSelecionar: (c: string) => void }) {
  if (!dados.some(d => d.total)) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis yAxisId="qtd" tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="pct" orientation="right" tick={eixo} tickLine={false} axisLine={false} unit="%" width={48} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { rotulo: string; total: number; atrasados: number; percentual: number };
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.critico, rotulo: "Chegaram atrasados", valor: `${fmtN(p.atrasados)} (${fmtP(p.percentual)})` },
              { cor: COR.texto, rotulo: "Pacientes", valor: fmtN(p.total) },
            ]} rodape="Clique para filtrar o dia" />;
          }} />
          <Bar yAxisId="qtd" dataKey="atrasados" radius={[6, 6, 0, 0]} maxBarSize={30} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={COR.critico} fillOpacity={0.75 * opacidade(d.chave, selecionado)} />)}
          </Bar>
          <Line yAxisId="pct" type="monotone" dataKey="percentual" stroke={COR.primaria} strokeWidth={3} dot={{ r: 3, fill: COR.primaria }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function GraficoHora({ grupos, selecionado, onSelecionar }: { grupos: GrupoAtraso[]; selecionado?: string; onSelecionar: (c: string) => void }) {
  if (!grupos.length) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <BarChart data={grupos} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="nome" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} unit="%" width={48} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const g = payload[0].payload as GrupoAtraso;
            return <CaixaTooltip titulo={`Exames das ${g.nome}`} linhas={linhasTooltip(g)} rodape="Clique para filtrar o horário" />;
          }} />
          <Bar dataKey="percentual" radius={[8, 8, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(grupos[i].chave)}>
            {grupos.map(g => <Cell key={g.chave} fill={corPercentual(g.percentual)} fillOpacity={opacidade(g.chave, selecionado)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ModalPacientes({ titulo, linhas, tolerancia, onFechar }: { titulo: string; linhas: LinhaAtraso[]; tolerancia: number; onFechar: () => void }) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", fechar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = overflow; };
  }, [onFechar]);
  const r = estatAtraso(linhas, tolerancia);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="atrasos-modal-titulo" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Atraso dos pacientes</p>
            <h2 id="atrasos-modal-titulo" className="truncate text-2xl font-extrabold text-slate-900">{titulo}</h2>
            <p className="text-sm text-slate-500">{fmtN(r.total)} pacientes · <b className="text-red-600">{fmtN(r.atrasados)} atrasados ({fmtP(r.percentual)})</b> · atraso médio {minutosTexto(r.mediaAtraso)}</p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5 md:p-6"><ListaPacientes linhas={linhas} tolerancia={tolerancia} /></div>
      </div>
    </div>
  );
}

function ListaPacientes({ linhas, tolerancia }: { linhas: LinhaAtraso[]; tolerancia: number }) {
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(50);
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo ? linhas.filter(l => [l.cdAtendimento, l.paciente, l.cdPaciente, l.medico, l.convenio, l.modalidade].join(" ").toLowerCase().includes(termo)) : linhas;
    return [...base].sort((a, b) => b.atraso - a.atraso);
  }, [linhas, busca]);

  function exportarCsv() {
    const cab = ["Nº atendimento", "Paciente", "ID paciente", "Data", "Horário do exame", "Antecedência da sala (min)", "Chegada prevista", "Entrada", "Origem da entrada", "Atraso (min)", "Atraso em relação ao exame (min)", "Modalidade", "Médico", "Convênio"];
    const corpo = lista.map(l => [l.cdAtendimento, l.paciente ?? "", l.cdPaciente, formatarData(l.data), l.horaExame, l.antecedencia, l.horaChegada, l.horaEntrada, l.fonte === "totem" ? "Senha do totem" : "H. Entrada", l.atraso, l.atrasoExame, l.modalidade, l.medico ?? "", l.convenio ?? ""]);
    const csv = [cab, ...corpo].map(linha => linha.map(v => `"${(typeof v === "number" && !Number.isInteger(v) ? String(v).replace(".", ",") : String(v)).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "atraso-dos-pacientes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nº atendimento, paciente, médico, convênio…" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <button onClick={exportarCsv} disabled={!lista.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={15} />Exportar CSV</button>
      </div>
      {lista.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Nº atend.</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Exame · chegada prevista · entrada</th><th className="px-3 py-2">Médico</th><th className="px-3 py-2">Convênio</th>
                <th className="px-3 py-2 text-right">Chegada</th>
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, limite).map(l => {
                const f = faixa(l, tolerancia);
                return (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <button type="button" title="Copiar nº do atendimento" onClick={() => void navigator.clipboard?.writeText(String(l.cdAtendimento))}
                        className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 transition hover:bg-blue-100 hover:text-blue-700">{l.cdAtendimento}</button>
                    </td>
                    <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{l.paciente ?? "Sem nome"}</span><span className="block text-xs text-slate-400">ID {l.cdPaciente} · {l.modalidade}</span></td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatarData(l.data)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">
                      {l.horaExame} · {l.horaChegada}{l.antecedencia > 0 && <span className="text-xs text-slate-400"> (−{l.antecedencia} min)</span>} · <b className="text-slate-900">{l.horaEntrada}</b>
                      {l.fonte === "totem" && <span className="ml-1 text-xs text-slate-400">(senha)</span>}
                    </td>
                    <td className="px-3 py-2.5">{l.medico ?? "—"}</td>
                    <td className="px-3 py-2.5">{l.convenio ?? "Sem convênio"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums text-white" style={{ background: f.cor }}>
                        {l.atraso > 0 ? `+${minutosTexto(l.atraso)}` : l.atraso < 0 ? `${minutosTexto(l.atraso)} antes` : "no horário"}
                      </span>
                      {l.atrasoExame > 0 && <span className="block text-xs font-semibold text-red-600">após o exame</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length > limite && <button onClick={() => setLimite(n => n + 100)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Mostrar mais ({fmtN(lista.length - limite)} restantes)</button>}
        </div>
      ) : <p className="py-8 text-center text-sm text-slate-400">Nenhum paciente com os filtros atuais.</p>}
    </div>
  );
}
