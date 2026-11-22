"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BadgeCheck, CalendarCheck, CalendarRange, Clock3, Download, FileText, Hourglass, Layers,
  MousePointerClick, RefreshCw, AlarmClock, Search, Stethoscope, Target, Timer, Trophy, UserCog, UserRoundCheck, X, Activity,
} from "lucide-react";
import { COR, Kpi, Painel, corPorMeta, formatarData, formatarMinutos } from "@/components/dashboard/wait-charts";
import { AtrasosPacientes } from "@/components/dashboard/atrasos-pacientes";
import { Podio } from "@/components/dashboard/podio";
import { ComposicaoTempo, DispersaoFuncionarios, FichaPorHora, RankingBarras, type MetricaRanking } from "@/components/dashboard/desempenho-charts";
import {
  MINIMO_AMOSTRA, MINIMO_PODIO, ROTULO_DIMENSAO, agrupar, maisRapidos, diasDoPeriodo, estatisticas, filtrar, nome as nomeDimensao,
  type Dimensao, type LinhaDesempenho, type Selecao,
} from "@/lib/desempenho";
import { AvisoCarregando } from "@/components/dashboard/carregando";

// Agendamento não tem ficha: a aba saiu (o backend ainda aceita setor=agendamento).
type Setor = "atendimento" | "pacientes";
type Resposta = { setor: Exclude<Setor, "pacientes">; periodo: { inicio: string; fim: string }; foraDaAnalise: number; linhas: LinhaDesempenho[]; atualizadoEm: string };

const SETORES: Array<{ id: Setor; nome: string; descricao: string; icone: typeof UserRoundCheck }> = [
  { id: "atendimento", nome: "Ficha de atendimento", descricao: "Da chamada no guichê até a ficha concluída", icone: UserRoundCheck },
  { id: "pacientes", nome: "Atraso dos pacientes", descricao: "Chegada prevista × H. Entrada", icone: AlarmClock },
];

const PRESETS = [
  { id: "hoje", label: "Hoje", dias: 1 },
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "90d", label: "90 dias", dias: 90 },
] as const;

