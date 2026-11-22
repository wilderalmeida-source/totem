"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle, Award, BadgeCheck, CalendarRange, Clock3, Download, FileClock, FilePen, FileSearch, FileText, Hourglass, Layers,
  MousePointerClick, RefreshCw, Stethoscope, Timer, Trophy, X, Zap,
} from "lucide-react";
import { COR, Kpi, Painel, formatarData } from "@/components/dashboard/wait-charts";
import { Podio } from "@/components/dashboard/podio";
import { Alternador, COR_RETIFICACAO, COR_REVISAO, Legenda, RankingLaudos, TendenciaLaudos, corAtraso, type MetricaLaudo } from "@/components/dashboard/laudos-charts";
import { diasDoPeriodo } from "@/lib/desempenho";
import {
  MINIMO_LAUDOS, ROTULO_DIM_LAUDO, agruparLaudos, atrasado, estatLaudos, filtrarLaudos, formatarHoras, podiosMedicos,
  type DimLaudo, type GrupoLaudo, type LinhaLaudo, type NomesLaudos, type SelecaoLaudo,
} from "@/lib/laudos";
import { AvisoCarregando } from "@/components/dashboard/carregando";

type Resposta = {
  periodo: { inicio: string; fim: string };
  config: { minimoExames: number; revisao: number; retificacao: number };
  foraPeloMinimo: { exames: number; pares: number };
  semSaida?: number;
  nomes: NomesLaudos;
  linhas: LinhaLaudo[];
  atualizadoEm: string;
};

const PRESETS = [
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "90d", label: "90 dias", dias: 90 },
];

