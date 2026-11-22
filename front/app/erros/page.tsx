"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Award, BadgeCheck, CalendarRange, Flame, Target, Trophy, Users, ClipboardList, Download, FileWarning, Info, Layers, ListChecks,
  MousePointerClick, PenLine, RefreshCw, Search, ShieldAlert, Stethoscope, Timer, UserCog, UserRound, X,
} from "lucide-react";
import { COR, Kpi, Painel, formatarData, formatarMinutos } from "@/components/dashboard/wait-charts";
import { COR_FICHAS, COR_ORIGEM, META_PADRAO, MapaCalorErros, RankingErros, TendenciaErros, corTaxa, type MetricaErro } from "@/components/dashboard/erros-charts";
import { DivergentesModal, type FichaDivergente } from "@/components/dashboard/divergentes-modal";
import { Podio } from "@/components/dashboard/podio";
import { diasDoPeriodo } from "@/lib/desempenho";
import {
  MINIMO_FICHAS, ROTULO_DIM, ROTULO_ORIGEM, agruparErros, consolidarErros, filtrarErros, mapaCalorErros, podiosFuncionarios, resumirErros,
  type Alteracao, type AtendimentoErro, type Colocado, type DimensaoErro, type Erro, type OrigemErro, type SelecaoErro,
} from "@/lib/erros";
import { AvisoCarregando } from "@/components/dashboard/carregando";

type Resposta = {
  periodo: { inicio: string; fim: string };
  janelaDias: number;
  diagnostico: { fichas: number; elegiveis: number; outroFuncionario: number; edicoesPacienteForaDoUniverso: number; semLogDaSenha?: number };
  atendimentos: AtendimentoErro[];
  alteracoes: Alteracao[];
  divergentes?: FichaDivergente[];
  atualizadoEm: string;
};

const PRESETS = [
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "90d", label: "90 dias", dias: 90 },
] as const;

const ORIGENS: Array<{ id: OrigemErro; icone: typeof Stethoscope; descricao: string }> = [
  { id: "exame", icone: ClipboardList, descricao: "Plano, procedimento, guia, autorização…" },
  { id: "atendimento", icone: Stethoscope, descricao: "Data, hora, médico, paciente" },
  { id: "paciente", icone: UserRound, descricao: "Nome, documentos, contato, endereço" },
];

function deslocarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

