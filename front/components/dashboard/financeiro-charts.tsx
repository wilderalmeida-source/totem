"use client";

import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { formatarReais } from "@/lib/diretoria";
import { FAIXAS_A_VENCER, FAIXAS_VENCIDAS, ROTULO_FAIXA, ROTULO_ORIGEM, type Envelhecimento, type Origem, type PontoFluxo } from "@/lib/financeiro";

const cursor = { fill: "rgba(148, 163, 184, 0.12)" };
const eixoReais = (v: number) => formatarReais(v, true).replace("R$ ", "");
export const COR_ORIGEM: Record<Origem, string> = { convenio: "#2563eb", particular: "#10b981", outros: "#94a3b8" };

// Entradas x saídas realizadas (barras) e previstas (contorno), com o saldo acumulado.
export function GraficoFluxo({ dados }: { dados: PontoFluxo[] }) {
  if (!dados.some(d => d.entradas || d.saidas || d.entradasPrevistas || d.saidasPrevistas)) return <Vazio altura={300} />;
  return (
    <div className="h-[320px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={10} />
          <YAxis yAxisId="v" tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <YAxis yAxisId="s" orientation="right" tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoFluxo;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.ok, rotulo: "Entradas realizadas / previstas", valor: `${formatarReais(p.entradas)} / ${formatarReais(p.entradasPrevistas)}` },
              { cor: COR.critico, rotulo: "Saídas realizadas / previstas", valor: `${formatarReais(p.saidas)} / ${formatarReais(p.saidasPrevistas)}` },
              { cor: COR.primaria, rotulo: "Saldo acumulado", valor: formatarReais(p.saldo) },
            ]} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="v" name="Entradas" dataKey="entradas" fill={COR.ok} fillOpacity={0.85} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
          <Bar yAxisId="v" name="Entradas previstas" dataKey="entradasPrevistas" fill={COR.ok} fillOpacity={0.2} stroke={COR.ok} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
          <Bar yAxisId="v" name="Saídas" dataKey="saidas" fill={COR.critico} fillOpacity={0.8} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
          <Bar yAxisId="v" name="Saídas previstas" dataKey="saidasPrevistas" fill={COR.critico} fillOpacity={0.15} stroke={COR.critico} radius={[4, 4, 0, 0]} maxBarSize={22} animationDuration={700} />
          <Line yAxisId="s" name="Saldo" type="monotone" dataKey="saldo" stroke={COR.primaria} strokeWidth={3} dot={false} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// Envelhecimento: uma barra por faixa, empilhada por origem (convênio, particular, outros).
export function GraficoEnvelhecimento({ porOrigem }: { porOrigem: Array<{ origem: Origem; faixas: Envelhecimento }> }) {
  const faixas = [...FAIXAS_A_VENCER, ...FAIXAS_VENCIDAS];
  const dados = faixas.map(f => ({
    faixa: f, rotulo: ROTULO_FAIXA[f].replace("A vencer ", "").replace("Vencidos ", ""), vencida: f.startsWith("v"),
    ...Object.fromEntries(porOrigem.map(o => [o.origem, o.faixas[f] ?? 0])),
  }));
  if (!dados.some(d => porOrigem.some(o => (d as Record<string, unknown>)[o.origem]))) return <Vazio altura={280} />;
  return (
    <div className="h-[300px]">
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={{ ...eixo, fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Record<string, number | string>;
            return <CaixaTooltip titulo={ROTULO_FAIXA[p.faixa as string]} linhas={porOrigem.map(o => ({ cor: COR_ORIGEM[o.origem], rotulo: ROTULO_ORIGEM[o.origem], valor: formatarReais(Number(p[o.origem]) || 0) }))} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => ROTULO_ORIGEM[v as Origem] ?? v} />
          {porOrigem.map((o, i) => (
            <Bar key={o.origem} dataKey={o.origem} stackId="a" fill={COR_ORIGEM[o.origem]} fillOpacity={0.85} radius={i === porOrigem.length - 1 ? [5, 5, 0, 0] : undefined} maxBarSize={44} animationDuration={700} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Evolução mensal do valor vencido e não recebido, por origem.
export function GraficoAtrasos({ dados }: { dados: Array<{ mes: string; rotulo: string; convenio: number; particular: number; outros: number }> }) {
  if (!dados.some(d => d.convenio || d.particular || d.outros)) return <Vazio altura={260} />;
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { rotulo: string; convenio: number; particular: number; outros: number };
            return <CaixaTooltip titulo={`Vencido em ${p.rotulo}`} linhas={(["convenio", "particular", "outros"] as Origem[]).map(o => ({ cor: COR_ORIGEM[o], rotulo: ROTULO_ORIGEM[o], valor: formatarReais(p[o]) }))} />;
          }} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={v => ROTULO_ORIGEM[v as Origem] ?? v} />
          {(["convenio", "particular", "outros"] as Origem[]).map((o, i) => (
            <Bar key={o} dataKey={o} stackId="a" fill={COR_ORIGEM[o]} fillOpacity={0.85} radius={i === 2 ? [5, 5, 0, 0] : undefined} maxBarSize={36} animationDuration={700} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
