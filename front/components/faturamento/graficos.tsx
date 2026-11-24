"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { formatarReais } from "@/lib/diretoria";
import { DIAS_SEMANA, TURNOS, type RespostaResumo } from "@/lib/faturamento";

const eixoReais = (v: number) => formatarReais(v, true).replace("R$ ", "");
const fmtN = (n: number) => Math.round(n).toLocaleString("pt-BR");

type Ponto = { rotulo: string; producao: number; faturavel: number; faturado: number; pendente: number; glosa: number; exames: number; ticket?: number };

// Produção x faturamento: barras de produção e faturado, linha de pendente (e glosa).
export function GraficoProducaoFaturado({ dados, altura = 320 }: { dados: Ponto[]; altura?: number }) {
  if (!dados.some(d => d.producao || d.faturado)) return <Vazio altura={altura - 20} />;
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={10} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Ponto;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: "#94a3b8", rotulo: "Produção", valor: `${formatarReais(p.producao)} · ${fmtN(p.exames)} exames` },
              { cor: COR.primaria, rotulo: "Faturável (convênio)", valor: formatarReais(p.faturavel) },
              { cor: COR.ok, rotulo: "Faturado", valor: formatarReais(p.faturado) },
              { cor: COR.atencao, rotulo: "Pendente", valor: formatarReais(p.pendente) },
              { cor: COR.critico, rotulo: "Glosa", valor: formatarReais(p.glosa) },
            ]} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar name="Produção" dataKey="producao" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={600} />
          <Bar name="Faturado" dataKey="faturado" fill={COR.ok} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={600} />
          <Line name="Pendente" type="monotone" dataKey="pendente" stroke={COR.atencao} strokeWidth={2.5} dot={false} />
          <Line name="Glosa" type="monotone" dataKey="glosa" stroke={COR.critico} strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Quantidade de exames (barras) x valor produzido e ticket médio (linhas).
export function GraficoExamesValor({ dados, altura = 320 }: { dados: Ponto[]; altura?: number }) {
  if (!dados.some(d => d.exames)) return <Vazio altura={altura - 20} />;
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={10} />
          <YAxis yAxisId="q" tick={eixo} tickLine={false} axisLine={false} width={48} allowDecimals={false} />
          <YAxis yAxisId="v" orientation="right" tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Ponto;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.primaria, rotulo: "Exames", valor: fmtN(p.exames) },
              { cor: COR.ok, rotulo: "Valor produzido", valor: formatarReais(p.producao) },
              { cor: COR.secundaria, rotulo: "Ticket médio", valor: formatarReais(p.ticket ?? 0) },
            ]} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="q" name="Exames" dataKey="exames" fill={COR.primaria} fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line yAxisId="v" name="Valor produzido" type="monotone" dataKey="producao" stroke={COR.ok} strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Distribuição por dia da semana x turno (tabela com intensidade).
export function MapaSemanaTurno({ dados, metrica }: { dados: RespostaResumo["semana"]; metrica: "exames" | "producao" }) {
  const valor = (dow: number, turno: string) => dados.filter(d => d.dow === dow && d.turno === turno).reduce((s, d) => s + d[metrica], 0);
  const max = Math.max(1, ...dados.map(d => d[metrica]));
  const ordem = [1, 2, 3, 4, 5, 6, 0];
  if (!dados.length) return <Vazio altura={200} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead><tr className="text-xs uppercase tracking-wider text-slate-500"><th className="px-2 py-2 text-left">Turno</th>{ordem.map(d => <th key={d} className="px-2 py-2">{DIAS_SEMANA[d]}</th>)}<th className="px-2 py-2">Total</th></tr></thead>
        <tbody>
          {TURNOS.map(([id, nome]) => (
            <tr key={id}>
              <td className="px-2 py-1.5 font-semibold text-slate-600">{nome}</td>
              {ordem.map(d => {
                const v = valor(d, id);
                return <td key={d} className="px-1 py-1"><div className="rounded-lg px-2 py-2 text-center text-xs font-bold tabular-nums" style={{ background: v ? `rgba(37, 99, 235, ${0.08 + (v / max) * 0.8})` : "#f8fafc", color: v / max > 0.5 ? "#fff" : "#0f172a" }}>{v ? (metrica === "exames" ? fmtN(v) : formatarReais(v, true)) : "—"}</div></td>;
              })}
              <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums">{metrica === "exames" ? fmtN(ordem.reduce((s, d) => s + valor(d, id), 0)) : formatarReais(ordem.reduce((s, d) => s + valor(d, id), 0), true)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
