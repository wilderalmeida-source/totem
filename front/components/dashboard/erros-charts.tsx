"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MINIMO_FICHAS, ROTULO_ORIGEM, type CelulaErro, type GrupoErro, type LinhaCalorErro, type OrigemErro } from "@/lib/erros";
import { COR, CaixaTooltip, Vazio, eixo } from "./wait-charts";

const fmtN = (n: number) => n.toLocaleString("pt-BR");
const fmtP = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const cursor = { fill: "color-mix(in srgb, var(--system-blue, #2563eb) 8%, transparent)" };
const opacidade = (chave: string, selecionado?: string) => (!selecionado || selecionado === chave ? 1 : 0.28);

export const COR_ORIGEM: Record<OrigemErro, string> = {
  exame: COR.primaria,
  atendimento: COR.secundaria,
  paciente: COR.atencao,
};

// Meta = % máxima aceitável de fichas com erro. Até a meta: verde; até o dobro: âmbar; acima: vermelho.
export const META_PADRAO = 10;
export function corTaxa(taxa: number, meta = META_PADRAO) {
  if (taxa > meta * 2) return COR.critico;
  if (taxa > meta) return COR.atencao;
  return COR.ok;
}

export type MetricaErro = "taxa" | "erros";

// Ranking horizontal clicável. Na métrica "taxa", quem tem poucas fichas vai para o fim, em cinza.
export function RankingErros({ grupos, metrica, selecionado, onSelecionar, limite = 10, minimo = MINIMO_FICHAS, porOrigem = false, meta = META_PADRAO }: {
  grupos: GrupoErro[]; metrica: MetricaErro; selecionado?: string; onSelecionar: (chave: string) => void; limite?: number; minimo?: number; porOrigem?: boolean; meta?: number;
}) {
  const [todos, setTodos] = useState(false);
  const poucos = (g: GrupoErro) => !porOrigem && metrica === "taxa" && g.analisados < minimo;
  const ordenados = [...grupos].filter(g => porOrigem || metrica === "erros" ? g.erros > 0 : true)
    .sort((a, b) => Number(poucos(a)) - Number(poucos(b)) || b[metrica] - a[metrica] || b.erros - a.erros);
  if (!ordenados.length || !ordenados.some(g => g.erros > 0)) return <Vazio altura={220} />;
  const qtdPoucos = ordenados.filter(poucos).length;
  const visiveis = todos ? ordenados : ordenados.slice(0, limite);
  const cor = (g: GrupoErro) => (poucos(g) ? "#94a3b8" : porOrigem && g.origem ? COR_ORIGEM[g.origem] : corTaxa(g.taxa, meta));
  const valor = (g: GrupoErro) => (metrica === "taxa" ? fmtP(g.taxa) : fmtN(g.erros));
  const detalhe = (g: GrupoErro) => (porOrigem ? `${fmtN(g.comErro)} fichas` : metrica === "taxa" ? `${fmtN(g.comErro)}/${fmtN(g.analisados)}` : `${fmtN(g.analisados)} fichas`);

  return (
    <div>
      <div style={{ height: Math.max(200, visiveis.length * 40) }}>
        <ResponsiveContainer>
          <BarChart data={visiveis} layout="vertical" margin={{ top: 0, right: 130, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} horizontal={false} />
            <XAxis type="number" tick={eixo} tickLine={false} axisLine={false} allowDecimals={metrica === "taxa"} unit={metrica === "taxa" ? "%" : ""} />
            {metrica === "taxa" && !porOrigem && <ReferenceLine x={meta} stroke={COR.ok} strokeDasharray="6 4" strokeWidth={2} />}
            <YAxis type="category" dataKey="nome" tick={{ ...eixo, fontWeight: 600 }} tickLine={false} axisLine={false} width={160}
              tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
            <Tooltip cursor={cursor} content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const g = payload[0].payload as GrupoErro;
              return <CaixaTooltip titulo={g.nome} linhas={[
                ...(g.origem && porOrigem ? [{ cor: COR_ORIGEM[g.origem], rotulo: "Origem", valor: ROTULO_ORIGEM[g.origem] }] : []),
                { cor: COR.critico, rotulo: "Erros (campos corrigidos)", valor: fmtN(g.erros) },
                { cor: corTaxa(g.taxa, meta), rotulo: porOrigem ? "Fichas com este erro" : "Fichas com erro", valor: `${fmtN(g.comErro)} de ${fmtN(g.analisados)} (${fmtP(g.taxa)})` },
              ]} rodape="Clique para filtrar e ver os erros" />;
            }} />
            <Bar dataKey={metrica} radius={[0, 8, 8, 0]} barSize={22} cursor="pointer" animationDuration={700}
              onClick={(_: unknown, i: number) => onSelecionar(visiveis[i].chave)}>
              {visiveis.map(g => <Cell key={g.chave} fill={cor(g)} fillOpacity={opacidade(g.chave, selecionado)} />)}
              <LabelList dataKey={metrica} position="right" content={(p) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = p as { x?: number; y?: number; width?: number; height?: number; index?: number };
                const g = visiveis[index];
                return <text x={Number(x) + Number(width) + 6} y={Number(y) + Number(height) / 2} dominantBaseline="middle" fontSize={12} fontWeight={700} fill={COR.texto}>
                  {valor(g)} <tspan fontWeight={400}>· {detalhe(g)}{poucos(g) ? " · poucos dados" : ""}</tspan>
                </text>;
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {porOrigem ? "Quantidade de correções por campo · cor = origem" : metrica === "taxa" ? `% de fichas com pelo menos um erro · ao lado: com erro/analisadas · tracejado: meta de ${meta}%` : "Quantidade de erros · ao lado: fichas analisadas"}
          {qtdPoucos ? ` · em cinza: menos de ${minimo} fichas (${qtdPoucos})` : ""}
        </span>
        {ordenados.length > limite && (
          <button onClick={() => setTodos(v => !v)} className="shrink-0 font-bold text-blue-600 hover:underline">{todos ? "Ver menos" : `Ver todos (${ordenados.length})`}</button>
        )}
      </div>
    </div>
  );
}

