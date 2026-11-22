"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlarmClock, AlertTriangle, BadgeCheck, Ban, ChartNoAxesCombined, Check, Copy, FilePen, FileSearch, FileText, Hash, Layers, Loader2,
  RotateCcw, Save, Search, ShieldAlert, SlidersHorizontal, Stethoscope, X,
} from "lucide-react";

type Tela = "espera" | "desempenho" | "erros" | "atrasos" | "laudos";
type Config = {
  modalidadesExcluidas: number[]; modalidadesTotem: number[]; medicosExcluidos: number[]; conveniosExcluidos: number[]
  // Só a tela Laudos usa.
  procedimentosExcluidos?: number[]; procedimentosRevisao: number[]; procedimentosRetificacao: number[]; minimoExames: number
};
type Item = { id: number; nome: string };
type Resposta = {
  telas: Record<Tela, { config: Config; salvo: boolean; padrao: Config }>;
  escopo: Record<Tela, { totem: boolean; medicos: boolean; convenios: boolean; laudos: boolean }>;
  opcoes: { modalidades: Item[]; medicos: Item[]; convenios: Item[]; procedimentos: Item[]; medicosExecutores?: Item[] };
};

const TELAS: Array<{ id: Tela; nome: string; descricao: string; icone: typeof Activity }> = [
  { id: "espera", nome: "Dashboard", descricao: "Tempo de espera", icone: ChartNoAxesCombined },
  { id: "desempenho", nome: "Desempenho", descricao: "Tempo de ficha", icone: Activity },
  { id: "erros", nome: "Erros de atendimento", descricao: "Correções após a ficha", icone: ShieldAlert },
  { id: "atrasos", nome: "Atraso dos pacientes", descricao: "Chegada × H. Entrada", icone: AlarmClock },
  { id: "laudos", nome: "Laudos", descricao: "Médicos e laudos", icone: FileText },
];

type EstadoModalidade = "analisar" | "totem" | "fora";

