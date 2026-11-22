"use client";

import { COR } from "./wait-charts";

// destaque: linha principal sob o nome (ex.: "98% de acerto"); detalhe: linha menor (só nos degraus mais altos);
// dica: texto do tooltip.
export type ItemPodio = { chave: string; nome: string; destaque: string; detalhe: string; dica: string };

const MEDALHA = [
  { cor: "#f59e0b", claro: "#fde68a", rotulo: "1º" },
  { cor: "#94a3b8", claro: "#e2e8f0", rotulo: "2º" },
  { cor: "#c2410c", claro: "#fed7aa", rotulo: "3º" },
];

// Posições no desenho: 2º à esquerda, 1º no centro (mais alto), 3º à direita.
const LUGARES = [
  { posicao: 0, x: 210, altura: 160 },
  { posicao: 1, x: 30, altura: 125 },
  { posicao: 2, x: 390, altura: 95 },
];
const LARGURA = 180;
const CHAO = 330;

const curto = (nome: string, max = 20) => {
  const partes = nome.trim().split(/\s+/);
  const doisNomes = partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1]}` : partes[0];
  return doisNomes.length > max ? `${doisNomes.slice(0, max - 1)}…` : doisNomes;
};

function Trofeu({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M -17 -2 C -30 -2 -30 18 -12 20" fill="none" stroke="#d97706" strokeWidth={4} />
      <path d="M 17 -2 C 30 -2 30 18 12 20" fill="none" stroke="#d97706" strokeWidth={4} />
      <path d="M -18 -4 H 18 Q 18 24 0 28 Q -18 24 -18 -4 Z" fill="#fbbf24" stroke="#d97706" strokeWidth={2} />
      <path d="M -10 2 Q -10 16 -3 20" fill="none" stroke="#fef3c7" strokeWidth={3} strokeLinecap="round" />
      <rect x={-4} y={27} width={8} height={9} fill="#d97706" />
      <rect x={-13} y={35} width={26} height={7} rx={2} fill="#b45309" />
      <g className="animate-pulse" fill="#fbbf24">
        <path d="M -38 -18 l 3 7 l 7 3 l -7 3 l -3 7 l -3 -7 l -7 -3 l 7 -3 z" />
        <path d="M 36 -24 l 2 5 l 5 2 l -5 2 l -2 5 l -2 -5 l -5 -2 l 5 -2 z" />
        <path d="M 30 22 l 2 4 l 4 2 l -4 2 l -2 4 l -2 -4 l -4 -2 l 4 -2 z" />
      </g>
    </g>
  );
}

// Bonequinho em pé sobre o pódio (pés em y = base).
function Boneco({ cx, base, cor, campeao }: { cx: number; base: number; cor: string; campeao: boolean }) {
  const ombro = base - 66;
  const pele = "#f1c27d";
  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d={`M ${cx - 10} ${base} L ${cx - 6} ${base - 34} M ${cx + 10} ${base} L ${cx + 6} ${base - 34}`} stroke="#334155" strokeWidth={9} fill="none" />
      {campeao ? (
        <path d={`M ${cx - 9} ${ombro} L ${cx - 16} ${base - 86} L ${cx - 11} ${base - 100} M ${cx + 9} ${ombro} L ${cx + 16} ${base - 86} L ${cx + 11} ${base - 100}`} stroke={pele} strokeWidth={7} fill="none" />
      ) : (
        <path d={`M ${cx - 9} ${ombro} L ${cx - 17} ${base - 44} M ${cx + 9} ${ombro} L ${cx + 22} ${base - 80} L ${cx + 26} ${base - 96}`} stroke={pele} strokeWidth={7} fill="none" />
      )}
      <rect x={cx - 13} y={ombro - 6} width={26} height={40} rx={10} fill={cor} />
      <circle cx={cx} cy={ombro + 10} r={5} fill="#fff" stroke={cor} strokeWidth={2} />
      <circle cx={cx} cy={base - 86} r={13} fill={pele} />
      <path d={`M ${cx - 13} ${base - 89} Q ${cx} ${base - 106} ${cx + 13} ${base - 89}`} fill="#334155" />
      <path d={`M ${cx - 5} ${base - 81} Q ${cx} ${base - 77} ${cx + 5} ${base - 81}`} stroke="#334155" strokeWidth={2} fill="none" />
      {campeao && <Trofeu x={cx} y={base - 142} />}
    </g>
  );
}

export function Podio({ itens, selecionado, onSelecionar, descricao, vazio }: { itens: ItemPodio[]; selecionado?: string; onSelecionar: (chave: string) => void; descricao: string; vazio?: string }) {
  if (!itens.length) return <p className="flex h-[260px] items-center justify-center text-center text-sm text-slate-400">{vazio ?? "Ainda não há funcionários com fichas suficientes para o pódio."}</p>;
  return (
    <svg viewBox="0 0 600 340" className="mx-auto block h-auto w-full max-w-[640px]" role="img" aria-label={descricao}>
      <line x1={10} x2={590} y1={CHAO} y2={CHAO} stroke={COR.grade} strokeWidth={2} />
      {LUGARES.map(({ posicao, x, altura }) => {
        const item = itens[posicao];
        if (!item) return null;
        const m = MEDALHA[posicao];
        const topo = CHAO - altura;
        const cx = x + LARGURA / 2;
        const apagado = selecionado && selecionado !== item.chave;
        return (
          <g key={item.chave} onClick={() => onSelecionar(item.chave)} style={{ cursor: "pointer", opacity: apagado ? 0.35 : 1, transition: "opacity .2s" }}>
            <title>{`${m.rotulo} ${item.nome}: ${item.dica} Clique para filtrar.`}</title>
            <Boneco cx={cx} base={topo} cor={m.cor} campeao={posicao === 0} />
            <rect x={x + 2} y={topo} width={LARGURA - 4} height={altura} rx={10} fill={m.claro} stroke={m.cor} strokeWidth={selecionado === item.chave ? 4 : 2} />
            <text x={cx} y={topo + 34} textAnchor="middle" fontSize={28} fontWeight={900} fill={m.cor}>{m.rotulo}</text>
            <text x={cx} y={topo + 56} textAnchor="middle" fontSize={14} fontWeight={800} fill="#1e293b">{curto(item.nome)}</text>
            <text x={cx} y={topo + 76} textAnchor="middle" fontSize={13} fontWeight={700} fill="#334155">{item.destaque}</text>
            {altura > 100 && <text x={cx} y={topo + 94} textAnchor="middle" fontSize={11} fill="#475569">{item.detalhe}</text>}
          </g>
        );
      })}
    </svg>
  );
}