export type PontoErroDia = { chave: string; rotulo: string; analisados: number; comErro: number; erros: number; taxa: number };

// Por dia: barra cinza ao fundo = fichas analisadas, barra vermelha na frente = erros, linha = % de fichas com erro.
export const COR_FICHAS = "#cbd5e1";
export function TendenciaErros({ dados, selecionado, onSelecionar, meta = META_PADRAO }: { dados: PontoErroDia[]; selecionado?: string; onSelecionar: (chave: string) => void; meta?: number }) {
  if (!dados.some(d => d.analisados)) return <Vazio altura={280} />;
  return (
    <div className="h-[290px]">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 10, right: 0, left: -10, bottom: 0 }} barGap="-100%">
          <CartesianGrid strokeDasharray="3 3" stroke={COR.grade} vertical={false} />
          <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis yAxisId="qtd" tick={eixo} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <YAxis yAxisId="taxa" orientation="right" tick={eixo} tickLine={false} axisLine={false} unit="%" width={48} />
          <Tooltip cursor={cursor} content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as PontoErroDia;
            return <CaixaTooltip titulo={p.rotulo} linhas={[
              { cor: COR.critico, rotulo: "Erros", valor: fmtN(p.erros) },
              { cor: corTaxa(p.taxa, meta), rotulo: "Fichas com erro", valor: `${fmtN(p.comErro)} (${fmtP(p.taxa)})` },
              { cor: COR.texto, rotulo: "Fichas analisadas", valor: fmtN(p.analisados) },
            ]} rodape="Clique para filtrar o dia" />;
          }} />
          <Bar yAxisId="qtd" dataKey="analisados" radius={[6, 6, 0, 0]} maxBarSize={30} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={COR_FICHAS} fillOpacity={opacidade(d.chave, selecionado)} />)}
          </Bar>
          <Bar yAxisId="qtd" dataKey="erros" radius={[6, 6, 0, 0]} maxBarSize={30} cursor="pointer" animationDuration={700} onClick={(_: unknown, i: number) => onSelecionar(dados[i].chave)}>
            {dados.map(d => <Cell key={d.chave} fill={COR.critico} fillOpacity={0.75 * opacidade(d.chave, selecionado)} />)}
          </Bar>
          <ReferenceLine yAxisId="taxa" y={meta} stroke={COR.ok} strokeDasharray="6 4" strokeWidth={2} label={{ value: `meta ${meta}%`, position: "insideTopRight", fill: COR.ok, fontSize: 11, fontWeight: 700 }} />
          <Line yAxisId="taxa" type="monotone" dataKey="taxa" stroke={COR.primaria} strokeWidth={3} dot={{ r: 3, fill: COR.primaria }} activeDot={{ r: 6, stroke: "#fff", strokeWidth: 3 }} animationDuration={900} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Mapa de calor: dia da semana × hora da ficha ----
