"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, CalendarCheck, CalendarRange, ChartNoAxesCombined, Clock3, FileCheck2, Flame, Globe, Hourglass, Layers,
  PieChart as PieIcon, RefreshCw, Target, Timer, UserRoundCheck, Users,
} from "lucide-react";
import {
  COR, EsperaDashboard, GraficoDistribuicao, GraficoModalidades, GraficoPorHora, GraficoTendencia, GraficoTipo,
  Kpi, MapaCalor, MedidorMeta, Painel, corPorMeta, formatarData, formatarMinutos, type CelulaCalor, type Servico, SETOR_INFO,
} from "@/components/dashboard/wait-charts";
import { DetalheCalorModal } from "@/components/dashboard/heatmap-detail-modal";
import { AvisoCarregando } from "@/components/dashboard/carregando";

type Preset = "hoje" | "7d" | "30d" | "90d" | "custom";

const SETORES = [
  { id: "atendimento", icone: UserRoundCheck },
  { id: "agendamento", icone: CalendarCheck },
  { id: "entrega", icone: FileCheck2 },
] as const;

const PRESETS: Array<{ id: Preset; label: string; dias: number }> = [
  { id: "hoje", label: "Hoje", dias: 1 },
  { id: "7d", label: "7 dias", dias: 7 },
  { id: "30d", label: "30 dias", dias: 30 },
  { id: "90d", label: "90 dias", dias: 90 },
];

