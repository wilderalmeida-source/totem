"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MINIMO_LAUDOS, formatarHoras, type GrupoLaudo } from "@/lib/laudos";
import { COR, CaixaTooltip, Vazio, eixo } from "./wait-charts";

const fmtN = (n: number) => n.toLocaleString("pt-BR");
// Porcentagem: 1 casa; abaixo de 1% até 2 casas, e "< 0,01%" para valores ainda menores (nunca "0%" quando há casos).
const fmtP = (n: number) => n > 0 && n < 0.01 ? "< 0,01%"
  : `${n.toLocaleString("pt-BR", { maximumFractionDigits: n > 0 && n < 1 ? 2 : 1 })}%`;
const cursor = { fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" };
const opacidade = (chave: string, selecionado?: string) => (!selecionado || selecionado === chave ? 1 : 0.28);

export const COR_REVISAO = "#8b5cf6";
export const COR_RETIFICACAO = "#ef4444";

export function corAtraso(p: number) {
  if (p >= 20) return COR.critico;
  if (p >= 5) return COR.atencao;
  return COR.ok;
}

export type MetricaLaudo = "assinados" | "medianaHoras" | "percentualAtraso" | "revisoes" | "taxaRevisao" | "retificacoes" | "taxaRetificacao";

// Como cada métrica é mostrada. "minimo": grupos com poucos laudos vão para o fim, em cinza (taxas e tempos).
const METRICAS: Record<MetricaLaudo, { valor: (g: GrupoLaudo) => string; detalhe: (g: GrupoLaudo) => string; cor: (g: GrupoLaudo) => string; minimo: boolean; soComValor: boolean; legenda: string }> = {
  assinados: { valor: g => fmtN(g.assinados), detalhe: g => `${fmtN(g.pendentes)} não finalizados`, cor: () => COR.primaria, minimo: false, soComValor: true, legenda: "Laudos finalizados · ao lado: ainda não finalizados" },
  medianaHoras: { valor: g => formatarHoras(g.medianaHoras), detalhe: g => `${fmtN(g.assinados)} laudos`, cor: () => COR.secundaria, minimo: true, soComValor: false, legenda: "Tempo típico (mediana) do exame até o laudo (finalizados) — mais lentos primeiro" },
  percentualAtraso: { valor: g => fmtP(g.percentualAtraso), detalhe: g => `${fmtN(g.atrasados)}/${fmtN(g.comPrazo)}`, cor: g => corAtraso(g.percentualAtraso), minimo: true, soComValor: false, legenda: "% de laudos finalizados depois do prazo · ao lado: atrasados/com prazo" },
  revisoes: { valor: g => fmtN(g.revisoes), detalhe: g => `${fmtP(g.taxaRevisao)} dos laudos`, cor: () => COR_REVISAO, minimo: false, soComValor: true, legenda: "Quantidade de revisões de laudo" },
  taxaRevisao: { valor: g => fmtP(g.taxaRevisao), detalhe: g => `${fmtN(g.revisoes)}/${fmtN(g.exames)}`, cor: () => COR_REVISAO, minimo: true, soComValor: true, legenda: "Revisões a cada 100 laudos · ao lado: revisões/laudos" },
  retificacoes: { valor: g => fmtN(g.retificacoes), detalhe: g => `${fmtP(g.taxaRetificacao)} dos laudos`, cor: () => COR_RETIFICACAO, minimo: false, soComValor: true, legenda: "Quantidade de retificações de laudo" },
  taxaRetificacao: { valor: g => fmtP(g.taxaRetificacao), detalhe: g => `${fmtN(g.retificacoes)}/${fmtN(g.exames)}`, cor: () => COR_RETIFICACAO, minimo: true, soComValor: true, legenda: "Retificações a cada 100 laudos · ao lado: retificações/laudos" },
};

const BASE_COM_VALOR: Partial<Record<MetricaLaudo, keyof GrupoLaudo>> = { taxaRevisao: "revisoes", taxaRetificacao: "retificacoes" };

export function RankingLaudos({ grupos, metrica, selecionado, onSelecionar, limite = 10, minimo = MINIMO_LAUDOS }: {
  grupos: GrupoLaudo[]; metrica: MetricaLaudo; selecionado?: string; onSelecionar: (chave: string) => void; limite?: number; minimo?: number;
}) {
  const [todos, setTodos] = useState(false);
  const m = METRICAS[metrica];
  const poucos = (g: GrupoLaudo) => m.minimo && (metrica === "medianaHoras" ? g.comTempo : g.assinados) < minimo;
  const ordenados = grupos
    .filter(g => !m.soComValor || Number(g[BASE_COM_VALOR[metrica] ?? metrica]) > 0)
    .filter(g => metrica !== "medianaHoras" || g.comTempo > 0)
    .filter(g => metrica !== "percentualAtraso" || g.comPrazo > 0)
    .sort((a, b) => Number(poucos(a)) - Number(poucos(b)) || b[metrica] - a[metrica] || b.exames - a.exames);
  if (!ordenados.length) return <Vazio altura={220} />;
  const qtdPoucos = ordenados.filter(poucos).length;
  const visiveis = todos ? ordenados : ordenados.slice(0, limite);

  return (
    <div>
      <div style={{ height: Math.max(200, visiveis.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={visiveis} layout="vertical" margin={{ top: 0, right: 130, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} horizontal={false} />
            <XAxis type="number" tick={eixo} tickLine={false} axisLine={false} tickFormatter={(v: number) => (metrica === "medianaHoras" ? formatarHoras(v) : metrica.startsWith("taxa") || metrica === "percentualAtraso" ? `${v}%` : fmtN(v))} />
            <YAxis type="category" dataKey="nome" tick={{ ...eixo, fontWeight: 600 }} tickLine={false} axisLine={false} width={170}
              tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)} />
            <Tooltip cursor={cursor} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const g = payload[0].payload as GrupoLaudo;
              return <CaixaTooltip titulo={g.nome} linhas={[
                { cor: COR.primaria, rotulo: "Laudos finalizados", valor: `${fmtN(g.assinados)} de ${fmtN(g.exames)} exames` },
                { cor: COR.secundaria, rotulo: "Tempo típico / médio", valor: g.comTempo ? `${formatarHoras(g.medianaHoras)} / ${formatarHoras(g.mediaHoras)}` : "—" },
                { cor: corAtraso(g.percentualAtraso), rotulo: "Depois do prazo", valor: g.comPrazo ? `${fmtN(g.atrasados)} (${fmtP(g.percentualAtraso)})` : "sem prazo" },
                { cor: COR_REVISAO, rotulo: "Revisões", valor: `${fmtN(g.revisoes)} (${fmtP(g.taxaRevisao)})` },
                { cor: COR_RETIFICACAO, rotulo: "Retificações", valor: `${fmtN(g.retificacoes)} (${fmtP(g.taxaRetificacao)})` },
              ]} rodape="Clique para filtrar a tela" />;
            }} />
            <Bar dataKey={metrica} radius={[0, 8, 8, 0]} barSize={22} cursor="pointer" animationDuration={700}
              onClick={(_: unknown, i: number) => onSelecionar(visiveis[i].chave)}>
              {visiveis.map(g => <Cell key={g.chave} fill={poucos(g) ? "#94a3b8" : m.cor(g)} fillOpacity={opacidade(g.chave, selecionado)} />)}
              <LabelList dataKey={metrica} position="right" content={(p) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = p as { x?: number; y?: number; width?: number; height?: number; index?: number };
                const g = visiveis[index];
                return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="middle" fontSize={12} fontWeight={700} fill={COR.texto}>
                  {m.valor(g)} <tspan fontWeight={400}>· {m.detalhe(g)}{poucos(g) ? " · poucos dados" : ""}</tspan>
                </text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>{m.legenda}{qtdPoucos ? ` · em cinza: menos de ${minimo} laudos (${qtdPoucos})` : ""}</span>
        {ordenados.length > limite && (
          <button onClick={() => setTodos(v => !v)} className="shrink-0 font-bold text-blue-600 hover:underline">{todos ? "Ver menos" : `Ver todos (${ordenados.length})`}</button>
        )}
      </div>
    </div>
  );
}

export type PontoLaudoDia = { chave: string; rotulo: string; exames: number; assinados: number; pendentes: number; revisoes: number; retificacoes: number; medianaHoras: number; percentualAtraso: number; comPrazo: number };

// Por dia do exame: barras = laudos finalizados e não finalizados, linha = % depois do prazo.
export function TendenciaLaudos({ dados, selecionado, onSelecionar }: { dados: PontoLaudoDia[]; selecionado?: string; onSelecionar: (chave: string) => void }) {
  if (!dados.some(d => d.exames)) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis yAxisId="qtd" tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="taxa" orientation="right" tick={eixo} tickLine={false} axisLine={false} unit="%" width={48} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoLaudoDia;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.primaria, rotulo: "Finalizados", valor: fmtN(p.assinados) },
              { cor: COR.atencao, rotulo: "Não finalizados", valor: fmtN(p.pendentes) },
              { cor: COR.secundaria, rotulo: "Tempo típico", valor: p.assinados ? formatarHoras(p.medianaHoras) : "—" },
              { cor: corAtraso(p.percentualAtraso), rotulo: "Depois do prazo", valor: p.comPrazo ? fmtP(p.percentualAtraso) : "sem prazo" },
              { cor: COR_REVISAO, rotulo: "Revisões / retificações", valor: `${fmtN(p.revisoes)} / ${fmtN(p.retificacoes)}` },
            ]} rodape="Clique para filtrar o dia" />;
          }} />
          <Bar yAxisId="qtd" dataKey="assinados" stackId="l" maxBarSize={30} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={COR.primaria} fillOpacity={0.8 * opacidade(d.chave, selecionado)} />)}
          </Bar>
          <Bar yAxisId="qtd" dataKey="pendentes" stackId="l" radius={[6, 6, 0, 0]} maxBarSize={30} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={COR.atencao} fillOpacity={0.8 * opacidade(d.chave, selecionado)} />)}
          </Bar>
          <Line yAxisId="taxa" type="monotone" dataKey="percentualAtraso" stroke={COR.critico} strokeWidth={3} dot={{ r: 3, fill: COR.critico }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Alternador({ valor, onChange, opcoes }: { valor: string; onChange: (v: string) => void; opcoes: Array<[string, string]> }) {
  return (
    <div className="flex shrink-0 flex-wrap rounded-xl bg-slate-100 p-1">
      {opcoes.map(([id, rotulo]) => (
        <button key={id} onClick={() => onChange(id)} className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${valor === id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"}`}>{rotulo}</button>
      ))}
    </div>
  );
}

export function Legenda({ itens }: { itens: Array<[string, string]> }) {
  return (
    <div className="hidden flex-wrap justify-end gap-3 text-xs font-semibold text-slate-500 sm:flex">
      {itens.map(([rotulo, cor]) => <span key={rotulo} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo}</span>)}
    </div>
  );
}
