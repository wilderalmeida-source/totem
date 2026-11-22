"use client";

import { ReactNode } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

export type Servico = "atendimento" | "agendamento" | "entrega";

// Rótulos de cada setor. Códigos do totem: B = Atendimento, D = Agendar exames, C = Entrega de exames.
export const SETOR_INFO: Record<Servico, { nome: string; descricao: string; concluido: string; kpi: string }> = {
  atendimento: { nome: "Atendimento", descricao: "Senha até o paciente ser atendido na recepção", concluido: "Atendido", kpi: "Pacientes atendidos" },
  agendamento: { nome: "Agendamento", descricao: "Senha até o paciente ser atendido para agendar exames", concluido: "Atendido", kpi: "Pacientes agendados" },
  entrega: { nome: "Entrega de resultados", descricao: "Senha até o resultado ser entregue", concluido: "Entregue", kpi: "Pacientes com entrega" },
};

export type EsperaDashboard = {
  periodo: { inicio: string; fim: string; metaMinutos: number };
  periodoAnterior: { inicio: string; fim: string };
  resumo: { total: number; media: number; mediana: number; p90: number; maximo: number; minimo: number; dentroMeta: number; percentualMeta: number; pendentes: number };
  anterior: { media: number; mediana: number; p90: number; total: number; percentualMeta: number };
  variacao: { media: number | null; mediana: number | null; p90: number | null; total: number | null; percentualMeta: number | null };
  porDia: Array<{ data: string; total: number; media: number; mediana: number; p90: number; percentualMeta: number }>;
  porHora: Array<{ hora: string; total: number; media: number; p90: number }>;
  porModalidade: Array<{ modalidade: string; total: number; media: number; mediana: number; p90: number; percentualMeta: number }>;
  distribuicao: Array<{ faixa: string; total: number; acimaMeta: boolean }>;
  porTipo: Array<{ tipo: string; total: number; media: number; mediana: number }>;
  mapaCalor: Array<{ dia: string; indice: number; celulas: Array<{ hora: number; total: number; media: number }> }>;
  maioresEsperas: Array<{ data: string; horaSenha: string; cdPaciente: number | null; paciente: string | null; modalidade: string; preferencial: boolean; minutos: number }>;
  modalidades: Array<{ id: number; nome: string }>;
  // Só na Entrega de resultados: pacientes que abriram o resultado pela internet (web_resultados).
  web?: { pacientes: number; acessos: number; atendimentos: number; variacao: number | null } | null;
  atualizadoEm: string;
};

// Cores: a principal acompanha o tema do sistema; verde/âmbar/vermelho indicam a situação frente à meta.
export const COR = {
  primaria: "var(--system-blue, #2563eb)",
  secundaria: "#8b5cf6",
  ok: "#10b981",
  atencao: "#f59e0b",
  critico: "#ef4444",
  grade: "var(--system-border, #e2e8f0)",
  texto: "var(--system-muted, #64748b)",
};

export function corPorMeta(minutos: number, meta: number) {
  if (minutos <= meta) return COR.ok;
  if (minutos <= meta * 2) return COR.atencao;
  return COR.critico;
}

export function formatarMinutos(valor: number) {
  if (!Number.isFinite(valor)) return "—";
  if (valor < 60) return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} min`;
  const h = Math.floor(valor / 60);
  const m = Math.round(valor % 60);
  return `${h}h${m ? ` ${String(m).padStart(2, "0")}min` : ""}`;
}

export function formatarData(iso: string, curta = false) {
  const [a, m, d] = iso.split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

export const eixo = { fontSize: 12, fill: COR.texto };

// ---------- Estrutura ----------

export function Painel({ titulo, subtitulo, icone: Icone, acao, children, className = "" }: { titulo: string; subtitulo?: string; icone?: LucideIcon; acao?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md md:p-6 ${className}`}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {Icone && <span className="system-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"><Icone size={18} /></span>}
          <div>
            <h2 className="text-base font-bold text-slate-900">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-slate-500">{subtitulo}</p>}
          </div>
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

export function Vazio({ altura = 260 }: { altura?: number }) {
  return <div style={{ height: altura }} className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">Sem dados no período selecionado.</div>;
}

