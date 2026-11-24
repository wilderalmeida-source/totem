"use client";

import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { COR, CaixaTooltip, Vazio, eixo } from "@/components/dashboard/wait-charts";
import { formatarReais } from "@/lib/diretoria";

const cursor = { fill: "rgba(148, 163, 184, 0.12)" };
const eixoReais = (v: number) => formatarReais(v, true).replace("R$ ", "");

// ---------- Ranking em barras horizontais ----------

export type ItemRanking = { chave: string; nome: string; valor: number; detalhe?: string; negativo?: boolean };

export function RankingBarras({ itens, formatar = v => formatarReais(v), cor = COR.primaria, limite = 8, vazio = "Sem dados no período." }: {
  itens: ItemRanking[]; formatar?: (v: number) => string; cor?: string; limite?: number; vazio?: string;
}) {
  const lista = itens.filter(i => i.valor !== 0).slice(0, limite);
  if (!lista.length) return <p className="py-8 text-center text-sm text-slate-400">{vazio}</p>;
  const max = Math.max(...lista.map(i => Math.abs(i.valor)));
  return (
    <ol className="space-y-2.5">
      {lista.map((i, n) => (
        <li key={i.chave}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-700" title={i.nome}><span className="mr-1.5 text-xs text-slate-400">{n + 1}.</span>{i.nome}</span>
            <span className="shrink-0 tabular-nums">
              <b className={i.valor < 0 || i.negativo ? "text-red-600" : "text-slate-900"}>{formatar(i.valor)}</b>
              {i.detalhe && <span className="ml-1.5 text-xs text-slate-400">{i.detalhe}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (Math.abs(i.valor) / max) * 100)}%`, background: i.valor < 0 || i.negativo ? COR.critico : cor }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------- Evolução mensal: receitas x despesas, lucro e EBITDA ----------

export type PontoResultado = { mes: string; rotulo: string; receita: number; despesas: number; lucro: number; ebitda: number };

export function GraficoResultado({ dados }: { dados: PontoResultado[] }) {
  if (!dados.some(d => d.receita || d.despesas)) return <Vazio altura={300} />;
  return (
    <div className="h-[310px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <ReferenceLine y={0} stroke={COR.texto} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoResultado;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.primaria, rotulo: "Receita bruta", valor: formatarReais(p.receita) },
              { cor: "#94a3b8", rotulo: "Despesas do DRE", valor: formatarReais(p.despesas) },
              { cor: COR.secundaria, rotulo: "EBITDA", valor: formatarReais(p.ebitda) },
              { cor: p.lucro >= 0 ? COR.ok : COR.critico, rotulo: "Lucro líquido", valor: formatarReais(p.lucro) },
            ]} />;
          }} />
          <Bar dataKey="receita" fill={COR.primaria} fillOpacity={0.85} radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={700} />
          <Bar dataKey="despesas" fill="#94a3b8" fillOpacity={0.7} radius={[6, 6, 0, 0]} maxBarSize={26} animationDuration={700} />
          <Line type="monotone" dataKey="ebitda" stroke={COR.secundaria} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={900} />
          <Line type="monotone" dataKey="lucro" stroke={COR.ok} strokeWidth={3} dot={{ r: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Produção x faturamento x recebimento ----------

export type PontoFluxo = { mes: string; rotulo: string; producao: number; faturado: number; recebido: number };

export function GraficoProducao({ dados }: { dados: PontoFluxo[] }) {
  if (!dados.some(d => d.producao || d.faturado || d.recebido)) return <Vazio altura={300} />;
  return (
    <div className="h-[310px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoFluxo;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.primaria, rotulo: "Produção (exames do mês)", valor: formatarReais(p.producao) },
              { cor: COR.atencao, rotulo: "Faturado aos convênios", valor: formatarReais(p.faturado) },
              { cor: COR.ok, rotulo: "Recebido (caixa)", valor: formatarReais(p.recebido) },
            ]} />;
          }} />
          <Bar dataKey="producao" fill={COR.primaria} fillOpacity={0.8} radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={700} />
          <Line type="monotone" dataKey="faturado" stroke={COR.atencao} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={900} />
          <Line type="monotone" dataKey="recebido" stroke={COR.ok} strokeWidth={3} dot={{ r: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Barras simples por mês (ex.: amortizações) ----------

export function GraficoMensal({ dados, cor = COR.secundaria, rotulo }: { dados: Array<{ mes: string; rotulo: string; valor: number }>; cor?: string; rotulo: string }) {
  if (!dados.some(d => d.valor)) return <Vazio altura={200} />;
  return (
    <div className="h-[210px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} width={64} tickFormatter={eixoReais} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as { rotulo: string; valor: number };
            return <CaixaTooltip titulo={p.rotulo} linhas={[{ cor, rotulo, valor: formatarReais(p.valor) }]} />;
          }} />
          <Bar dataKey="valor" fill={cor} fillOpacity={0.85} radius={[6, 6, 0, 0]} maxBarSize={30} animationDuration={700} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