const LISTAS = ["modalidadesExcluidas", "modalidadesTotem", "medicosExcluidos", "conveniosExcluidos", "procedimentosExcluidos", "procedimentosRevisao", "procedimentosRetificacao"] as const;
const igual = (a: Config, b: Config) => a.minimoExames === b.minimoExames &&
  LISTAS.every(k => [...(a[k] ?? [])].sort((x, y) => x - y).join(",") === [...(b[k] ?? [])].sort((x, y) => x - y).join(","));

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ConfiguracaoAnalisesPage() {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [tela, setTela] = useState<Tela>("espera");
  const [rascunhos, setRascunhos] = useState<Partial<Record<Tela, Config>>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/backend/clinux/dashboard/config-analises", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível carregar a configuração.");
      setDados(json);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a configuração.");
    } finally {
      setCarregando(false);
    }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(""), 3500); return () => clearTimeout(t); }, [aviso]);

  const salvo = dados?.telas[tela].config;
  const atual = rascunhos[tela] ?? salvo;
  const alterado = !!(atual && salvo && !igual(atual, salvo));
  const escopo = dados?.escopo[tela];
  const editar = (f: (c: Config) => Config) => atual && setRascunhos(r => ({ ...r, [tela]: f(atual) }));

  async function enviar(corpo: Config | { padrao: true }, mensagem: string) {
    setSalvando(true);
    try {
      const res = await fetch(`/api/backend/clinux/dashboard/config-analises/${tela}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível salvar.");
      setDados(d => (d ? { ...d, telas: json.telas } : d));
      setRascunhos(r => { const n = { ...r }; delete n[tela]; return n; });
      setAviso(mensagem);
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  const estadoModalidade = (id: number): EstadoModalidade =>
    atual?.modalidadesExcluidas.includes(id) ? "fora" : atual?.modalidadesTotem.includes(id) ? "totem" : "analisar";
  const definirModalidade = (id: number, estado: EstadoModalidade) => editar(c => ({
    ...c,
    modalidadesExcluidas: estado === "fora" ? [...c.modalidadesExcluidas.filter(x => x !== id), id] : c.modalidadesExcluidas.filter(x => x !== id),
    modalidadesTotem: estado === "totem" ? [...c.modalidadesTotem.filter(x => x !== id), id] : c.modalidadesTotem.filter(x => x !== id),
  }));
  const alternarLista = (chave: "medicosExcluidos" | "conveniosExcluidos" | "procedimentosExcluidos" | "procedimentosRevisao" | "procedimentosRetificacao") => (id: number) =>
    editar(c => { const l = c[chave] ?? []; return { ...c, [chave]: l.includes(id) ? l.filter(x => x !== id) : [...l, id] }; });

  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-[1200px] space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <span className="system-icon flex h-14 w-14 items-center justify-center rounded-2xl"><SlidersHorizontal size={28} /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Analíticos da clínica</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Configurar analíticos</h1>
            <p className="text-sm text-slate-500">Escolha, para cada tela de análise, quais modalidades, médicos e convênios entram nos números. A escolha é por código do Clinux, então renomear um cadastro não muda nada.</p>
          </div>
        </header>

        <nav className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Tela de análise">
          {TELAS.map(({ id, nome, descricao, icone: Icone }) => {
            const ativo = tela === id;
            const pendente = !!(rascunhos[id] && dados && !igual(rascunhos[id]!, dados.telas[id].config));
            return (
              <button key={id} onClick={() => setTela(id)} aria-pressed={ativo}
                className={`flex items-center gap-3 rounded-3xl border p-4 text-left transition ${ativo ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-200" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:shadow-md"}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${ativo ? "bg-white/20" : "system-icon"}`}><Icone size={22} /></span>
                <span className="min-w-0">
                  <span className="block truncate font-extrabold">{nome}</span>
                  <span className={`block text-xs ${ativo ? "text-white/80" : "text-slate-500"}`}>
                    {descricao} · {pendente ? "não salvo" : dados?.telas[id].salvo ? "personalizado" : "padrão"}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>

        {erro && <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle size={18} />{erro}</div>}

        {!dados || !atual || !escopo ? (
          carregando ? <div className="h-96 animate-pulse rounded-3xl bg-slate-200/70" /> : null
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
              <span className="text-slate-600">
                {dados.telas[tela].salvo ? <>Configuração <b>personalizada</b> desta tela.</> : <>Usando o <b>padrão</b> (TOTEM pela fila, MIGRAÇÃO fora{tela === "erros" ? ", convênio CRI fora" : ""}{tela === "atrasos" ? ", Raio-X e e-Laudos fora" : ""}{tela === "laudos" ? ", revisão e retificação pelo nome do procedimento, mínimo de 10 exames" : ""}).</>}
              </span>
              <div className="flex flex-wrap gap-2">
                <CopiarDe tela={tela} onCopiar={origem => { setRascunhos(r => ({ ...r, [tela]: {
                  ...(rascunhos[origem] ?? dados.telas[origem].config),
                  ...(escopo.totem ? {} : { modalidadesTotem: [] }),
                  // Procedimentos e mínimo são da tela Laudos: a cópia só traz modalidades, médicos e convênios.
                  procedimentosExcluidos: atual.procedimentosExcluidos ?? [], procedimentosRevisao: atual.procedimentosRevisao, procedimentosRetificacao: atual.procedimentosRetificacao, minimoExames: atual.minimoExames,
                } })); setAviso(`Copiado de ${TELAS.find(t => t.id === origem)?.nome}. Confira e salve.`); }} />
                {dados.telas[tela].salvo && (
                  <button onClick={() => void enviar({ padrao: true }, "Tela voltou ao padrão.")} disabled={salvando} className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">
                    <RotateCcw size={15} />Voltar ao padrão
                  </button>
                )}
              </div>
            </div>

            <Secao titulo="Modalidades" icone={Layers}
              descricao={escopo.totem
                ? "Analisar: entra nos números. Tipo TOTEM: não é uma modalidade de verdade (paciente sem cadastro), a modalidade vem da fila escolhida no totem. Fora: não entra na análise."
                : "Analisar: entra nos números. Fora: não entra na análise."}
              resumo={`${atual.modalidadesExcluidas.length} fora${escopo.totem ? ` · ${atual.modalidadesTotem.length} tipo TOTEM` : ""}`}>
              <ListaModalidades itens={dados.opcoes.modalidades} estado={estadoModalidade} onDefinir={definirModalidade} totem={escopo.totem} />
            </Secao>

            {escopo.medicos && (
              <Secao titulo="Médicos" icone={Stethoscope} descricao={escopo.laudos
                ? "Desmarque os médicos que não devem entrar nesta análise (ex.: laudo à distância). Lista: médicos executores do atendimento (os mesmos da tela Desempenho) no último ano."
                : "Desmarque os médicos que não devem entrar nesta análise (ex.: laudo à distância). Lista: médicos com atendimento ou exame no último ano."}
                resumo={`${atual.medicosExcluidos.length} fora da análise`}>
                <ListaMarcacao itens={escopo.laudos ? dados.opcoes.medicosExecutores ?? dados.opcoes.medicos : dados.opcoes.medicos} excluidos={atual.medicosExcluidos} onAlternar={alternarLista("medicosExcluidos")} />
              </Secao>
            )}

            {escopo.convenios && (
              <Secao titulo="Convênios" icone={BadgeCheck} descricao="Desmarque os convênios que não devem entrar nesta análise."
                resumo={`${atual.conveniosExcluidos.length} fora da análise`}>
                <ListaMarcacao itens={dados.opcoes.convenios} excluidos={atual.conveniosExcluidos} onAlternar={alternarLista("conveniosExcluidos")} />
              </Secao>
            )}

            {escopo.laudos && (
              <>
                <Secao titulo="Mínimo de exames por médico na modalidade" icone={Hash}
                  descricao="Há médicos que quase não laudam certas modalidades. Para não distorcer os rankings, o médico só aparece numa modalidade se tiver laudado pelo menos esta quantidade de exames dela no período analisado. 0 = sem mínimo."
                  resumo={`${atual.minimoExames} exames`}>
                  <label className="flex w-fit items-center gap-3 rounded-2xl border border-slate-200 px-4 py-2 text-sm">
                    Pelo menos
                    <input type="number" min={0} max={10000} value={atual.minimoExames}
                      onChange={e => { const n = Math.min(10000, Math.max(0, Math.floor(Number(e.target.value) || 0))); editar(c => ({ ...c, minimoExames: n })); }}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right font-bold outline-none focus:border-blue-400" />
                    exames do médico na modalidade
                  </label>
                </Secao>
                <Secao titulo="Procedimentos fora da análise" icone={Ban}
                  descricao="Desmarque os procedimentos que não devem entrar nesta análise (ex.: gravações, taxas, procedimentos sem laudo). Eles também não contam no mínimo de exames do médico."
                  resumo={`${(atual.procedimentosExcluidos ?? []).length} fora da análise`}>
                  <ListaMarcacao itens={dados.opcoes.procedimentos} excluidos={atual.procedimentosExcluidos ?? []} onAlternar={alternarLista("procedimentosExcluidos")} />
                </Secao>
                <Secao titulo="Procedimentos de revisão de laudo" icone={FileSearch}
                  descricao="Marque o procedimento de revisão de laudo de cada modalidade. Cada exame com um deles conta como revisão para o médico do laudo revisado."
                  resumo={`${atual.procedimentosRevisao.length} marcados`}>
                  <ListaMarcacao itens={dados.opcoes.procedimentos} excluidos={atual.procedimentosRevisao} onAlternar={alternarLista("procedimentosRevisao")} incluir />
                </Secao>
                <Secao titulo="Procedimentos de retificação de laudo" icone={FilePen}
                  descricao="Marque o procedimento de retificação de laudo de cada modalidade. A retificação é analisada separada da revisão."
                  resumo={`${atual.procedimentosRetificacao.length} marcados`}>
                  <ListaMarcacao itens={dados.opcoes.procedimentos} excluidos={atual.procedimentosRetificacao} onAlternar={alternarLista("procedimentosRetificacao")} incluir />
                </Secao>
              </>
            )}

            {tela === "espera" && <p className="text-center text-sm text-slate-400">O tempo de espera é medido pela senha, que não tem médico nem convênio: aqui só as modalidades se aplicam.</p>}
          </>
        )}
      </div>

      {(alterado || aviso) && (
        <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
            {alterado ? (
              <>
                <span className="text-sm font-semibold text-slate-700">Alterações não salvas em <b>{TELAS.find(t => t.id === tela)?.nome}</b></span>
                <button onClick={() => setRascunhos(r => { const n = { ...r }; delete n[tela]; return n; })} disabled={salvando} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"><X size={16} />Descartar</button>
                <button onClick={() => void enviar(atual!, "Configuração salva. As telas já usam a nova escolha.")} disabled={salvando} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow transition hover:bg-blue-700 disabled:opacity-60">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}Salvar
                </button>
              </>
            ) : <span className="flex items-center gap-2 px-2 py-2 text-sm font-semibold text-emerald-700"><Check size={16} />{aviso}</span>}
          </div>
        </div>
      )}
    </main>
  );
}

function Secao({ titulo, icone: Icone, descricao, resumo, children }: { titulo: string; icone: typeof Layers; descricao: string; resumo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="system-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Icone size={20} /></span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{titulo}</h2>
            <p className="max-w-3xl text-sm text-slate-500">{descricao}</p>
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{resumo}</span>
      </div>
      {children}
    </section>
  );
}

function Busca({ valor, onChange, placeholder }: { valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm sm:max-w-sm">
      <Search size={16} className="text-slate-400" />
      <input value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent outline-none" />
    </label>
  );
}

function ListaModalidades({ itens, estado, onDefinir, totem }: { itens: Item[]; estado: (id: number) => EstadoModalidade; onDefinir: (id: number, e: EstadoModalidade) => void; totem: boolean }) {
  const [busca, setBusca] = useState("");
  const lista = useMemo(() => {
    const t = semAcento(busca.trim());
    return itens.filter(i => !t || semAcento(i.nome).includes(t) || String(i.id) === t);
  }, [itens, busca]);
  const opcoes: Array<[EstadoModalidade, string, string]> = [
    ["analisar", "Analisar", "bg-emerald-600 text-white"],
    ...(totem ? [["totem", "Tipo TOTEM", "bg-blue-600 text-white"] as [EstadoModalidade, string, string]] : []),
    ["fora", "Fora", "bg-red-600 text-white"],
  ];
  return (
    <div>
      <div className="mb-3"><Busca valor={busca} onChange={setBusca} placeholder="Buscar modalidade ou código…" /></div>
      <div className="grid gap-2 md:grid-cols-2">
        {lista.map(i => {
          const atual = estado(i.id);
          return (
            <div key={i.id} className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${atual === "fora" ? "border-red-200 bg-red-50/50" : atual === "totem" ? "border-blue-200 bg-blue-50/50" : "border-slate-200"}`}>
              <span className="min-w-0">
                <span className={`block truncate font-semibold ${atual === "fora" ? "text-slate-400 line-through" : "text-slate-900"}`}>{i.nome}</span>
                <span className="block text-xs text-slate-400">código {i.id}</span>
              </span>
              <div className="flex shrink-0 rounded-xl bg-slate-100 p-1">
                {opcoes.map(([id, rotulo, cor]) => (
                  <button key={id} onClick={() => onDefinir(i.id, id)} aria-pressed={atual === id}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${atual === id ? cor + " shadow" : "text-slate-500 hover:text-slate-900"}`}>{rotulo}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {!lista.length && <p className="py-6 text-center text-sm text-slate-400">Nenhuma modalidade encontrada.</p>}
    </div>
  );
}

// Lista com caixas de marcação. Padrão: marcado = analisa (os ids são os excluídos).
// Com "incluir": marcado = escolhido (os ids são os selecionados, ex.: procedimentos de revisão).
function ListaMarcacao({ itens, excluidos, onAlternar, incluir = false }: { itens: Item[]; excluidos: number[]; onAlternar: (id: number) => void; incluir?: boolean }) {
  const [busca, setBusca] = useState("");
  const [soFora, setSoFora] = useState(false);
  const [limite, setLimite] = useState(60);
  const fora = useMemo(() => new Set(excluidos), [excluidos]);
  // Códigos excluídos que não estão na lista (ex.: médico sem atendimento no último ano) continuam visíveis.
  const todos = useMemo(() => {
    const conhecidos = new Set(itens.map(i => i.id));
    return [...itens, ...excluidos.filter(id => !conhecidos.has(id)).map(id => ({ id, nome: `Código ${id}` }))];
  }, [itens, excluidos]);
  const lista = useMemo(() => {
    const t = semAcento(busca.trim());
    return todos
      .filter(i => (!soFora || fora.has(i.id)) && (!t || semAcento(i.nome).includes(t) || String(i.id) === t))
      .sort((a, b) => Number(fora.has(b.id)) - Number(fora.has(a.id)) || a.nome.localeCompare(b.nome));
  }, [todos, busca, soFora, fora]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Busca valor={busca} onChange={v => { setBusca(v); setLimite(60); }} placeholder="Buscar por nome ou código…" />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={soFora} onChange={e => setSoFora(e.target.checked)} className="h-4 w-4 accent-blue-600" />{incluir ? "Só os marcados" : "Só os que estão fora"}
        </label>
        <span className="text-xs text-slate-400">{todos.length} no total · os {incluir ? "marcados" : "que estão fora"} aparecem primeiro</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lista.slice(0, limite).map(i => {
          if (incluir) {
            const marcado = fora.has(i.id);
            return (
              <label key={i.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 transition ${marcado ? "border-blue-300 bg-blue-50/70" : "border-slate-200 hover:bg-slate-50"}`}>
                <input type="checkbox" checked={marcado} onChange={() => onAlternar(i.id)} className="h-4 w-4 shrink-0 accent-blue-600" />
                <span className="min-w-0">
                  <span className={`block truncate text-sm font-semibold ${marcado ? "text-blue-900" : "text-slate-700"}`} title={i.nome}>{i.nome}</span>
                  <span className="block text-xs text-slate-400">código {i.id}{marcado ? " · marcado" : ""}</span>
                </span>
              </label>
            );
          }
          const analisa = !fora.has(i.id);
          return (
            <label key={i.id} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2 transition ${analisa ? "border-slate-200 hover:bg-slate-50" : "border-red-200 bg-red-50/60"}`}>
              <input type="checkbox" checked={analisa} onChange={() => onAlternar(i.id)} className="h-4 w-4 shrink-0 accent-emerald-600" />
              <span className="min-w-0">
                <span className={`block truncate text-sm font-semibold ${analisa ? "text-slate-900" : "text-slate-400 line-through"}`}>{i.nome}</span>
                <span className="block text-xs text-slate-400">código {i.id}{analisa ? "" : " · fora da análise"}</span>
              </span>
            </label>
          );
        })}
      </div>
      {lista.length > limite && <button onClick={() => setLimite(n => n + 120)} className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">Mostrar mais ({lista.length - limite} restantes)</button>}
      {!lista.length && <p className="py-6 text-center text-sm text-slate-400">Nada encontrado.</p>}
    </div>
  );
}

function CopiarDe({ tela, onCopiar }: { tela: Tela; onCopiar: (origem: Tela) => void }) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700">
      <Copy size={15} className="text-slate-400" />
      <select value="" onChange={e => e.target.value && onCopiar(e.target.value as Tela)} className="bg-transparent text-sm outline-none">
        <option value="">Copiar de outra tela…</option>
        {TELAS.filter(t => t.id !== tela).map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
      </select>
    </label>
  );
}