function hojeIso(deslocamento = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tempoDepois(min: number) {
  if (min < 1440) return formatarMinutos(Math.round(min));
  const dias = Math.round(min / 1440);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
}

function valorCampo(v: string | null) {
  if (v === null || v.trim() === "") return "(vazio)";
  const t = v.trim().toLowerCase();
  if (t === "true" || t === "t") return "Sim";
  if (t === "false" || t === "f") return "Não";
  return v;
}

function dataHora(iso: string) {
  const [d, h] = iso.split("T");
  return `${formatarData(d)} ${h?.slice(0, 5) ?? ""}`;
}

export default function ErrosPage() {
  const [preset, setPreset] = useState<string>("30d");
  const [inicio, setInicio] = useState(hojeIso(-29));
  const [fim, setFim] = useState(hojeIso());
  const [tolerancia, setTolerancia] = useState(2);
  const [incluirPreenchimentos, setIncluirPreenchimentos] = useState(true);
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sel, setSel] = useState<SelecaoErro>({});
  const [metricaFuncionario, setMetricaFuncionario] = useState<MetricaErro>("taxa");
  const [metricaConvenio, setMetricaConvenio] = useState<MetricaErro>("taxa");
  const [metricaCalor, setMetricaCalor] = useState<MetricaErro>("taxa");
  const [verErros, setVerErros] = useState(false);
  const fecharErros = useCallback(() => setVerErros(false), []);
  const [verDivergentes, setVerDivergentes] = useState(false);
  const fecharDivergentes = useCallback(() => setVerDivergentes(false), []);

  // Meta: % máxima aceitável de fichas com erro (lembrada neste navegador).
  const [meta, setMetaEstado] = useState(META_PADRAO);
  useEffect(() => { try { const v = Number(localStorage.getItem("erros-meta")); if (v > 0 && v <= 100) setMetaEstado(v); } catch { /* sem armazenamento */ } }, []);
  const setMeta = (v: number) => { setMetaEstado(v); try { localStorage.setItem("erros-meta", String(v)); } catch { /* sem armazenamento */ } };

  // Período anterior com a mesma duração, para comparar os indicadores. Carrega depois, sem travar a tela.
  const periodoAnterior = useMemo(() => {
    const dias = diasDoPeriodo(inicio, fim).length;
    return { inicio: deslocarDias(inicio, -dias), fim: deslocarDias(inicio, -1) };
  }, [inicio, fim]);
  const [anterior, setAnterior] = useState<Resposta | null>(null);

  const [buscandoAnterior, setBuscandoAnterior] = useState(false);
  const pedido = useRef(0);

  const carregar = useCallback(async (forcar = false) => {
    const meu = ++pedido.current; // resposta de um período antigo (troca rápida de datas) é descartada
    setCarregando(true);
    setAnterior(null);
    const extra: Record<string, string> = forcar ? { atualizar: "1" } : {};
    try {
      const res = await fetch(`/api/backend/clinux/dashboard/erros?${new URLSearchParams({ inicio, fim, ...extra })}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      if (meu !== pedido.current) return;
      setDados(json);
      setErro("");
    } catch (e) {
      if (meu === pedido.current) setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
      return;
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
    setBuscandoAnterior(true);
    try {
      const res = await fetch(`/api/backend/clinux/dashboard/erros?${new URLSearchParams({ ...periodoAnterior, ...extra })}`, { cache: "no-store" });
      if (res.ok && meu === pedido.current) setAnterior(await res.json());
    } catch { /* sem comparação */ } finally {
      if (meu === pedido.current) setBuscandoAnterior(false);
    }
  }, [inicio, fim, periodoAnterior]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setSel({}); setVerErros(false); setVerDivergentes(false); }, [inicio, fim]);

  const alternar = useCallback((d: DimensaoErro) => (chave: string) => setSel(s => ({ ...s, [d]: s[d] === chave ? undefined : chave })), []);

  const base = useMemo(() => ({
    atendimentos: dados?.atendimentos ?? [],
    erros: consolidarErros(dados?.alteracoes ?? [], { toleranciaMin: tolerancia, incluirPreenchimentos }),
  }), [dados, tolerancia, incluirPreenchimentos]);
  const filtrado = useMemo(() => filtrarErros(base, sel), [base, sel]);
  const r = useMemo(() => resumirErros(filtrado), [filtrado]);
  // Mesmos filtros e regras (tolerância, preenchimentos) aplicados ao período anterior.
  const rAnterior = useMemo(() => {
    if (!anterior) return null;
    const baseAnt = { atendimentos: anterior.atendimentos, erros: consolidarErros(anterior.alteracoes, { toleranciaMin: tolerancia, incluirPreenchimentos }) };
    return resumirErros(filtrarErros(baseAnt, sel));
  }, [anterior, tolerancia, incluirPreenchimentos, sel]);
  const variacaoPct = (atual: number, antes?: number) => (rAnterior && antes ? Math.round(((atual - antes) / antes) * 1000) / 10 : null);
  const comparacao = rAnterior ? `vs ${formatarData(periodoAnterior.inicio, true)} a ${formatarData(periodoAnterior.fim, true)}` : buscandoAnterior ? "carregando comparação…" : "";
  const grupos = useCallback((d: DimensaoErro) => agruparErros(filtrarErros(base, sel, d), d), [base, sel]);
  const porFuncionario = useMemo(() => grupos("funcionario"), [grupos]);
  const porConvenio = useMemo(() => grupos("convenio"), [grupos]);
  const porModalidade = useMemo(() => grupos("modalidade"), [grupos]);
  const porCampo = useMemo(() => grupos("campo"), [grupos]);
  const porOrigem = useMemo(() => new Map(grupos("origem").map(g => [g.chave, g])), [grupos]);
  const tendencia = useMemo(() => {
    const mapa = new Map(grupos("data").map(g => [g.chave, g]));
    return diasDoPeriodo(inicio, fim).map(dia => {
      const g = mapa.get(dia);
      return { chave: dia, rotulo: formatarData(dia, true), analisados: g?.analisados ?? 0, comErro: g?.comErro ?? 0, erros: g?.erros ?? 0, taxa: g?.taxa ?? 0 };
    });
  }, [grupos, inicio, fim]);

  // O mapa ignora o próprio filtro (dia da semana + hora) para continuar mostrando a semana inteira.
  const calor = useMemo(() => mapaCalorErros(filtrarErros(base, sel, ["diaSemana", "hora"])), [base, sel]);
  const selecionarCelula = useCallback((dia: number, hora: number) => {
    const d = String(dia), h = String(hora).padStart(2, "0");
    setSel(s => (s.diaSemana === d && s.hora === h ? { ...s, diaSemana: undefined, hora: undefined } : { ...s, diaSemana: d, hora: h }));
  }, []);

  const atendimentoPorId = useMemo(() => new Map(base.atendimentos.map(a => [a.cdAtendimento, a])), [base]);

  const chips = (Object.entries(sel) as Array<[DimensaoErro, string | undefined]>).filter(([, v]) => v !== undefined).map(([d, v]) => {
    const grupo = agruparErros(base, d).find(g => g.chave === v);
    return { d, v: v!, nome: grupo?.nome ?? v! };
  });

  const comAmostra = (g: { analisados: number; erros: number }) => g.analisados >= MINIMO_FICHAS && g.erros > 0;
  const piorFuncionario = porFuncionario.filter(comAmostra).sort((a, b) => b.taxa - a.taxa)[0];
  const piorConvenio = porConvenio.filter(comAmostra).sort((a, b) => b.taxa - a.taxa)[0];
  // Pódios (regras em podiosFuncionarios): quem menos erra, quem mais atende e o melhor equilíbrio entre os dois.
  const podios = podiosFuncionarios(porFuncionario);
  const num = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const resumo = (g: Colocado) => `${num(g.acerto)}% de acerto em ${num(g.analisados)} fichas (${g.comErro} com erro).`;
  const podioMenosErra = podios.menosErra.map(g => ({ chave: g.chave, nome: g.nome, destaque: `${num(g.acerto)}% de acerto`, detalhe: `${num(g.analisados)} fichas · ${g.erros} erros`, dica: resumo(g) }));
  const podioMaisAtende = podios.maisAtende.map(g => ({ chave: g.chave, nome: g.nome, destaque: `${num(g.analisados)} fichas`, detalhe: `${num(g.acerto)}% de acerto`, dica: resumo(g) }));
  const podioDesempenho = podios.desempenho.map(g => ({ chave: g.chave, nome: g.nome, destaque: `nota ${num(g.nota)}`, detalhe: `${num(g.acerto)}% · ${num(g.analisados)} fichas`, dica: `nota ${num(g.nota)} — ${resumo(g)}` }));
  const campoMaisErrado = [...porCampo].sort((a, b) => b.erros - a.erros)[0];
  const diag = dados?.diagnostico;

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><ShieldAlert size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Erros de atendimento</h1>
              <p className="text-sm text-slate-500">Campos corrigidos depois da ficha concluída: quem erra mais, em quais modalidades, convênios e campos. Clique para filtrar.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => void carregar(true)} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

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
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm" title="% máxima aceitável de fichas com erro. Até a meta fica verde, até o dobro âmbar, acima vermelho.">
              <Target size={16} className="text-slate-400" />Meta de erro: até
              <input type="number" min={1} max={100} value={meta} onChange={e => setMeta(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} className="w-10 bg-transparent text-right font-bold outline-none" />
              %
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm" title="Alterações feitas até esse tempo depois da ficha são consideradas parte da própria ficha.">
              <Timer size={16} className="text-slate-400" />Ignorar os primeiros
              <input type="number" min={0} max={120} value={tolerancia} onChange={e => setTolerancia(Math.min(120, Math.max(0, Number(e.target.value) || 0)))} className="w-10 bg-transparent text-right font-bold outline-none" />
              min
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm" title="Campo que estava vazio na ficha e foi preenchido depois (ex.: autorização que chegou mais tarde).">
              <input type="checkbox" checked={incluirPreenchimentos} onChange={e => setIncluirPreenchimentos(e.target.checked)} className="h-4 w-4 accent-blue-600" />
              Contar campos vazios preenchidos depois
            </label>
          </div>
        </section>

        {diag && (
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Info size={18} className="mt-0.5 shrink-0 text-blue-500" />
            <p>
              <b className="text-slate-900">{diag.fichas.toLocaleString("pt-BR")}</b> fichas de atendimento analisadas. A ficha é de <b>quem gravou a H. Senha</b> no log do Clinux; quando outro funcionário gravou a H. Ficha, conta o erro <b>Botão Ficha não marcado</b>
              {diag.outroFuncionario > 0 && <>{" "}(<button type="button" onClick={() => setVerDivergentes(true)} disabled={!dados.divergentes?.length}
                className="font-bold text-amber-700 underline decoration-amber-300 underline-offset-2 transition hover:text-amber-900 disabled:no-underline">{diag.outroFuncionario.toLocaleString("pt-BR")} com H. Senha e H. Ficha de funcionários diferentes — ver fichas</button>)</>}.
              {" "}Erros de cadastro do paciente vão para a atendente do último atendimento dele. Contam alterações até {dados.janelaDias} dias depois da ficha.
            </p>
          </div>
        )}


        <div className="flex min-h-10 flex-wrap items-center gap-2">
          {chips.length ? (
            <>
              <span className="text-sm font-semibold text-slate-500">Filtrando por:</span>
              {chips.map(c => (
                <button key={c.d} onClick={() => alternar(c.d)(c.v)} className="flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 py-1.5 pl-3 pr-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100">
                  <span className="text-blue-500">{ROTULO_DIM[c.d]}:</span>{c.nome}<X size={14} />
                </button>
              ))}
              <button onClick={() => setSel({})} className="text-sm font-bold text-slate-500 hover:text-slate-900 hover:underline">Limpar tudo</button>
            </>
          ) : (
            <span className="flex items-center gap-2 text-sm text-slate-400"><MousePointerClick size={16} />Dica: clique em um funcionário, campo, convênio, modalidade ou dia para ver só aqueles erros.</span>
          )}
        </div>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        <AvisoCarregando ativo={carregando} />
        {!dados && carregando ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
        ) : dados && (
          <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Kpi titulo="Fichas analisadas" valor={r.analisados.toLocaleString("pt-BR")} icone={ListChecks} variacao={variacaoPct(r.analisados, rAnterior?.analisados)} menorMelhor={false}
                detalhe={comparacao || "ficha de quem chamou a senha"} destaque={COR.texto} />
              <Kpi titulo="Fichas com erro" valor={`${r.taxa.toLocaleString("pt-BR")}%`} icone={FileWarning} sufixoVariacao=" p.p."
                variacao={rAnterior && rAnterior.analisados ? Math.round((r.taxa - rAnterior.taxa) * 10) / 10 : null}
                detalhe={`${r.comErro.toLocaleString("pt-BR")} fichas · meta ${meta}%${rAnterior ? ` · antes ${rAnterior.taxa.toLocaleString("pt-BR")}%` : ""}`} destaque={corTaxa(r.taxa, meta)} />
              <Kpi titulo="Campos corrigidos" valor={r.erros.toLocaleString("pt-BR")} icone={PenLine} variacao={variacaoPct(r.erros, rAnterior?.erros)}
                detalhe={`${r.errosPorFicha.toLocaleString("pt-BR")} por ficha${rAnterior ? ` · antes ${rAnterior.erros.toLocaleString("pt-BR")}` : ""}`} destaque={COR.critico} />
            </div>

            {/* Origem do erro: também funciona como filtro */}
            <div className="grid gap-3 md:grid-cols-3">
              {ORIGENS.map(({ id, icone: Icone, descricao }) => {
                const ativo = sel.origem === id;
                const g = porOrigem.get(id);
                const cor = COR_ORIGEM[id];
                return (
                  <button key={id} type="button" onClick={() => alternar("origem")(id)} aria-pressed={ativo}
                    className={`flex items-center gap-4 rounded-3xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ativo ? "border-blue-600 ring-2 ring-blue-600/30" : "border-slate-200"} bg-white ${sel.origem && !ativo ? "opacity-50" : ""}`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}><Icone size={22} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">{ROTULO_ORIGEM[id]}</span>
                      <span className="block text-2xl font-extrabold text-slate-900">{(g?.erros ?? 0).toLocaleString("pt-BR")}</span>
                      <span className="block truncate text-xs text-slate-500">{g ? `${g.comErro.toLocaleString("pt-BR")} fichas · ${g.taxa.toLocaleString("pt-BR")}%` : descricao}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Destaque icone={UserCog} rotulo="Funcionário que mais erra" valor={piorFuncionario?.nome ?? "—"} cor={COR.critico}
                detalhe={piorFuncionario ? `${piorFuncionario.taxa.toLocaleString("pt-BR")}% das fichas · ${piorFuncionario.erros} erros` : `nenhum com ${MINIMO_FICHAS}+ fichas e erros`}
                onClick={piorFuncionario ? () => alternar("funcionario")(piorFuncionario.chave) : undefined} />
              <Destaque icone={PenLine} rotulo="Campo mais corrigido" valor={campoMaisErrado?.nome ?? "—"} cor={COR.secundaria}
                detalhe={campoMaisErrado ? `${campoMaisErrado.erros} correções · ${campoMaisErrado.origem ? ROTULO_ORIGEM[campoMaisErrado.origem] : ""}` : "nenhuma correção"}
                onClick={campoMaisErrado ? () => alternar("campo")(campoMaisErrado.chave) : undefined} />
              <Destaque icone={BadgeCheck} rotulo="Convênio com mais erros" valor={piorConvenio?.nome ?? "—"} cor={COR.atencao}
                detalhe={piorConvenio ? `${piorConvenio.taxa.toLocaleString("pt-BR")}% das fichas · ${piorConvenio.erros} erros` : `nenhum com ${MINIMO_FICHAS}+ fichas e erros`}
                onClick={piorConvenio ? () => alternar("convenio")(piorConvenio.chave) : undefined} />
            </div>

            <Painel titulo="Erros por dia" subtitulo="Barra cinza: fichas analisadas · Barra vermelha: campos corrigidos · Linha: % de fichas com erro. Clique em um dia para filtrar." icone={CalendarRange}
              acao={<Legenda itens={[["Fichas", COR_FICHAS], ["Erros", COR.critico], ["% com erro", COR.primaria]]} />}>
              <TendenciaErros dados={tendencia} selecionado={sel.data} onSelecionar={alternar("data")} meta={meta} />
            </Painel>

            <Painel titulo="Mapa de calor: dia da semana × horário" subtitulo="Quando acontecem mais erros, pela hora em que a ficha foi concluída." icone={Flame}
              acao={<Alternador valor={metricaCalor} onChange={v => setMetricaCalor(v as MetricaErro)} opcoes={[["taxa", "% fichas"], ["erros", "Qtd. erros"]]} />}>
              <MapaCalorErros horas={calor.horas} linhas={calor.linhas} metrica={metricaCalor} selecionado={{ dia: sel.diaSemana, hora: sel.hora }} onSelecionar={selecionarCelula} meta={meta} />
            </Painel>

            <div className="grid gap-6 lg:grid-cols-3">
              <Painel titulo="Pódio: quem menos erra" subtitulo={`Maior % de fichas sem nenhuma correção depois (mínimo de ${MINIMO_FICHAS} fichas).`} icone={Trophy}>
                <Podio itens={podioMenosErra} descricao="Pódio dos funcionários que menos erram" selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />
              </Painel>
              <Painel titulo="Pódio: quem mais atende" subtitulo="Quem fez mais fichas no período." icone={Users}>
                <Podio itens={podioMaisAtende} descricao="Pódio dos funcionários que mais atendem" vazio="Nenhuma ficha no período." selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />
              </Painel>
              <Painel titulo="Pódio: melhor desempenho" subtitulo={`Muitas fichas com poucos erros: a nota é o acerto “garantido” pelo volume (mínimo de ${MINIMO_FICHAS} fichas).`} icone={Award}>
                <Podio itens={podioDesempenho} descricao="Pódio dos funcionários com melhor desempenho" selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} />
              </Painel>
            </div>

            <Painel titulo="Funcionários" subtitulo="Quem concluiu a ficha (cd_funcionario_recepcao) que depois precisou ser corrigida. Clique em um pódio ou barra para filtrar." icone={UserCog}
              acao={<Alternador valor={metricaFuncionario} onChange={v => setMetricaFuncionario(v as MetricaErro)} opcoes={[["taxa", "% fichas"], ["erros", "Qtd. erros"]]} />}>
              <RankingErros grupos={porFuncionario} metrica={metricaFuncionario} selecionado={sel.funcionario} onSelecionar={alternar("funcionario")} meta={meta} />
            </Painel>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Campos que mais erram" subtitulo="Quantas vezes cada campo foi corrigido depois da ficha" icone={PenLine}
                acao={<Legenda itens={ORIGENS.map(o => [ROTULO_ORIGEM[o.id], COR_ORIGEM[o.id]] as [string, string])} />}>
                <RankingErros grupos={porCampo} metrica="erros" selecionado={sel.campo} onSelecionar={alternar("campo")} porOrigem limite={12} />
              </Painel>
              <Painel titulo="Modalidades" subtitulo="% de fichas corrigidas por modalidade do exame" icone={Layers}>
                <RankingErros grupos={porModalidade} metrica="taxa" selecionado={sel.modalidade} onSelecionar={alternar("modalidade")} limite={8} meta={meta} />
              </Painel>
            </div>

            <Painel titulo="Convênios" subtitulo="Em quais convênios a ficha mais precisa de correção" icone={BadgeCheck}
              acao={<Alternador valor={metricaConvenio} onChange={v => setMetricaConvenio(v as MetricaErro)} opcoes={[["taxa", "% fichas"], ["erros", "Qtd. erros"]]} />}>
              <RankingErros grupos={porConvenio} metrica={metricaConvenio} selecionado={sel.convenio} onSelecionar={alternar("convenio")} meta={meta} />
            </Painel>

            <Painel titulo="Erros em detalhe" subtitulo={`${filtrado.erros.length.toLocaleString("pt-BR")} campos corrigidos com os filtros atuais, do mais recente para o mais antigo`} icone={FileWarning}>
              <ConteudoErros erros={filtrado.erros} atendimentos={atendimentoPorId} />
            </Painel>
          </div>
        )}
      </div>

      {chips.length > 0 && dados && !verErros && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            <span className="min-w-0 truncate text-sm text-slate-600">
              <b className="text-slate-900">{chips.map(c => c.nome).join(" · ")}</b> · {filtrado.erros.length} {filtrado.erros.length === 1 ? "erro" : "erros"}
            </span>
            <button onClick={() => setVerErros(true)} disabled={!filtrado.erros.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-50">
              <FileWarning size={16} />Ver erros
            </button>
            <button onClick={() => setSel({})} aria-label="Limpar filtros" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100"><X size={18} /></button>
          </div>
        </div>
      )}
      {verDivergentes && dados?.divergentes && <DivergentesModal fichas={dados.divergentes} onFechar={fecharDivergentes} />}
      {verErros && (
        <ErrosModal titulo={chips.map(c => c.nome).join(" · ") || "Todos os erros"} erros={filtrado.erros} atendimentos={atendimentoPorId}
          resumo={`${r.erros} campos corrigidos em ${r.comErro} de ${r.analisados} fichas (${r.taxa.toLocaleString("pt-BR")}%)`} onFechar={fecharErros} />
      )}
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

function ErrosModal({ titulo, erros, atendimentos, resumo, onFechar }: { titulo: string; erros: Erro[]; atendimentos: Map<number, AtendimentoErro>; resumo: string; onFechar: () => void }) {
  useEffect(() => {
    const fechar = (e: KeyboardEvent) => { if (e.key === "Escape") onFechar(); };
    window.addEventListener("keydown", fechar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", fechar); document.body.style.overflow = overflow; };
  }, [onFechar]);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="erros-modal-titulo" onClick={e => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Erros de atendimento</p>
            <h2 id="erros-modal-titulo" className="truncate text-2xl font-extrabold text-slate-900">{titulo}</h2>
            <p className="text-sm text-slate-500">{resumo}</p>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100"><X size={20} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-5 md:p-6">
          <ConteudoErros erros={erros} atendimentos={atendimentos} />
        </div>
      </div>
    </div>
  );
}

function ConteudoErros({ erros, atendimentos }: { erros: Erro[]; atendimentos: Map<number, AtendimentoErro> }) {
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(50);
  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const base = termo ? erros.filter(e => {
      const a = atendimentos.get(e.cdAtendimento);
      return [e.cdAtendimento, e.campo, e.antes, e.depois, e.corretores.join(" "), a?.paciente, a?.cdPaciente, a?.funcionario, a?.convenio, a?.modalidade].join(" ").toLowerCase().includes(termo);
    }) : erros;
    return [...base].sort((a, b) => b.alteradoEm.localeCompare(a.alteradoEm));
  }, [erros, atendimentos, busca]);

  function exportarCsv() {
    const cab = ["Nº atendimento", "Paciente", "ID paciente", "Data da ficha", "Hora da ficha", "Funcionário da ficha", "Modalidade", "Convênio", "Origem", "Campo", "Antes", "Depois", "Corrigido em", "Tempo após a ficha (min)", "Alterações", "Corrigido por"];
    const corpo = lista.map(e => {
      const a = atendimentos.get(e.cdAtendimento);
      return [e.cdAtendimento, a?.paciente ?? "", a?.cdPaciente ?? "", a ? formatarData(a.data) : "", a?.horaFicha ?? "", a?.funcionario ?? "", a?.modalidade ?? "", a?.convenio ?? "",
        ROTULO_ORIGEM[e.origem], e.campo, valorCampo(e.antes), valorCampo(e.depois), dataHora(e.alteradoEm), e.minutosAposFicha, e.alteracoes, e.corretores.join(", ")];
    });
    const csv = [cab, ...corpo].map(linha => linha.map(v => `"${(typeof v === "number" && !Number.isInteger(v) ? String(v).replace(".", ",") : String(v)).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = "erros-de-atendimento.csv"; link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-md">
          <Search size={16} className="text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nº atendimento, paciente, campo, funcionário…" className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <button onClick={exportarCsv} disabled={!lista.length} className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"><Download size={15} />Exportar CSV</button>
      </div>
      {lista.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Nº atend.</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Ficha</th>
                <th className="px-3 py-2">Campo</th><th className="px-3 py-2">Antes → depois</th><th className="px-3 py-2">Corrigido</th>
              </tr>
            </thead>
            <tbody>
              {lista.slice(0, limite).map(e => {
                const a = atendimentos.get(e.cdAtendimento);
                const propria = !!a?.funcionario && e.corretores.includes(a.funcionario);
                return (
                  <tr key={e.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <button type="button" title="Copiar nº do atendimento" onClick={() => void navigator.clipboard?.writeText(String(e.cdAtendimento))}
                        className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 transition hover:bg-blue-100 hover:text-blue-700">{e.cdAtendimento}</button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-900">{a?.paciente ?? "Sem cadastro"}</span>
                      {a && <span className="block text-xs text-slate-400">ID {a.cdPaciente ?? "—"} · {a.modalidade} · {a.convenio ?? "Sem convênio"}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {a ? <><span className="tabular-nums">{formatarData(a.data)} {a.horaFicha}</span><span className="block text-xs text-slate-500">{a.funcionario ?? "Não informado"}</span></> : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-slate-900">{e.campo}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: COR_ORIGEM[e.origem] }} />{ROTULO_ORIGEM[e.origem]}</span>
                    </td>
                    <td className="max-w-[340px] px-3 py-2.5">
                      <span className="block break-words text-xs text-red-600 line-through decoration-red-300">{valorCampo(e.antes)}</span>
                      <span className="block break-words text-xs font-semibold text-emerald-700">{valorCampo(e.depois)}</span>
                      {e.preenchimento && <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">preenchido depois</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                      <span className="tabular-nums text-slate-900">{dataHora(e.alteradoEm)}</span>
                      <span className="block text-slate-500">{tempoDepois(e.minutosAposFicha)} após a ficha{e.alteracoes > 1 ? ` · ${e.alteracoes} alterações` : ""}</span>
                      <span className="block text-slate-500">por {e.corretores.join(", ")}{propria && <b className="ml-1 text-blue-600">(a própria)</b>}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length > limite && <button onClick={() => setLimite(n => n + 100)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Mostrar mais ({(lista.length - limite).toLocaleString("pt-BR")} restantes)</button>}
        </div>
      ) : <p className="py-8 text-center text-sm text-slate-400">Nenhum erro com os filtros atuais.</p>}
    </div>
  );
}