function hojeIso(deslocamento = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DesempenhoPage() {
  const [setor, setSetor] = useState<Setor>("atendimento");
  const [preset, setPreset] = useState<string>("30d");
  const [inicio, setInicio] = useState(hojeIso(-29));
  const [fim, setFim] = useState(hojeIso());
  const [meta, setMeta] = useState(10);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<Selecao>({});
  const [visaoFuncionarios, setVisaoFuncionarios] = useState<"ranking" | "dispersao">("ranking");
  const [metricaMedico, setMetricaMedico] = useState<MetricaRanking>("minutosAtraso");
  const [metricaConvenio, setMetricaConvenio] = useState<MetricaRanking>("mediaFicha");
  const [verFichas, setVerFichas] = useState(false);
  const fecharFichas = useCallback(() => setVerFichas(false), []);
  const [recarregarAtrasos, setRecarregarAtrasos] = useState(0);
  const atrasos = setor === "pacientes";

  const carregar = useCallback(async () => {
    if (setor === "pacientes") { setCarregando(false); return; }
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ inicio, fim, setor });
      const res = await fetch(`/api/backend/clinux/dashboard/desempenho?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      setDados(json);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, setor]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setSel({}); setVerFichas(false); }, [setor, inicio, fim]);

  // Clicar de novo no mesmo item remove o filtro.
  const alternar = useCallback((d: Dimensao) => (chave: string) => setSel(s => ({ ...s, [d]: s[d] === chave ? undefined : chave })), []);

  const linhas = useMemo(() => dados?.linhas ?? [], [dados]);
  const filtradas = useMemo(() => filtrar(linhas, sel), [linhas, sel]);
  const r = useMemo(() => estatisticas(filtradas, meta), [filtradas, meta]);
  // Cada gráfico ignora o próprio filtro: a barra escolhida fica destacada e as demais continuam visíveis.
  const grupos = useCallback((d: Dimensao) => agrupar(filtrar(linhas, sel, d), d, meta), [linhas, sel, meta]);
  const porConvenio = useMemo(() => grupos("convenio"), [grupos]);
  const porFuncionario = useMemo(() => grupos("funcionario"), [grupos]);
  const porMedico = useMemo(() => grupos("medico"), [grupos]);
  const porModalidade = useMemo(() => grupos("modalidade"), [grupos]);
  const porHora = useMemo(() => grupos("hora"), [grupos]);
  const composicao = useMemo(() => {
    const mapa = new Map(grupos("data").map(g => [g.chave, g]));
    return diasDoPeriodo(inicio, fim).map(dia => {
      const g = mapa.get(dia);
      return { chave: dia, rotulo: formatarData(dia, true), espera: g?.mediaEspera ?? 0, ficha: g?.mediaFicha ?? 0, total: g?.total ?? 0 };
    });
  }, [grupos, inicio, fim]);

  const chips = (Object.entries(sel) as Array<[Dimensao, string | undefined]>).filter(([, v]) => v !== undefined).map(([d, v]) => {
    const exemplo = linhas.find(l => filtrar([l], { [d]: v }).length);
    return { d, v: v!, nome: exemplo ? nomeDimensao(exemplo, d) : v! };
  });

  const atendimento = setor === "atendimento";
  const piorConvenio = [...porConvenio].filter(g => g.total >= MINIMO_AMOSTRA).sort((a, b) => b.mediaFicha - a.mediaFicha)[0];
  const podioRapidos = maisRapidos(porFuncionario).map(g => ({
    chave: g.chave, nome: g.nome, destaque: `${formatarMinutos(g.medianaFicha)} por ficha`, detalhe: `${g.total.toLocaleString("pt-BR")} fichas · média ${formatarMinutos(g.mediaFicha)}`,
    dica: `ficha típica (mediana) de ${formatarMinutos(g.medianaFicha)}, média ${formatarMinutos(g.mediaFicha)}, em ${g.total.toLocaleString("pt-BR")} fichas.`,
  }));
  const piorFuncionario = [...porFuncionario].filter(g => g.total >= MINIMO_AMOSTRA).sort((a, b) => b.mediaFicha - a.mediaFicha)[0];
  const medicoMaisPrejudicado = [...porMedico].sort((a, b) => b.minutosAtraso - a.minutosAtraso)[0];

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><Activity size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Desempenho da recepção</h1>
              <p className="text-sm text-slate-500">Tempo de ficha por convênio, funcionário e médico. Clique em qualquer barra, ponto ou dia para filtrar a tela inteira.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && !atrasos && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => (atrasos ? setRecarregarAtrasos(n => n + 1) : void carregar())} disabled={carregando && !atrasos} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        <nav className="grid gap-3 md:grid-cols-2" aria-label="Setor">
          {SETORES.map(({ id, nome, descricao, icone: Icone }) => {
            const ativo = setor === id;
            return (
              <button key={id} onClick={() => setSetor(id)} aria-pressed={ativo}
                className={`flex items-center gap-4 rounded-3xl border p-4 text-left transition ${ativo ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:shadow-md"}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ativo ? "bg-white/20" : "system-icon"}`}><Icone size={24} /></span>
                <span>
                  <span className="block text-lg font-extrabold">{nome}</span>
                  <span className={`block text-sm ${ativo ? "text-white/80" : "text-slate-500"}`}>{descricao}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>
          {!atrasos && <label className="flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 px-3 text-sm xl:self-auto">
            <Target size={16} className="text-slate-400" />Meta de ficha
            <input type="number" min={1} max={120} value={meta} onChange={e => setMeta(Math.min(120, Math.max(1, Number(e.target.value) || 1)))} className="w-12 bg-transparent text-right font-bold outline-none" />
            min
          </label>}
        </section>

        {atrasos ? <AtrasosPacientes inicio={inicio} fim={fim} recarregar={recarregarAtrasos} /> : (
          <>
        {/* Filtros ativos vindos dos cliques */}
        <div className="flex min-h-10 flex-wrap items-center gap-2">
          {chips.length ? (
            <>
              <span className="text-sm font-semibold text-slate-500">Filtrando por:</span>
              {chips.map(c => (
                <button key={c.d} onClick={() => alternar(c.d)(c.v)} className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-1.5 pl-3 pr-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  <span className="text-blue-500">{ROTULO_DIMENSAO[c.d]}:</span>{c.nome}<X size={14} />
                </button>
              ))}
              <button onClick={() => setSel({})} className="text-sm font-bold text-slate-500 hover:text-slate-900 hover:underline">Limpar tudo</button>
            </>
          ) : (
            <span className="flex items-center gap-2 text-sm text-slate-400"><MousePointerClick size={16} />Dica: clique em um convênio, funcionário, médico, dia ou horário para ver só aqueles dados.</span>
          )}
        </div>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        <AvisoCarregando ativo={carregando && !atrasos} />
        {!dados && carregando ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
        ) : dados && (
          <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Kpi titulo="Tempo médio de ficha" valor={formatarMinutos(r.mediaFicha)} icone={Timer} variacao={null} detalhe={`mediana ${formatarMinutos(r.medianaFicha)}`} destaque={corPorMeta(r.mediaFicha, meta)} />
              <Kpi titulo="9 em cada 10 fichas em até" valor={formatarMinutos(r.p90Ficha)} icone={Clock3} variacao={null} detalhe={`${r.percentualMeta.toLocaleString("pt-BR")}% dentro da meta`} destaque={COR.secundaria} />
              <Kpi titulo="Espera até ser chamado" valor={formatarMinutos(r.mediaEspera)} icone={Hourglass} variacao={null} detalhe={`total ${formatarMinutos(r.mediaTotal)} com a ficha`} destaque={COR.atencao} />
              <Kpi titulo={atendimento ? "Fichas de exame" : "Agendamentos"} valor={r.total.toLocaleString("pt-BR")} icone={FileText} variacao={null}
                detalhe={atendimento ? (dados.foraDaAnalise ? `${dados.foraDaAnalise} senhas sem ficha encontrada` : "todas as senhas com ficha") : `${r.exames.toLocaleString("pt-BR")} exames marcados`} destaque={COR.texto} />
              {atendimento ? (
                <Kpi titulo="Entraram atrasados na sala" valor={`${r.atrasados.toLocaleString("pt-BR")}`} icone={AlertTriangle} variacao={null}
                  detalhe={`${r.percentualAtrasados.toLocaleString("pt-BR")}% de quem chegou no horário · ${formatarMinutos(r.minutosAtraso)} perdidos`} destaque={COR.critico} />
              ) : (
                <Kpi titulo="Exames por agendamento" valor={r.total ? (r.exames / r.total).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) : "0"} icone={CalendarCheck} variacao={null}
                  detalhe={dados.foraDaAnalise ? `${dados.foraDaAnalise} senhas sem marcação encontrada` : "média por paciente"} destaque={COR.ok} />
              )}
            </div>

            {/* Destaques automáticos */}
            <div className="grid gap-3 md:grid-cols-3">
              <Destaque icone={BadgeCheck} rotulo="Convênio mais demorado" valor={piorConvenio?.nome ?? "—"} detalhe={piorConvenio ? `ficha média ${formatarMinutos(piorConvenio.mediaFicha)} · ${piorConvenio.total} fichas` : `nenhum com ${MINIMO_AMOSTRA}+ fichas`} cor={COR.atencao}
                onClick={piorConvenio ? () => alternar("convenio")(piorConvenio.chave) : undefined} />
              <Destaque icone={UserCog} rotulo="Funcionário mais demorado" valor={piorFuncionario?.nome ?? "—"} detalhe={piorFuncionario ? `ficha média ${formatarMinutos(piorFuncionario.mediaFicha)} · ${piorFuncionario.total} fichas` : `nenhum com ${MINIMO_AMOSTRA}+ fichas`} cor={COR.critico}
                onClick={piorFuncionario ? () => alternar("funcionario")(piorFuncionario.chave) : undefined} />
              {atendimento ? (
                <Destaque icone={Stethoscope} rotulo="Médico mais prejudicado" valor={medicoMaisPrejudicado?.minutosAtraso ? medicoMaisPrejudicado.nome : "Nenhum"} detalhe={medicoMaisPrejudicado?.minutosAtraso ? `${medicoMaisPrejudicado.atrasados} pacientes atrasados · ${formatarMinutos(medicoMaisPrejudicado.minutosAtraso)}` : "sem atrasos causados pela ficha"} cor={COR.secundaria}
                  onClick={medicoMaisPrejudicado?.minutosAtraso ? () => alternar("medico")(medicoMaisPrejudicado.chave) : undefined} />
              ) : (
                <Destaque icone={Layers} rotulo="Modalidade mais demorada" valor={[...porModalidade].sort((a, b) => b.mediaFicha - a.mediaFicha)[0]?.nome ?? "—"} detalhe="tempo médio de marcação" cor={COR.secundaria} />
              )}
            </div>

            <Painel titulo="Para onde vai o tempo do paciente" subtitulo="Por dia: espera até ser chamado (laranja) + tempo de ficha (azul). Clique em um dia para filtrar." icone={CalendarRange}
              acao={<Legenda itens={[["Espera", COR.atencao], ["Ficha", COR.primaria]]} />}>
              <ComposicaoTempo dados={composicao} selecionado={sel.data} onSelecionar={alternar("data")} />
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Pódio: quem faz a ficha mais rápido" subtitulo={`Menor tempo típico de ficha (mediana), com pelo menos ${MINIMO_PODIO} fichas. Clique para filtrar.`} icone={Trophy}>
                <Podio itens={podioRapidos} descricao="Pódio dos funcionários mais rápidos na ficha" selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />
              </Painel>
              <Painel titulo="Funcionários" subtitulo={atendimento ? "Quem demora mais para fazer a ficha (cd_funcionario_recepcao)" : "Quem demora mais para marcar (cd_funcionario_marcacao)"} icone={UserCog}
                acao={<Alternador valor={visaoFuncionarios} onChange={v => setVisaoFuncionarios(v as "ranking" | "dispersao")} opcoes={[["ranking", "Ranking"], ["dispersao", "Volume x tempo"]]} />}>
                {visaoFuncionarios === "ranking"
                  ? <RankingBarras grupos={porFuncionario} metrica="mediaFicha" meta={meta} selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />
                  : <DispersaoFuncionarios grupos={porFuncionario} meta={meta} selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />}
              </Painel>
            </div>

            {atendimento && (
              <Painel titulo="Médicos prejudicados" icone={Stethoscope}
                subtitulo={metricaMedico === "minutosAtraso" || metricaMedico === "percentualAtrasados"
                  ? "Pacientes que chegaram até o horário marcado, mas a ficha terminou depois dele — o exame começa atrasado por causa da recepção."
                  : "Tempo médio que os pacientes de cada médico gastam entre a senha e a ficha concluída."}
                acao={<Alternador valor={metricaMedico} onChange={v => setMetricaMedico(v as MetricaRanking)} opcoes={[["minutosAtraso", "Atraso causado"], ["percentualAtrasados", "% atrasados"], ["mediaTotal", "Tempo total"]]} />}>
                <RankingBarras grupos={porMedico} metrica={metricaMedico} meta={meta} selecionado={sel.medico} onSelecionar={alternar("medico")} limite={12} rotuloVolume="exames" />
              </Painel>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Convênios" subtitulo="Quais convênios demoram mais para concluir a ficha" icone={BadgeCheck}
                acao={<Alternador valor={metricaConvenio} onChange={v => setMetricaConvenio(v as MetricaRanking)} opcoes={[["mediaFicha", "Ficha"], ["mediaTotal", "Total"]]} />}>
                <RankingBarras grupos={porConvenio} metrica={metricaConvenio} meta={meta} selecionado={sel.convenio} onSelecionar={alternar("convenio")} />
              </Painel>
              <Painel titulo="Modalidades" subtitulo="Tempo médio de ficha por modalidade do exame" icone={Layers}>
                <RankingBarras grupos={porModalidade} metrica="mediaFicha" meta={meta} selecionado={sel.modalidade} onSelecionar={alternar("modalidade")} limite={8} />
              </Painel>
            </div>

            <div className="grid gap-6">
              <Painel titulo="Ficha por horário da chamada" subtitulo="Barras: volume · Linha: tempo médio de ficha. Clique para filtrar o horário." icone={Clock3}
                acao={<Legenda itens={[["Fichas", COR.primaria], ["Ficha média", COR.secundaria]]} />}>
                <FichaPorHora grupos={porHora} meta={meta} selecionado={sel.hora} onSelecionar={alternar("hora")} />
              </Painel>
            </div>

            <TabelaDetalhe linhas={filtradas} meta={meta} atendimento={atendimento} />
          </div>
        )}
          </>
        )}
      </div>

      {/* Atalho para ver os atendimentos do que foi clicado */}
      {!atrasos && chips.length > 0 && dados && !verFichas && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            <span className="min-w-0 truncate text-sm text-slate-600">
              <b className="text-slate-900">{chips.map(c => c.nome).join(" · ")}</b> · {filtradas.length} {filtradas.length === 1 ? "ficha" : "fichas"}
            </span>
            <button onClick={() => setVerFichas(true)} disabled={!filtradas.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50">
              <FileText size={16} />Ver atendimentos
            </button>
            <button onClick={() => setSel({})} aria-label="Limpar filtros" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
      )}
      {verFichas && <FichasModal titulo={chips.map(c => c.nome).join(" · ") || "Todas as fichas"} linhas={filtradas} meta={meta} atendimento={atendimento} onFechar={fecharFichas} />}
    </main>
  );
}

function Alternador({ valor, onChange, opcoes }: { valor: string; onChange: (v: string) => void; opcoes: Array<[string, string]> }) {
  return (
    <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
      {opcoes.map(([id, rotulo]) => (
        <button key={id} onClick={() => onChange(id)} className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${valor === id ? "bg-white text-slate-900 shadow" : "text-slate-500 hover:text-slate-900"}`}>{rotulo}</button>
      ))}
    </div>
  );
}

function Legenda({ itens }: { itens: Array<[string, string]> }) {
  return (
    <div className="hidden flex-wrap justify-end gap-3 text-xs font-semibold text-slate-500 sm:flex">
      {itens.map(([rotulo, cor]) => <span key={rotulo} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo}</span>)}
    </div>
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

function TabelaDetalhe({ linhas, meta, atendimento }: { linhas: LinhaDesempenho[]; meta: number; atendimento: boolean }) {
  return (
    <Painel titulo="Fichas em detalhe" subtitulo={`${linhas.length.toLocaleString("pt-BR")} fichas com os filtros atuais, da mais demorada para a mais rápida`} icone={FileText}>
      <ConteudoFichas linhas={linhas} meta={meta} atendimento={atendimento} />
    </Painel>
  );
}

// Janela com as fichas do que foi clicado (ex.: um convênio), para localizar e corrigir no Clinux.
function FichasModal({ titulo, linhas, meta, atendimento, onFechar }: { titulo: string; linhas: LinhaDesempenho[]; meta: number; atendimento: boolean; onFechar: () => void }) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", fechar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = overflow; };
  }, [onFechar]);
  const r = estatisticas(linhas, meta);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="fichas-modal-titulo" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{atendimento ? "Fichas de atendimento" : "Agendamentos"}</p>
            <h2 id="fichas-modal-titulo" className="truncate text-2xl font-extrabold text-slate-900">{titulo}</h2>
            <p className="text-sm text-slate-500">
              {r.total} {r.total === 1 ? "ficha" : "fichas"} · ficha média {formatarMinutos(r.mediaFicha)} · espera média {formatarMinutos(r.mediaEspera)}
              {atendimento && r.comHorario > 0 && <> · <b className="text-red-600">{r.atrasados} de {r.comHorario} entraram atrasados</b></>}
            </p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5 md:p-6">
          <ConteudoFichas linhas={linhas} meta={meta} atendimento={atendimento} />
        </div>
      </div>
    </div>
  );
}

function ConteudoFichas({ linhas, meta, atendimento }: { linhas: LinhaDesempenho[]; meta: number; atendimento: boolean }) {
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(50);
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo ? linhas.filter(l => [l.paciente, l.cdPaciente, l.cdAtendimento, l.funcionario, l.convenio, l.medico, l.modalidade].join(" ").toLowerCase().includes(termo)) : linhas;
    return [...base].sort((a, b) => b.ficha - a.ficha);
  }, [linhas, busca]);

  function exportarCsv() {
    const cab = ["Nº atendimento", "Paciente", "ID paciente", "Data", "Senha", "Chamada", atendimento ? "Ficha concluída" : "Marcação gravada", "Espera (min)", "Ficha (min)", "Funcionário", "Convênio", ...(atendimento ? ["Médico", "Horário marcado", "Atraso (min)", "Chegou no horário"] : ["Exames marcados"]), "Modalidade"];
    const corpo = lista.map(l => [l.cdAtendimento, l.paciente ?? "", l.cdPaciente ?? "", formatarData(l.data), l.horaSenha, l.horaChamada, l.horaFim, l.espera, l.ficha, l.funcionario ?? "", l.convenio ?? "",
      ...(atendimento ? [l.medico ?? "", l.horaMarcada ?? "", l.atraso ?? "", l.chegouNoHorario === null ? "" : l.chegouNoHorario ? "Sim" : "Não"] : [l.exames]), l.modalidade]);
    // Só medidas com casas decimais usam vírgula; códigos (atendimento, paciente) ficam como estão.
    const csv = [cab, ...corpo].map(linha => linha.map(v => `"${(typeof v === "number" && !Number.isInteger(v) ? String(v).replace(".", ",") : String(v)).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `desempenho-${atendimento ? "atendimento" : "agendamento"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nº atendimento, paciente, funcionário, convênio…" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <button onClick={exportarCsv} disabled={!lista.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={15} />Exportar CSV</button>
      </div>
      {lista.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="rounded-l-xl px-3 py-2">Nº atend.</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Data</th><th className="px-3 py-2">Senha → chamada → {atendimento ? "ficha" : "marcação"}</th>
                <th className="px-3 py-2">Funcionário</th><th className="px-3 py-2">Convênio</th>{atendimento && <th className="px-3 py-2">Médico</th>}
                <th className="px-3 py-2 text-right">Ficha</th>{atendimento && <th className="rounded-r-xl px-3 py-2 text-right">Atraso no exame</th>}
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, limite).map(l => (
                <tr key={l.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <button type="button" title="Copiar nº do atendimento" onClick={() => void navigator.clipboard?.writeText(String(l.cdAtendimento))}
                      className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 transition hover:bg-blue-100 hover:text-blue-700">{l.cdAtendimento}</button>
                  </td>
                  <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{l.paciente ?? "Sem cadastro"}</span>{l.cdPaciente !== null && <span className="block text-xs text-slate-400">ID {l.cdPaciente} · {l.modalidade}</span>}</td>
                  <td className="px-3 py-2.5 tabular-nums">{formatarData(l.data)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-600">{l.horaSenha} → {l.horaChamada} → <b className="text-slate-900">{l.horaFim}</b>{!atendimento && l.exames > 1 && <span className="ml-1 text-xs text-slate-400">({l.exames} exames)</span>}</td>
                  <td className="px-3 py-2.5">{l.funcionario ?? "Não informado"}</td>
                  <td className="px-3 py-2.5">{l.convenio ?? "Sem convênio"}</td>
                  {atendimento && <td className="px-3 py-2.5">{l.medico ?? "—"}</td>}
                  <td className="whitespace-nowrap px-3 py-2.5 text-right"><span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums text-white" style={{ background: corPorMeta(l.ficha, meta) }}>{formatarMinutos(l.ficha)}</span></td>
                  {atendimento && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs">
                      {l.atraso === null ? <span className="text-slate-400">sem horário</span>
                        : l.atraso <= 0 ? <span className="font-semibold text-emerald-600">no horário ({l.horaMarcada})</span>
                        : l.chegouNoHorario ? <span className="font-bold text-red-600">+{formatarMinutos(l.atraso)} (marcado {l.horaMarcada})</span>
                        : <span className="text-slate-500">+{formatarMinutos(l.atraso)} · paciente chegou atrasado</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {lista.length > limite && <button onClick={() => setLimite(n => n + 100)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Mostrar mais ({(lista.length - limite).toLocaleString("pt-BR")} restantes)</button>}
        </div>
      ) : <p className="py-8 text-center text-sm text-slate-400">Nenhuma ficha com os filtros atuais.</p>}
    </div>
  );
}