function hojeIso(deslocamento = 0) {
  const d = new Date();
  d.setDate(d.getDate() + deslocamento);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [preset, setPreset] = useState<Preset>("7d");
  const [inicio, setInicio] = useState(hojeIso(-6));
  const [fim, setFim] = useState(hojeIso());
  const [modalidade, setModalidade] = useState("");
  const [servico, setServico] = useState<Servico>("atendimento");
  const [meta, setMeta] = useState(15);
  const [autoAtualizar, setAutoAtualizar] = useState(true);
  const [dados, setDados] = useState<EsperaDashboard | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [celula, setCelula] = useState<CelulaCalor | null>(null);

  const escolherPreset = (p: (typeof PRESETS)[number]) => {
    setPreset(p.id);
    setInicio(hojeIso(-(p.dias - 1)));
    setFim(hojeIso());
  };

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    try {
      const qs = new URLSearchParams({ inicio, fim, meta: String(meta), servico });
      if (modalidade) qs.set("modalidade", modalidade);
      const res = await fetch(`/api/backend/clinux/dashboard/espera?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar os dados.");
      setDados(json);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }, [inicio, fim, meta, modalidade, servico]);

  useEffect(() => {
    const t = setTimeout(() => void carregar(), 250); // evita várias consultas enquanto a meta é digitada
    return () => clearTimeout(t);
  }, [carregar]);

  // Atualização automática só faz sentido quando o período inclui hoje.
  const incluiHoje = fim >= hojeIso();
  useEffect(() => {
    if (!autoAtualizar || !incluiHoje) return;
    const id = setInterval(() => void carregar(true), 60_000);
    return () => clearInterval(id);
  }, [autoAtualizar, incluiHoje, carregar]);

  const umDia = inicio === fim;
  const tendencia = useMemo(() => {
    if (!dados) return [];
    // Para um único dia, a evolução é mostrada hora a hora.
    return umDia
      ? dados.porHora.map(h => ({ rotulo: h.hora, media: h.media, mediana: h.media, p90: h.p90, total: h.total }))
      : dados.porDia.map(d => ({ rotulo: formatarData(d.data, true), media: d.media, mediana: d.mediana, p90: d.p90, total: d.total }));
  }, [dados, umDia]);

  const pico = useMemo(() => {
    if (!dados?.porHora.length) return null;
    const maisMovimento = [...dados.porHora].sort((a, b) => b.total - a.total)[0];
    const maiorEspera = [...dados.porHora].filter(h => h.total > 0).sort((a, b) => b.media - a.media)[0];
    return { maisMovimento, maiorEspera };
  }, [dados]);

  const r = dados?.resumo;
  const piorModalidade = dados?.porModalidade.find(m => m.modalidade !== "Não identificada");
  // Mesmos filtros do painel; referência estável para o modal não recarregar à toa.
  const filtrosDetalhe = useMemo(() => ({ inicio, fim, servico, modalidade }), [inicio, fim, servico, modalidade]);
  const fecharDetalhe = useCallback(() => setCelula(null), []);

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        {/* Cabeçalho */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><ChartNoAxesCombined size={28} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Tempo de espera · {SETOR_INFO[servico].nome}</h1>
              <p className="text-sm text-slate-500">Da emissão da senha até ela mudar de “Aguardando” para “{SETOR_INFO[servico].concluido}”, um registro por paciente no dia — o mesmo critério do histórico da tela inicial. Senhas com modalidade TOTEM são atribuídas à modalidade escolhida no totem; MIGRAÇÃO não entra na análise.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {dados && <span>Atualizado às {new Date(dados.atualizadoEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
            <button onClick={() => void carregar()} disabled={carregando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw size={16} className={carregando ? "animate-spin" : ""} />Atualizar
            </button>
          </div>
        </header>

        {/* Setor: Atendimento e Entrega de resultados são analisados separadamente */}
        <nav className="grid gap-3 md:grid-cols-3" aria-label="Setor">
          {SETORES.map(({ id, icone: Icone }) => {
            const ativo = servico === id;
            const { nome: titulo, descricao } = SETOR_INFO[id];
            return (
              <button key={id} onClick={() => { setModalidade(""); setServico(id); }} aria-pressed={ativo}
                className={`flex items-center gap-4 rounded-3xl border p-4 text-left transition ${ativo ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:shadow-md"}`}>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ativo ? "bg-white/20" : "system-icon"}`}><Icone size={24} /></span>
                <span>
                  <span className="block text-lg font-extrabold">{titulo}</span>
                  <span className={`block text-sm ${ativo ? "text-white/80" : "text-slate-500"}`}>{descricao}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Filtros */}
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-2xl bg-slate-100 p-1">
              {PRESETS.map(p => (
                <button key={p.id} onClick={() => escolherPreset(p)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${preset === p.id ? "bg-blue-600 text-white shadow" : "text-slate-600 hover:text-slate-900"}`}>{p.label}</button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm">
              <CalendarRange size={16} className="text-slate-400" />
              <input type="date" value={inicio} max={fim} onChange={e => { setPreset("custom"); setInicio(e.target.value); }} className="bg-transparent outline-none" />
              <span className="text-slate-400">até</span>
              <input type="date" value={fim} min={inicio} onChange={e => { setPreset("custom"); setFim(e.target.value); }} className="bg-transparent outline-none" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={modalidade} onChange={e => setModalidade(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold">
              <option value="">Todas as modalidades</option>
              {dados?.modalidades.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm">
              <Target size={16} className="text-slate-400" />Meta
              <input type="number" min={1} max={240} value={meta} onChange={e => setMeta(Math.min(240, Math.max(1, Number(e.target.value) || 1)))} className="w-14 bg-transparent text-right font-bold outline-none" />
              min
            </label>
            <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition ${autoAtualizar && incluiHoje ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>
              <input type="checkbox" checked={autoAtualizar} onChange={e => setAutoAtualizar(e.target.checked)} className="sr-only" />
              <span className={`h-2 w-2 rounded-full ${autoAtualizar && incluiHoje ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} />Ao vivo
            </label>
          </div>
        </section>

        {erro && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>
        )}

        <AvisoCarregando ativo={carregando} />
        {!dados && carregando ? <Esqueleto /> : dados && r && (
          <div className={`space-y-6 transition-opacity ${carregando ? "opacity-60" : ""}`}>
            {/* KPIs */}
            <div className={`grid gap-4 sm:grid-cols-2 ${dados.web ? "lg:grid-cols-3 2xl:grid-cols-6" : "xl:grid-cols-5"}`}>
              <Kpi titulo="Espera média" valor={formatarMinutos(r.media)} icone={Hourglass} variacao={dados.variacao.media} detalhe="vs período anterior" destaque={corPorMeta(r.media, meta)} />
              <Kpi titulo="Espera típica (mediana)" valor={formatarMinutos(r.mediana)} icone={Timer} variacao={dados.variacao.mediana} detalhe="metade espera menos" />
              <Kpi titulo="9 em cada 10 esperam até" valor={formatarMinutos(r.p90)} icone={Clock3} variacao={dados.variacao.p90} detalhe={`máx. ${formatarMinutos(r.maximo)}`} destaque={COR.secundaria} />
              <Kpi titulo={SETOR_INFO[servico].kpi} valor={r.total.toLocaleString("pt-BR")} icone={Users} variacao={dados.variacao.total} menorMelhor={servico === "entrega"} detalhe={r.pendentes ? `${r.pendentes.toLocaleString("pt-BR")} aguardando` : "nenhuma aguardando"} destaque={COR.texto} />
              {/* Na entrega, menos gente no balcão é bom: o resultado chegou por outro caminho (ex.: internet). */}
              {dados.web && (
                <Kpi titulo="Viram o resultado on-line" valor={dados.web.pacientes.toLocaleString("pt-BR")} icone={Globe} variacao={dados.web.variacao} menorMelhor={false}
                  detalhe={`${dados.web.acessos.toLocaleString("pt-BR")} acessos · ${dados.web.atendimentos.toLocaleString("pt-BR")} atendimentos`} destaque={COR.ok} />
              )}
              <MedidorMeta percentual={r.percentualMeta} dentro={r.dentroMeta} total={r.total} meta={meta} variacao={dados.variacao.percentualMeta} />
            </div>

            {/* Tendência + destaques */}
            <div className="grid gap-6 xl:grid-cols-3">
              <Painel className="xl:col-span-2" titulo={umDia ? "Evolução ao longo do dia" : "Evolução diária"} subtitulo="Média, mediana e o tempo em que 9 de cada 10 pacientes foram chamados" icone={Activity}
                acao={<Legenda itens={[["Média", COR.primaria], ["Mediana", COR.ok], ["9 em 10", COR.secundaria]]} />}>
                <GraficoTendencia dados={tendencia} meta={meta} />
              </Painel>
              <Painel titulo="Destaques do período" subtitulo={`${formatarData(dados.periodo.inicio)} a ${formatarData(dados.periodo.fim)}`} icone={Flame}>
                <div className="space-y-3">
                  <Destaque rotulo="Horário de maior movimento" valor={pico ? pico.maisMovimento.hora : "—"} detalhe={pico ? `${pico.maisMovimento.total} pacientes · média ${formatarMinutos(pico.maisMovimento.media)}` : ""} cor={COR.primaria} />
                  <Destaque rotulo="Horário com maior espera" valor={pico?.maiorEspera ? pico.maiorEspera.hora : "—"} detalhe={pico?.maiorEspera ? `média ${formatarMinutos(pico.maiorEspera.media)} · ${pico.maiorEspera.total} pacientes` : ""} cor={COR.critico} />
                  <Destaque rotulo="Modalidade com maior espera" valor={piorModalidade?.modalidade ?? "—"} detalhe={piorModalidade ? `média ${formatarMinutos(piorModalidade.media)} · ${piorModalidade.total} pacientes` : ""} cor={COR.atencao} />
                  <Destaque rotulo="Período anterior" valor={formatarMinutos(dados.anterior.media)} detalhe={`${formatarData(dados.periodoAnterior.inicio, true)} a ${formatarData(dados.periodoAnterior.fim, true)} · ${dados.anterior.total} pacientes`} cor={COR.texto} />
                </div>
              </Painel>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <Painel titulo="Movimento e espera por horário" subtitulo="Barras: pacientes que retiraram senha · Linha: espera média" icone={Clock3}
                acao={<Legenda itens={[["Pacientes", COR.primaria], ["Espera", COR.atencao]]} />}>
                <GraficoPorHora dados={dados.porHora} meta={meta} />
              </Painel>
              <Painel titulo="Distribuição das esperas" subtitulo={`Verde dentro da meta de ${meta} min`} icone={Layers}>
                <GraficoDistribuicao dados={dados.distribuicao} total={r.total} />
              </Painel>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <Painel className="xl:col-span-2" titulo="Espera média por modalidade" subtitulo="Linha tracejada indica a meta" icone={ChartNoAxesCombined}>
                <GraficoModalidades dados={dados.porModalidade} meta={meta} />
              </Painel>
              <Painel titulo="Normal x Preferencial" subtitulo="Volume e espera média por tipo de senha" icone={PieIcon}>
                <GraficoTipo dados={dados.porTipo} meta={meta} />
              </Painel>
            </div>

            <Painel titulo="Mapa de calor: dia da semana x horário" subtitulo="Espera média em minutos — clique em um quadrado para ver os pacientes" icone={Flame}>
              <MapaCalor dados={dados.mapaCalor} meta={meta} onSelecionar={setCelula} />
            </Painel>

            <Painel titulo="Maiores esperas do período" subtitulo="Os 10 pacientes que ficaram mais tempo como “Aguardando”" icone={AlertTriangle}>
              {dados.maioresEsperas.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="rounded-l-xl px-3 py-2">Data</th><th className="px-3 py-2">Paciente</th><th className="px-3 py-2">Horário</th><th className="px-3 py-2">Modalidade</th><th className="px-3 py-2">Tipo</th><th className="rounded-r-xl px-3 py-2 text-right">Espera</th></tr></thead>
                    <tbody>
                      {dados.maioresEsperas.map((e, i) => (
                        <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                          <td className="px-3 py-2.5 tabular-nums">{formatarData(e.data)}</td>
                          <td className="px-3 py-2.5"><span className="font-semibold text-slate-900">{e.paciente ?? "Sem cadastro"}</span>{e.cdPaciente !== null && <span className="block text-xs text-slate-400">ID {e.cdPaciente}</span>}</td>
                          <td className="px-3 py-2.5 tabular-nums">{e.horaSenha}</td>
                          <td className="px-3 py-2.5">{e.modalidade}</td>
                          <td className="px-3 py-2.5">{e.preferencial ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-700">Preferencial</span> : <span className="text-slate-500">Normal</span>}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right"><span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold tabular-nums text-white" style={{ background: corPorMeta(e.minutos, meta) }}>{formatarMinutos(e.minutos)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-sm text-slate-400">Sem dados no período selecionado.</p>}
            </Painel>
          </div>
        )}
      </div>
      {celula && dados && <DetalheCalorModal celula={celula} filtros={filtrosDetalhe} meta={meta} onFechar={fecharDetalhe} />}
    </main>
  );
}

function Legenda({ itens }: { itens: Array<[string, string]> }) {
  return (
    <div className="hidden flex-wrap justify-end gap-3 text-xs font-semibold text-slate-500 sm:flex">
      {itens.map(([rotulo, cor]) => <span key={rotulo} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo}</span>)}
    </div>
  );
}

function Destaque({ rotulo, valor, detalhe, cor }: { rotulo: string; valor: string; detalhe: string; cor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:bg-slate-50">
      <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: cor }} />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{rotulo}</p>
        <p className="truncate text-lg font-extrabold text-slate-900">{valor}</p>
        {detalhe && <p className="text-xs text-slate-500">{detalhe}</p>}
      </div>
    </div>
  );
}

function Esqueleto() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
      <div className="grid gap-6 xl:grid-cols-3"><div className="h-96 animate-pulse rounded-3xl bg-slate-200/70 xl:col-span-2" /><div className="h-96 animate-pulse rounded-3xl bg-slate-200/70" /></div>
    </div>
  );
}
