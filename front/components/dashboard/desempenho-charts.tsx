"use client";

import { useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer,
  Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { MINIMO_AMOSTRA, type Grupo } from "@/lib/desempenho";
import { COR, CaixaTooltip, Vazio, corPorMeta, eixo, formatarMinutos } from "./wait-charts";

const fmtN = (n: number) => n.toLocaleString("pt-BR");
const cursor = { fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" };
// Com algo selecionado, o restante fica esmaecido para destacar a escolha.
const opacidade = (chave: string, selecionado?: string) => (!selecionado || selecionado === chave ? 1 : 0.28);

export type MetricaRanking = "mediaFicha" | "mediaTotal" | "minutosAtraso" | "percentualAtrasados";

const ROTULO_METRICA: Record<MetricaRanking, string> = {
  mediaFicha: "Tempo médio de ficha",
  mediaTotal: "Tempo total médio (espera + ficha)",
  minutosAtraso: "Minutos de atraso causados",
  percentualAtrasados: "% de pacientes que entraram atrasados",
};

function valorFormatado(m: MetricaRanking, v: number) {
  if (m === "percentualAtrasados") return `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  if (m === "minutosAtraso") return v >= 60 ? formatarMinutos(v) : `${Math.round(v)} min`;
  return formatarMinutos(v);
}

export function RankingBarras({ grupos, metrica, meta, selecionado, onSelecionar, limite = 10, rotuloVolume = "fichas", minimo = MINIMO_AMOSTRA }: {
  grupos: Grupo[]; metrica: MetricaRanking; meta: number; selecionado?: string; onSelecionar: (chave: string) => void; limite?: number; rotuloVolume?: string; minimo?: number;
}) {
  const [todos, setTodos] = useState(false);
  // Itens com poucos dados ficam no fim, em cinza, para não liderarem o ranking por acaso.
  const poucos = (g: Grupo) => g.total < minimo;
  const ordenados = [...grupos].filter(g => (metrica === "minutosAtraso" || metrica === "percentualAtrasados" ? g.comHorario > 0 : true))
    .sort((a, b) => Number(poucos(a)) - Number(poucos(b)) || b[metrica] - a[metrica] || b.total - a.total);
  const qtdPoucos = ordenados.filter(poucos).length;
  if (!ordenados.length) return <Vazio altura={220} />;
  const visiveis = todos ? ordenados : ordenados.slice(0, limite);
  const cor = (g: Grupo) => poucos(g) ? "#94a3b8" : metrica === "mediaFicha" ? corPorMeta(g.mediaFicha, meta)
    : metrica === "mediaTotal" ? COR.primaria
    : g.percentualAtrasados >= 30 ? COR.critico : g.percentualAtrasados >= 10 ? COR.atencao : COR.ok;

  return (
    <div>
      <div style={{ height: Math.max(200, visiveis.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={visiveis} layout="vertical" margin={{ top: 0, right: 150, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} horizontal={false} />
            <XAxis type="number" tick={eixo} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="nome" tick={{ ...eixo, fontWeight: 600 }} tickLine={false} axisLine={false} width={150}
              tickFormatter={(v: string) => (v.length > 20 ? `${v.slice(0, 19)}…` : v)} />
            {metrica === "mediaFicha" && <ReferenceLine x={meta} stroke={COR.critico} strokeDasharray="6 4" />}
            <Tooltip cursor={cursor} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const g = payload[0].payload as Grupo;
              return <CaixaTooltip titulo={g.nome} linhas={[
                { cor: corPorMeta(g.mediaFicha, meta), rotulo: "Ficha (média)", valor: formatarMinutos(g.mediaFicha) },
                { cor: COR.secundaria, rotulo: "9 em 10 até", valor: formatarMinutos(g.p90Ficha) },
                { cor: COR.atencao, rotulo: "Espera até ser chamado", valor: formatarMinutos(g.mediaEspera) },
                { cor: COR.texto, rotulo: rotuloVolume[0].toUpperCase() + rotuloVolume.slice(1), valor: fmtN(g.total) },
                ...(g.comHorario ? [
                  { cor: COR.critico, rotulo: "Entraram atrasados", valor: `${g.atrasados} de ${g.comHorario} (${g.percentualAtrasados.toLocaleString("pt-BR")}%)` },
                  { cor: COR.critico, rotulo: "Atraso causado", valor: valorFormatado("minutosAtraso", g.minutosAtraso) },
                ] : []),
              ]} rodape="Clique para ver estes atendimentos" />;
            }} />
            <Bar dataKey={metrica} radius={[0, 8, 8, 0]} barSize={22} cursor="pointer" animationDuration={700}
              onClick={(_: unknown, i: number) => onSelecionar(visiveis[i].chave)}>
              {visiveis.map(g => <Cell key={g.chave} fill={cor(g)} fillOpacity={opacidade(g.chave, selecionado)} />)}
              <LabelList dataKey={metrica} position="right" content={(p) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = p as { x?: number; y?: number; width?: number; height?: number; index?: number };
                const g = visiveis[index];
                return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="middle" fontSize={12} fontWeight={700} fill={COR.texto}>
                  {valorFormatado(metrica, g[metrica])} <tspan fontWeight={400}>· {fmtN(g.total)}{poucos(g) ? " · poucos dados" : ""}</tspan>
                </text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{ROTULO_METRICA[metrica]} · número ao lado = {rotuloVolume}{qtdPoucos ? ` · em cinza: menos de ${minimo} ${rotuloVolume} (${qtdPoucos})` : ""}</span>
        {ordenados.length > limite && (
          <button onClick={() => setTodos(v => !v)} className="font-bold text-blue-600 hover:underline">{todos ? "Ver menos" : `Ver todos (${ordenados.length})`}</button>
        )}
      </div>
    </div>
  );
}

export function DispersaoFuncionarios({ grupos, meta, selecionado, onSelecionar }: { grupos: Grupo[]; meta: number; selecionado?: string; onSelecionar: (chave: string) => void }) {
  if (!grupos.length) return <Vazio altura={300} />;
  return (
    <div className="h-[320px]">
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 12, right: 16, left: -6, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} />
          <XAxis type="number" dataKey="total" name="Fichas" tick={eixo} tickLine={false} axisLine={false} allowDecimals={false}
            label={{ value: "Fichas realizadas (volume)", position: "insideBottom", offset: -4, fill: COR.texto, fontSize: 11 }} />
          <YAxis type="number" dataKey="mediaFicha" name="Ficha" unit=" m" tick={eixo} tickLine={false} axisLine={false} width={56} />
          <ZAxis type="number" dataKey="exames" range={[90, 520]} />
          <ReferenceLine y={meta} stroke={COR.critico} strokeDasharray="6 4" label={{ value: `Meta ${meta} min`, position: "insideTopRight", fill: COR.critico, fontSize: 11, fontWeight: 700 }} />
          <Tooltip cursor={{ strokeDasharray: "4 4" }} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const g = payload[0].payload as Grupo;
            return <CaixaTooltip titulo={g.nome} linhas={[
              { cor: COR.texto, rotulo: "Fichas", valor: fmtN(g.total) },
              { cor: corPorMeta(g.mediaFicha, meta), rotulo: "Ficha (média)", valor: formatarMinutos(g.mediaFicha) },
              { cor: COR.ok, rotulo: "Dentro da meta", valor: `${g.percentualMeta.toLocaleString("pt-BR")}%` },
            ]} />;
          }} />
          <Scatter data={grupos} cursor="pointer" onClick={(_: unknown, i: number) => onSelecionar(grupos[i].chave)} animationDuration={700}>
            {grupos.map(g => <Cell key={g.chave} fill={corPorMeta(g.mediaFicha, meta)} fillOpacity={selecionado ? opacidade(g.chave, selecionado) : 0.8} stroke="#fff" strokeWidth={2} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <p className="-mt-1 text-xs text-slate-500">Quem fica à direita atende mais; quem fica acima demora mais. Bolha maior = mais exames.</p>
    </div>
  );
}

export type PontoComposicao = { chave: string; rotulo: string; espera: number; ficha: number; total: number };

export function ComposicaoTempo({ dados, selecionado, onSelecionar }: { dados: PontoComposicao[]; selecionado?: string; onSelecionar: (chave: string) => void }) {
  if (!dados.some(d => d.total)) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <BarChart data={dados} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis tick={eixo} tickLine={false} axisLine={false} unit=" m" width={52} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoComposicao;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.atencao, rotulo: "Espera até ser chamado", valor: formatarMinutos(p.espera) },
              { cor: COR.primaria, rotulo: "Ficha", valor: formatarMinutos(p.ficha) },
              { cor: COR.texto, rotulo: "Total", valor: formatarMinutos(p.espera + p.ficha) },
              { cor: COR.texto, rotulo: "Fichas", valor: fmtN(p.total) },
            ]} />;
          }} />
          <Bar dataKey="espera" stackId="t" fill={COR.atencao} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fillOpacity={opacidade(d.chave, selecionado)} />)}
          </Bar>
          <Bar dataKey="ficha" stackId="t" fill={COR.primaria} radius={[6, 6, 0, 0]} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fillOpacity={opacidade(d.chave, selecionado)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FichaPorHora({ grupos, meta, selecionado, onSelecionar }: { grupos: Grupo[]; meta: number; selecionado?: string; onSelecionar: (chave: string) => void }) {
  if (!grupos.length) return <Vazio altura={280} />;
  const dados = [...grupos].sort((a, b) => a.chave.localeCompare(b.chave));
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="nome" tick={eixo} tickLine={false} axisLine={false} />
          <YAxis yAxisId="vol" tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="min" orientation="right" tick={eixo} tickLine={false} axisLine={false} unit=" m" width={52} />
          <ReferenceLine yAxisId="min" y={meta} stroke={COR.critico} strokeDasharray="6 4" />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const g = payload[0].payload as Grupo;
            return <CaixaTooltip titulo={`Chamados das ${g.nome}`} linhas={[
              { cor: COR.primaria, rotulo: "Fichas", valor: fmtN(g.total) },
              { cor: corPorMeta(g.mediaFicha, meta), rotulo: "Ficha (média)", valor: formatarMinutos(g.mediaFicha) },
              { cor: COR.atencao, rotulo: "Espera até ser chamado", valor: formatarMinutos(g.mediaEspera) },
            ]} />;
          }} />
          <Bar yAxisId="vol" dataKey="total" radius={[8, 8, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(g => <Cell key={g.chave} fill={COR.primaria} fillOpacity={0.35 * opacidade(g.chave, selecionado) + (selecionado === g.chave ? 0.4 : 0)} />)}
          </Bar>
          <Line yAxisId="min" type="monotone" dataKey="mediaFicha" stroke={COR.secundaria} strokeWidth={3} dot={{ r: 3, fill: COR.secundaria }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