const POUCAS_FICHAS = 5;
const hh = (h: number) => `${String(h).padStart(2, "0")}h`;
// Verde (0) → âmbar → vermelho (t = 1).
const corEscala = (t: number) => { const x = Math.min(1, Math.max(0, t)); return `hsl(${Math.round(150 - x * 150)} 72% ${48 - x * 4}%)`; };

export function MapaCalorErros({ horas, linhas, metrica, selecionado, onSelecionar, meta = META_PADRAO }: {
  horas: number[]; linhas: LinhaCalorErro[]; metrica: MetricaErro; selecionado?: { dia?: string; hora?: string }; meta?: number;
  onSelecionar: (dia: number, hora: number) => void;
}) {
  if (!horas.length) return <Vazio altura={220} />;
  const maxErros = Math.max(1, ...linhas.flatMap(l => l.celulas.map(c => c.erros)));
  // Na %: verde em 0, âmbar na meta, vermelho no dobro da meta.
  const TAXA_MAXIMA = Math.max(1, meta * 2);
  const t = (c: CelulaErro) => (metrica === "taxa" ? c.taxa / TAXA_MAXIMA : c.erros / maxErros);
  const ativo = selecionado?.dia !== undefined && selecionado?.hora !== undefined;
  return (
    <div className="overflow-x-auto">
      <div className="inline-grid min-w-full gap-1.5" style={{ gridTemplateColumns: `44px repeat(${horas.length}, minmax(40px, 1fr))` }}>
        <span />
        {horas.map(h => <span key={h} className="pb-1 text-center text-[11px] font-semibold text-slate-500">{hh(h)}</span>)}
        {linhas.map(linha => (
          <div key={linha.dia} className="contents">
            <span className="flex items-center text-xs font-bold text-slate-600">{linha.nome}</span>
            {linha.celulas.map(c => {
              if (!c.analisados) return <div key={c.hora} title={`${linha.nome} ${hh(c.hora)} · sem fichas`} className="h-10 rounded-lg" style={{ background: "var(--system-raised, #f1f5f9)" }} />;
              const poucas = c.analisados < POUCAS_FICHAS;
              const marcado = selecionado?.dia === String(linha.dia) && selecionado?.hora === String(c.hora).padStart(2, "0");
              const texto = `${linha.nome} ${hh(c.hora)} · ${c.comErro} de ${c.analisados} fichas com erro (${fmtP(c.taxa)}) · ${c.erros} erros${poucas ? " · poucas fichas" : ""} — clique para filtrar`;
              return (
                <button key={c.hora} type="button" onClick={() => onSelecionar(linha.dia, c.hora)} title={texto} aria-label={texto} aria-pressed={marcado}
                  className={`flex h-10 items-center justify-center rounded-lg text-[11px] font-bold text-white outline-none ring-offset-2 transition hover:z-10 hover:scale-110 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-blue-500 ${marcado ? "ring-2 ring-slate-900" : ""}`}
                  style={{ background: corEscala(t(c)), opacity: (ativo && !marcado ? 0.35 : 1) * (poucas ? 0.55 : 1) }}>
                  {metrica === "taxa" ? `${Math.round(c.taxa)}%` : c.erros}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Hora em que a ficha foi concluída. Quadrados mais claros: menos de {POUCAS_FICHAS} fichas. Clique para filtrar a tela por dia da semana e horário.</span>
        <span className="flex items-center gap-2">
          <span>{metrica === "taxa" ? "0%" : "Menos erros"}</span>
          <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${corEscala(0)}, ${corEscala(0.5)}, ${corEscala(1)})` }} />
          <span>{metrica === "taxa" ? `${TAXA_MAXIMA}%+` : `${maxErros} erros`}</span>
        </span>
      </div>
    </div>
  );
}