function hojeIso(deslocamento = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fmtN = (n: number) => n.toLocaleString("pt-BR");
// Porcentagem: 1 casa; abaixo de 1% até 2 casas, e "< 0,01%" para valores ainda menores (nunca "0%" quando há casos).
const fmtP = (n: number) => n > 0 && n < 0.01 ? "< 0,01%"
  : `${n.toLocaleString("pt-BR", { maximumFractionDigits: n > 0 && n < 1 ? 2 : 1 })}%`;
const dataHora = (v: string | null) => (v ? `${formatarData(v.slice(0, 10), true)} ${v.slice(11, 16)}` : "—");

type Lista = "finalizados" | "atrasados" | "pendentes" | "revisao" | "retificacao";
const LISTAS: Array<[Lista, string]> = [["finalizados", "Finalizados"], ["atrasados", "Depois do prazo"], ["pendentes", "Não finalizados"], ["revisao", "Revisões"], ["retificacao", "Retificações"]];

// Card que abre a lista de exames correspondente na tabela "Exames em detalhe".
function CardClicavel({ titulo, onClick, children }: { titulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={`Ver os exames: ${titulo}`}
      className="h-full w-full rounded-3xl text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 [&>*]:h-full">
      {children}
    </button>
  );
}

export default function LaudosPage() {
  const [preset, setPreset] = useState("30d");
  const [inicio, setInicio] = useState(hojeIso(-29));
  const [fim, setFim] = useState(hojeIso());
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<SelecaoLaudo>({});
  const [metricaMedico, setMetricaMedico] = useState<MetricaLaudo>("assinados");
  const [metricaModalidade, setMetricaModalidade] = useState<MetricaLaudo>("medianaHoras");
  const [metricaConvenio, setMetricaConvenio] = useState<MetricaLaudo>("percentualAtraso");
  const [metricaRevisao, setMetricaRevisao] = useState<MetricaLaudo>("taxaRevisao");
  const [metricaRetificacao, setMetricaRetificacao] = useState<MetricaLaudo>("taxaRetificacao");
  const [lista, setLista] = useState<Lista>("atrasados");
  const tabelaRef = useRef<HTMLDivElement>(null);
  const abrirLista = (l: Lista) => {
    setLista(l);
    requestAnimationFrame(() => tabelaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/dashboard/laudos?${new URLSearchParams({ inicio, fim })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      setDados(json);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim]);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setSel({}); }, [inicio, fim]);

  const alternar = useCallback((d: DimLaudo) => (chave: string) => setSel(s => ({ ...s, [d]: s[d] === chave ? undefined : chave })), []);

  const nomes = dados?.nomes;
  const linhas = useMemo(() => dados?.linhas ?? [], [dados]);
  const filtradas = useMemo(() => filtrarLaudos(linhas, sel), [linhas, sel]);
  const r = useMemo(() => estatLaudos(filtradas), [filtradas]);
  const grupos = useCallback((d: DimLaudo) => (nomes ? agruparLaudos(filtrarLaudos(linhas, sel, d), d, nomes) : []), [linhas, sel, nomes]);
  const porMedico = useMemo(() => grupos("medico"), [grupos]);
  const porModalidade = useMemo(() => grupos("modalidade"), [grupos]);
  const porConvenio = useMemo(() => grupos("convenio"), [grupos]);
  const tendencia = useMemo(() => {
    const mapa = new Map(grupos("data").map(g => [g.chave, g]));
    return diasDoPeriodo(inicio, fim).map(dia => {
      const g = mapa.get(dia);
      return {
        chave: dia, rotulo: formatarData(dia, true), exames: g?.exames ?? 0, assinados: g?.assinados ?? 0, pendentes: g?.pendentes ?? 0,
        revisoes: g?.revisoes ?? 0, retificacoes: g?.retificacoes ?? 0, medianaHoras: g?.medianaHoras ?? 0, percentualAtraso: g?.percentualAtraso ?? 0, comPrazo: g?.comPrazo ?? 0,
      };
    });
  }, [grupos, inicio, fim]);

  const podios = podiosMedicos(porMedico);
  const item = (g: GrupoLaudo, destaque: string, detalhe: string) => ({
    chave: g.chave, nome: g.nome, destaque, detalhe,
    dica: `${fmtN(g.assinados)} laudos finalizados, tempo típico ${formatarHoras(g.medianaHoras)}, ${g.comPrazo ? `${fmtP(g.percentualAtraso)} depois do prazo` : "sem prazo"}, ${g.revisoes} revisões e ${g.retificacoes} retificações.`,
  });
  const podioLaudos = podios.maisLaudos.map(g => item(g, `${fmtN(g.assinados)} laudos`, `típico ${formatarHoras(g.medianaHoras)}`));
  const podioRapidos = podios.maisRapidos.map(g => item(g, formatarHoras(g.medianaHoras), `${fmtN(g.assinados)} laudos`));
  const podioDesempenho = podios.desempenho.map(g => item(g, `nota ${g.nota.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}`, `${fmtN(g.exames)} laudos · ${g.atrasados + g.revisoes + g.retificacoes} falhas`));

  const chips = (Object.entries(sel) as Array<[DimLaudo, string | undefined]>).filter(([, v]) => v !== undefined).map(([d, v]) => {
    const g = grupos(d).find(x => x.chave === v);
    return { d, v: v!, nome: g?.nome ?? v! };
  });

  const comAmostra = (g: GrupoLaudo) => g.exames >= MINIMO_LAUDOS && g.chave !== "-";
  const maisAtrasa = porMedico.filter(g => comAmostra(g) && g.atrasados > 0).sort((a, b) => b.percentualAtraso - a.percentualAtraso)[0];
  const maisRevisao = porMedico.filter(g => comAmostra(g) && g.revisoes > 0).sort((a, b) => b.taxaRevisao - a.taxaRevisao)[0];
  const maisRetificacao = porMedico.filter(g => comAmostra(g) && g.retificacoes > 0).sort((a, b) => b.taxaRetificacao - a.taxaRetificacao)[0];

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6 pb-20">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><FileText size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Laudos</h1>
              <p className="text-sm text-slate-500">Quem entrega mais laudos, quem lauda mais rápido, quem atrasa e quem tem mais revisões e retificações. Clique em qualquer barra, dia ou pódio para filtrar a tela inteira.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => void carregar()} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        <section className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {PRESETS.map(p => (
              <button key={p.id} onClick={() => { setPreset(p.id); setInicio(hojeIso(-(p.dias - 1))); setFim(hojeIso()); }}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${preset === p.id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>{p.label}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
            <CalendarRange size={16} className="text-slate-400" />
            <input type="date" value={inicio} max={fim} onChange={e => { setPreset("custom"); setInicio(e.target.value); }} className="bg-transparent outline-none" />
            <span className="text-slate-400">até</span>
            <input type="date" value={fim} min={inicio} onChange={e => { setPreset("custom"); setFim(e.target.value); }} className="bg-transparent outline-none" />
          </label>
          <span className="text-xs text-slate-400">Período pela data do laudo (D. Laudo). Pendentes: pela data do exame.</span>
        </section>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        <AvisoCarregando ativo={carregando} />
        {!dados && carregando ? <div className="h-[600px] animate-pulse rounded-3xl bg-slate-200/70" /> : dados && (
          <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
              <CardClicavel titulo="laudos finalizados" onClick={() => abrirLista("finalizados")}><Kpi titulo="Laudos finalizados" valor={fmtN(r.assinados)} icone={FileText} variacao={null} detalhe={`de ${fmtN(r.exames)} exames do período`} destaque={COR.primaria} /></CardClicavel>
              <CardClicavel titulo="ainda não finalizados" onClick={() => abrirLista("pendentes")}><Kpi titulo="Ainda não finalizados" valor={fmtN(r.pendentes)} icone={FileClock} variacao={null} detalhe={r.pendentesAtrasados ? `${fmtN(r.pendentesAtrasados)} já passaram do prazo` : "nenhum fora do prazo"} destaque={COR.atencao} /></CardClicavel>
              <CardClicavel titulo="laudos finalizados e seus tempos" onClick={() => abrirLista("finalizados")}><Kpi titulo="Tempo típico de laudo" valor={r.comTempo ? formatarHoras(r.medianaHoras) : "—"} icone={Hourglass} variacao={null} detalhe={r.comTempo ? `média ${formatarHoras(r.mediaHoras)}${r.comTempo < r.assinados ? ` · ${fmtN(r.assinados - r.comTempo)} sem H. Saída` : ""}` : r.assinados ? "nenhum laudo com H. Saída" : ""} destaque={COR.secundaria} /></CardClicavel>
              <CardClicavel titulo="laudos depois do prazo" onClick={() => abrirLista("atrasados")}><Kpi titulo="Entregues no prazo" valor={r.comPrazo ? fmtP(r.percentualNoPrazo) : "—"} icone={Clock3} variacao={null} detalhe={r.comPrazo ? `${fmtN(r.atrasados)} depois do prazo` : "sem data de entrega"} destaque={corAtraso(r.percentualAtraso)} /></CardClicavel>
              <CardClicavel titulo="revisões de laudo" onClick={() => abrirLista("revisao")}><Kpi titulo="Revisões de laudo" valor={fmtN(r.revisoes)} icone={FileSearch} variacao={null} detalhe={`${fmtP(r.taxaRevisao)} dos laudos finalizados`} destaque={COR_REVISAO} /></CardClicavel>
              <CardClicavel titulo="retificações de laudo" onClick={() => abrirLista("retificacao")}><Kpi titulo="Retificações de laudo" valor={fmtN(r.retificacoes)} icone={FilePen} variacao={null} detalhe={`${fmtP(r.taxaRetificacao)} dos laudos finalizados`} destaque={COR_RETIFICACAO} /></CardClicavel>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Destaque icone={Clock3} rotulo="Médico que mais atrasa" cor={COR.critico} valor={maisAtrasa?.nome ?? "—"}
                detalhe={maisAtrasa ? `${fmtP(maisAtrasa.percentualAtraso)} depois do prazo · ${maisAtrasa.atrasados} laudos` : `nenhum com ${MINIMO_LAUDOS}+ laudos atrasados`}
                onClick={maisAtrasa ? () => alternar("medico")(maisAtrasa.chave) : undefined} />
              <Destaque icone={FileSearch} rotulo="Mais revisões" cor={COR_REVISAO} valor={maisRevisao?.nome ?? "—"}
                detalhe={maisRevisao ? `${fmtP(maisRevisao.taxaRevisao)} dos laudos · ${maisRevisao.revisoes} revisões` : "nenhuma revisão no período"}
                onClick={maisRevisao ? () => alternar("medico")(maisRevisao.chave) : undefined} />
              <Destaque icone={FilePen} rotulo="Mais retificações" cor={COR_RETIFICACAO} valor={maisRetificacao?.nome ?? "—"}
                detalhe={maisRetificacao ? `${fmtP(maisRetificacao.taxaRetificacao)} dos laudos · ${maisRetificacao.retificacoes} retificações` : "nenhuma retificação no período"}
                onClick={maisRetificacao ? () => alternar("medico")(maisRetificacao.chave) : undefined} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Painel titulo="Pódio: quem mais lauda" subtitulo="Mais laudos finalizados no período." icone={Trophy}>
                <Podio itens={podioLaudos} descricao="Pódio dos médicos que mais laudam" vazio="Nenhum laudo finalizado no período." selecionado={sel.medico} onSelecionar={alternar("medico")} />
              </Painel>
              <Painel titulo="Pódio: quem lauda mais rápido" subtitulo={`Menor tempo típico (mediana) até o laudo, com ${MINIMO_LAUDOS}+ laudos finalizados.`} icone={Zap}>
                <Podio itens={podioRapidos} descricao="Pódio dos médicos que laudam mais rápido" vazio={`Nenhum médico com ${MINIMO_LAUDOS}+ laudos finalizados.`} selecionado={sel.medico} onSelecionar={alternar("medico")} />
              </Painel>
              <Painel titulo="Pódio: melhor desempenho" subtitulo="Muitos laudos no prazo e sem revisão ou retificação: a nota é o acerto “garantido” pelo volume." icone={Award}>
                <Podio itens={podioDesempenho} descricao="Pódio dos médicos com melhor desempenho" vazio={`Nenhum médico com ${MINIMO_LAUDOS}+ laudos.`} selecionado={sel.medico} onSelecionar={alternar("medico")} />
              </Painel>
            </div>

            <Painel titulo="Laudos por dia do exame" subtitulo="Barras: finalizados e ainda não finalizados · Linha: % depois do prazo. Clique em um dia para filtrar." icone={CalendarRange}
              acao={<Legenda itens={[["Finalizados", COR.primaria], ["Não finalizados", COR.atencao], ["% depois do prazo", COR.critico]]} />}>
              <TendenciaLaudos dados={tendencia} selecionado={sel.data} onSelecionar={alternar("data")} />
            </Painel>

            <Painel titulo="Médicos" subtitulo="Laudos do médico (exame) — revisões e retificações vão para o médico do laudo corrigido." icone={Stethoscope}
              acao={<Alternador valor={metricaMedico} onChange={v => setMetricaMedico(v as MetricaLaudo)} opcoes={[["assinados", "Laudos"], ["medianaHoras", "Tempo"], ["percentualAtraso", "% atraso"]]} />}>
              <RankingLaudos grupos={porMedico} metrica={metricaMedico} selecionado={sel.medico} onSelecionar={alternar("medico")} limite={12} />
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Revisões de laudo por médico" subtitulo="Pedidos de revisão do laudo." icone={FileSearch}
                acao={<Alternador valor={metricaRevisao} onChange={v => setMetricaRevisao(v as MetricaLaudo)} opcoes={[["taxaRevisao", "% laudos"], ["revisoes", "Qtd."]]} />}>
                <RankingLaudos grupos={porMedico} metrica={metricaRevisao} selecionado={sel.medico} onSelecionar={alternar("medico")} />
              </Painel>
              <Painel titulo="Retificações de laudo por médico" subtitulo="Laudos que precisaram ser corrigidos." icone={FilePen}
                acao={<Alternador valor={metricaRetificacao} onChange={v => setMetricaRetificacao(v as MetricaLaudo)} opcoes={[["taxaRetificacao", "% laudos"], ["retificacoes", "Qtd."]]} />}>
                <RankingLaudos grupos={porMedico} metrica={metricaRetificacao} selecionado={sel.medico} onSelecionar={alternar("medico")} />
              </Painel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Modalidades" icone={Layers}
                acao={<Alternador valor={metricaModalidade} onChange={v => setMetricaModalidade(v as MetricaLaudo)} opcoes={[["assinados", "Laudos"], ["medianaHoras", "Tempo"], ["percentualAtraso", "% atraso"], ["taxaRevisao", "Revisão"], ["taxaRetificacao", "Retificação"]]} />}>
                <RankingLaudos grupos={porModalidade} metrica={metricaModalidade} selecionado={sel.modalidade} onSelecionar={alternar("modalidade")} limite={8} />
              </Painel>
              <Painel titulo="Convênios" icone={BadgeCheck}
                acao={<Alternador valor={metricaConvenio} onChange={v => setMetricaConvenio(v as MetricaLaudo)} opcoes={[["assinados", "Laudos"], ["medianaHoras", "Tempo"], ["percentualAtraso", "% atraso"], ["taxaRevisao", "Revisão"], ["taxaRetificacao", "Retificação"]]} />}>
                <RankingLaudos grupos={porConvenio} metrica={metricaConvenio} selecionado={sel.convenio} onSelecionar={alternar("convenio")} limite={8} />
              </Painel>
            </div>

            <div ref={tabelaRef} className="scroll-mt-24">
              <Painel titulo="Exames em detalhe" subtitulo="Respeita os filtros ativos. Clique nos cards do topo para abrir a lista de cada um." icone={Timer}
                acao={<Alternador valor={lista} onChange={v => setLista(v as Lista)} opcoes={LISTAS} />}>
                {nomes && <TabelaLaudos linhas={filtradas} lista={lista} nomes={nomes} />}
              </Painel>
            </div>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            <MousePointerClick size={16} className="text-blue-600" />
            {chips.map(c => (
              <button key={c.d} onClick={() => alternar(c.d)(c.v)} className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100">
                {ROTULO_DIM_LAUDO[c.d]}: {c.d === "data" ? formatarData(c.v, true) : c.nome}<X size={13} />
              </button>
            ))}
            <button onClick={() => setSel({})} className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Limpar</button>
          </div>
        </div>
      )}
    </main>
  );
}

function Destaque({ icone: Icone, rotulo, valor, detalhe, cor, onClick }: { icone: typeof Timer; rotulo: string; valor: string; detalhe: string; cor: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-md disabled:cursor-default">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}><Icone size={22} /></span>
      <span className="min-w-0">
        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{rotulo}</span>
        <span className="block truncate text-lg font-extrabold text-slate-900">{valor}</span>
        <span className="block text-xs text-slate-500">{detalhe}</span>
      </span>
    </button>
  );
}

const LIMITE_TABELA = 300;

function TabelaLaudos({ linhas, lista, nomes }: { linhas: LinhaLaudo[]; lista: Lista; nomes: NomesLaudos }) {
  const correcao = lista === "revisao" || lista === "retificacao";
  const itens = useMemo(() => {
    const sel = lista === "finalizados" ? linhas.filter(l => l.tipo === "laudo" && l.finalizado)
      : lista === "atrasados" ? linhas.filter(l => l.tipo === "laudo" && l.finalizado && atrasado(l))
      : lista === "pendentes" ? linhas.filter(l => l.tipo === "laudo" && !l.finalizado)
        : linhas.filter(l => l.tipo === lista && l.finalizado);
    return [...sel].sort((a, b) => (lista === "atrasados" ? (b.atrasoHoras ?? 0) - (a.atrasoHoras ?? 0) : b.data.localeCompare(a.data)));
  }, [linhas, lista]);

  const medico = (id: number | null) => (id === null ? "—" : nomes.medicos[id] ?? `Médico ${id}`);
  const paciente = (l: LinhaLaudo) => (l.cdPaciente === null ? "—" : nomes.pacientes[l.cdPaciente] ?? `ID ${l.cdPaciente}`);
  const procedimento = (l: LinhaLaudo) => (l.cdProcedimento === null ? "—" : nomes.procedimentos[l.cdProcedimento] ?? String(l.cdProcedimento));
  const modalidade = (l: LinhaLaudo) => (l.cdModalidade === null ? "—" : nomes.modalidades[l.cdModalidade] ?? String(l.cdModalidade));
  const convenio = (l: LinhaLaudo) => (l.cdConvenio === null ? "—" : nomes.convenios[l.cdConvenio] ?? String(l.cdConvenio));
  const atribuicao = (l: LinhaLaudo) => (l.atribuidoPor === "laudo_anterior" ? `laudo do exame ${l.cdExameOrigem}` : "sem laudo anterior: médico do próprio exame");

  function exportar() {
    const cab = ["Nº atendimento", "Exame", "Paciente", "Data do exame", "Procedimento", "Modalidade", "Convênio", correcao ? "Médico do laudo corrigido" : "Médico", ...(correcao ? ["Médico do exame", "Atribuição"] : []), "Prazo", "Laudo", "Tempo de laudo (h)", "Atraso (h)"];
    const corpo = itens.map(l => [l.cdAtendimento, l.id, paciente(l), l.data, procedimento(l), modalidade(l), convenio(l), medico(l.cdMedico), ...(correcao ? [medico(l.cdMedicoExame), atribuicao(l)] : []), l.prazo ? `${l.prazo}${l.prazoRecalculado ? " (recalculado)" : ""}` : "", l.assinado ?? "", l.horas ?? "", l.atrasoHoras ?? ""]);
    const csv = [cab, ...corpo].map(linha => linha.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `laudos-${lista}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (!itens.length) return <p className="py-10 text-center text-sm text-slate-400">Nenhum exame nesta lista.</p>;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span>{fmtN(itens.length)} exames{itens.length > LIMITE_TABELA ? ` · mostrando os ${LIMITE_TABELA} primeiros (o CSV tem todos)` : ""}</span>
        <button onClick={exportar} className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50"><Download size={15} />CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="rounded-l-xl bg-slate-50 px-3 py-2">Atend. / exame</th><th className="bg-slate-50 px-3 py-2">Paciente</th><th className="bg-slate-50 px-3 py-2">Procedimento</th>
              <th className="bg-slate-50 px-3 py-2">{correcao ? "Médico do laudo corrigido" : "Médico"}</th><th className="bg-slate-50 px-3 py-2">Convênio</th>
              <th className="bg-slate-50 px-3 py-2">Prazo → laudo</th><th className="rounded-r-xl bg-slate-50 px-3 py-2 text-right">{lista === "atrasados" || lista === "pendentes" ? "Atraso" : "Tempo"}</th>
            </tr>
          </thead>
          <tbody>
            {itens.slice(0, LIMITE_TABELA).map(l => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums"><b className="text-slate-900">{l.cdAtendimento}</b><span className="block text-xs text-slate-400">exame {l.id} · {formatarData(l.dataExame ?? l.data, true)}</span></td>
                <td className="px-3 py-2.5 font-semibold text-slate-900">{paciente(l)}</td>
                <td className="px-3 py-2.5">{procedimento(l)}<span className="block text-xs text-slate-400">{modalidade(l)}</span></td>
                <td className="px-3 py-2.5">{medico(l.cdMedico)}{correcao && <span className="block text-xs text-slate-400">{l.cdMedicoExame !== l.cdMedico ? `exame feito por ${medico(l.cdMedicoExame)} · ` : ""}{atribuicao(l)}</span>}</td>
                <td className="px-3 py-2.5">{convenio(l)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">{dataHora(l.prazo)}{l.prazoRecalculado && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800" title="A data de entrega do Clinux era anterior ao atendimento (exame transferido de data). Prazo recalculado pelos dias de entrega do procedimento/modalidade.">recalc.</span>} → <b className="text-slate-900">{l.assinado ? dataHora(l.assinado) : l.finalizado ? "sem data" : "não finalizado"}</b></td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                  {lista === "atrasados" || lista === "pendentes"
                    ? (l.atrasoHoras ?? 0) > 0 ? <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: COR.critico }}>{formatarHoras(l.atrasoHoras ?? 0)}</span> : <span className="text-xs text-slate-400">no prazo</span>
                    : l.horas !== null ? formatarHoras(l.horas) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