export function CaixaTooltip({ titulo, linhas, rodape }: { titulo: string; linhas: Array<{ cor: string; rotulo: string; valor: string }>; rodape?: string }) {
  return (
    <div className="min-w-44 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-xl backdrop-blur">
      <p className="mb-2 font-bold text-slate-900">{titulo}</p>
      <div className="space-y-1.5">
        {linhas.map(l => (
          <div key={l.rotulo} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-500"><span className="h-2.5 w-2.5 rounded-full" style={{ background: l.cor }} />{l.rotulo}</span>
            <span className="font-semibold tabular-nums text-slate-900">{l.valor}</span>
          </div>
        ))}
      </div>
      {rodape && <p className="mt-2.5 border-t border-slate-100 pt-2 text-xs font-semibold text-blue-600">{rodape}</p>}
    </div>
  );
}

// ---------- KPI ----------

export function Kpi({ titulo, valor, detalhe, icone: Icone, variacao, menorMelhor = true, sufixoVariacao = "%", destaque }: {
  titulo: string; valor: string; detalhe?: string; icone: LucideIcon; variacao: number | null; menorMelhor?: boolean; sufixoVariacao?: string; destaque?: string;
}) {
  const melhorou = variacao === null || variacao === 0 ? null : menorMelhor ? variacao < 0 : variacao > 0;
  const Seta = variacao !== null && variacao > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: destaque ?? COR.primaria }} />
      <div className="flex items-start justify-between">
        <p className="text-sm font-semibold text-slate-500">{titulo}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${destaque ?? COR.primaria} 14%, transparent)`, color: destaque ?? COR.primaria }}><Icone size={18} /></span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900">{valor}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        {variacao !== null ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${melhorou === null ? "bg-slate-100 text-slate-600" : melhorou ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            <Seta size={13} />{variacao > 0 ? "+" : ""}{variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{sufixoVariacao}
          </span>
        ) : <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-500">sem comparação</span>}
        {detalhe && <span className="text-slate-500">{detalhe}</span>}
      </div>
    </div>
  );
}

export function MedidorMeta({ percentual, dentro, total, meta, variacao }: { percentual: number; dentro: number; total: number; meta: number; variacao: number | null }) {
  const cor = percentual >= 80 ? COR.ok : percentual >= 60 ? COR.atencao : COR.critico;
  const dados = [{ v: percentual }, { v: 100 - percentual }];
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: cor }} />
      <p className="text-sm font-semibold text-slate-500">Dentro da meta ({meta} min)</p>
      <div className="mt-1 flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={dados} dataKey="v" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive animationDuration={900}>
                <Cell fill={cor} />
                <Cell fill={COR.grade} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums text-slate-900">{Math.round(percentual)}%</span>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-slate-900">{dentro.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}</p>
          <p className="text-slate-500">pacientes esperaram até {meta} min</p>
          {variacao !== null && (
            <p className={`mt-1 text-xs font-bold ${variacao >= 0 ? "text-emerald-600" : "text-red-600"}`}>{variacao > 0 ? "+" : ""}{variacao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p. vs anterior</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Gráficos ----------

type PontoTendencia = { rotulo: string; media: number; mediana: number; p90: number; total: number };

export function GraficoTendencia({ dados, meta }: { dados: PontoTendencia[]; meta: number }) {
  if (!dados.some(d => d.total > 0)) return <Vazio altura={300} />;
  return (
    <div className="h-[300px]">
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gMedia" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.primaria} stopOpacity={0.35} />
              <stop offset="100%" stopColor={COR.primaria} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gP90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.secundaria} stopOpacity={0.18} />
              <stop offset="100%" stopColor={COR.secundaria} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} unit=" m" width={52} />
          <ReferenceLine y={meta} stroke={COR.critico} strokeDasharray="6 4" label={{ value: `Meta ${meta} min`, position: "insideTopRight", fill: COR.critico, fontSize: 11, fontWeight: 700 }} />
          <Tooltip cursor={{ stroke: COR.texto, strokeDasharray: "4 4" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoTendencia;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.primaria, rotulo: "Média", valor: formatarMinutos(p.media) },
              { cor: COR.ok, rotulo: "Mediana", valor: formatarMinutos(p.mediana) },
              { cor: COR.secundaria, rotulo: "9 em 10 até", valor: formatarMinutos(p.p90) },
              { cor: COR.texto, rotulo: "Pacientes", valor: p.total.toLocaleString("pt-BR") },
            ]} />;
          }} />
          <Area type="monotone" dataKey="p90" stroke={COR.secundaria} strokeWidth={1.5} strokeDasharray="4 3" fill="url(#gP90)" animationDuration={900} />
          <Area type="monotone" dataKey="media" stroke={COR.primaria} strokeWidth={3} fill="url(#gMedia)" activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff" }} animationDuration={900} />
          <Line type="monotone" dataKey="mediana" stroke={COR.ok} strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoPorHora({ dados, meta }: { dados: EsperaDashboard["porHora"]; meta: number }) {
  if (!dados.some(d => d.total > 0)) return <Vazio />;
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COR.primaria} stopOpacity={0.55} />
              <stop offset="100%" stopColor={COR.primaria} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="hora" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis yAxisId="vol" tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="min" orientation="right" tick={eixo} tickLine={false} axisLine={false} unit=" m" width={52} />
          <Tooltip cursor={{ fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as EsperaDashboard["porHora"][number];
            return <CaixaTooltip titulo={`Das ${p.hora} às ${String(Number(p.hora.slice(0, 2)) + 1).padStart(2, "0")}h`} linhas={[
              { cor: COR.primaria, rotulo: "Pacientes", valor: p.total.toLocaleString("pt-BR") },
              { cor: corPorMeta(p.media, meta), rotulo: "Espera média", valor: formatarMinutos(p.media) },
            ]} />;
          }} />
          <Bar yAxisId="vol" dataKey="total" fill="url(#gVolume)" radius={[8, 8, 0, 0]} maxBarSize={36} animationDuration={800} />
          <Line yAxisId="min" type="monotone" dataKey="media" stroke={COR.atencao} strokeWidth={3} dot={{ r: 3, fill: COR.atencao }} activeDot={{ r: 6, strokeWidth: 3, stroke: "#fff" }} animationDuration={1000} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoDistribuicao({ dados, total }: { dados: EsperaDashboard["distribuicao"]; total: number }) {
  if (!total) return <Vazio />;
  const comPct = dados.map(d => ({ ...d, pct: (d.total / total) * 100 }));
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <BarChart data={comPct} margin={{ top: 22, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="faixa" tick={{ ...eixo, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip cursor={{ fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof comPct)[number];
            return <CaixaTooltip titulo={`Espera de ${p.faixa}`} linhas={[
              { cor: p.acimaMeta ? COR.critico : COR.ok, rotulo: "Pacientes", valor: p.total.toLocaleString("pt-BR") },
              { cor: COR.texto, rotulo: "Do total", valor: `${p.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` },
            ]} />;
          }} />
          <Bar dataKey="total" radius={[8, 8, 0, 0]} animationDuration={800} label={{ position: "top", fill: COR.texto, fontSize: 11, formatter: (v: number) => (v ? v : "") }}>
            {comPct.map((d, i) => <Cell key={d.faixa} fill={d.acimaMeta ? (i >= comPct.length - 2 ? COR.critico : COR.atencao) : COR.ok} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoModalidades({ dados, meta }: { dados: EsperaDashboard["porModalidade"]; meta: number }) {
  if (!dados.length) return <Vazio />;
  const altura = Math.max(220, dados.length * 44);
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} horizontal={false} />
          <XAxis type="number" tick={eixo} tickLine={false} axisLine={false} unit=" m" />
          <YAxis type="category" dataKey="modalidade" tick={{ ...eixo, fontWeight: 600 }} tickLine={false} axisLine={false} width={130} />
          <ReferenceLine x={meta} stroke={COR.critico} strokeDasharray="6 4" />
          <Tooltip cursor={{ fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as EsperaDashboard["porModalidade"][number];
            return <CaixaTooltip titulo={p.modalidade} linhas={[
              { cor: corPorMeta(p.media, meta), rotulo: "Média", valor: formatarMinutos(p.media) },
              { cor: COR.ok, rotulo: "Mediana", valor: formatarMinutos(p.mediana) },
              { cor: COR.secundaria, rotulo: "9 em 10 até", valor: formatarMinutos(p.p90) },
              { cor: COR.texto, rotulo: "Pacientes", valor: p.total.toLocaleString("pt-BR") },
              { cor: COR.texto, rotulo: "Dentro da meta", valor: `${p.percentualMeta.toLocaleString("pt-BR")}%` },
            ]} />;
          }} />
          <Bar dataKey="media" radius={[0, 8, 8, 0]} barSize={22} animationDuration={800} label={{ position: "right", fill: COR.texto, fontSize: 12, fontWeight: 700, formatter: (v: number) => formatarMinutos(v) }}>
            {dados.map(d => <Cell key={d.modalidade} fill={corPorMeta(d.media, meta)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoTipo({ dados, meta }: { dados: EsperaDashboard["porTipo"]; meta: number }) {
  const total = dados.reduce((a, d) => a + d.total, 0);
  if (!total) return <Vazio altura={220} />;
  const cores = [COR.primaria, COR.secundaria];
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={dados} dataKey="total" nameKey="tipo" innerRadius={62} outerRadius={92} paddingAngle={3} cornerRadius={6} stroke="none" animationDuration={900}>
              {dados.map((d, i) => <Cell key={d.tipo} fill={cores[i]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as EsperaDashboard["porTipo"][number];
              return <CaixaTooltip titulo={p.tipo} linhas={[
                { cor: COR.texto, rotulo: "Pacientes", valor: p.total.toLocaleString("pt-BR") },
                { cor: corPorMeta(p.media, meta), rotulo: "Média", valor: formatarMinutos(p.media) },
              ]} />;
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums text-slate-900">{total.toLocaleString("pt-BR")}</span>
          <span className="text-xs text-slate-500">pacientes</span>
        </div>
      </div>
      <div className="w-full space-y-3">
        {dados.map((d, i) => (
          <div key={d.tipo} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-3 w-3 rounded-full" style={{ background: cores[i] }} />{d.tipo}</span>
              <span className="text-xs font-semibold text-slate-500">{total ? Math.round((d.total / total) * 100) : 0}%</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Média <b style={{ color: corPorMeta(d.media, meta) }}>{formatarMinutos(d.media)}</b> · {d.total.toLocaleString("pt-BR")} pacientes</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export type CelulaCalor = { diaIndice: number; dia: string; hora: number; total: number; media: number };

// Verde até metade da meta, passando por âmbar na meta, até vermelho em 2x a meta.
export function corCalor(media: number, meta: number) {
  const t = Math.min(1, Math.max(0, (media / meta - 0.5) / 1.5));
  return `hsl(${Math.round(150 - t * 150)} 75% ${50 - t * 4}%)`;
}

export function MapaCalor({ dados, meta, onSelecionar }: { dados: EsperaDashboard["mapaCalor"]; meta: number; onSelecionar?: (celula: CelulaCalor) => void }) {
  if (!dados.length) return <Vazio altura={220} />;
  const horas = dados[0].celulas.map(c => c.hora);
  const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-full gap-1.5" style={{ gridTemplateColumns: `44px repeat(${horas.length}, minmax(38px, 1fr))` }}>
        <span />
        {horas.map(h => <span key={h} className="pb-1 text-center text-[11px] font-semibold text-slate-500">{hh(h)}</span>)}
        {dados.map(linha => (
          <div key={linha.dia} className="contents">
            <span className="flex items-center text-xs font-bold text-slate-600">{linha.dia}</span>
            {linha.celulas.map(c => c.total ? (
              <button
                key={c.hora}
                type="button"
                onClick={() => onSelecionar?.({ diaIndice: linha.indice, dia: linha.dia, hora: c.hora, total: c.total, media: c.media })}
                title={`${linha.dia} ${hh(c.hora)} · média ${formatarMinutos(c.media)} · ${c.total} pacientes — clique para ver os pacientes`}
                aria-label={`${linha.dia} às ${hh(c.hora)}: média ${formatarMinutos(c.media)}, ${c.total} pacientes. Ver detalhes.`}
                className="flex h-10 cursor-pointer items-center justify-center rounded-lg text-[11px] font-bold text-white outline-none ring-offset-2 transition hover:z-10 hover:scale-110 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ background: corCalor(c.media, meta) }}
              >
                {Math.round(c.media)}
              </button>
            ) : (
              <div key={c.hora} title={`${linha.dia} ${hh(c.hora)} · sem pacientes`} className="h-10 rounded-lg" style={{ background: "var(--system-raised, #f1f5f9)" }} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Clique em um quadrado para ver os pacientes daquele dia e horário.</span>
        <span className="flex items-center gap-2">
          <span>Menor espera</span>
          <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${corCalor(0, meta)}, ${corCalor(meta, meta)}, ${corCalor(meta * 2, meta)})` }} />
          <span>Maior espera</span>
        </span>
      </div>
    </div>
  );
}
