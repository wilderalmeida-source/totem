"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Lock, LockOpen, Loader2, PenLine, Scale, Send, Undo2, X, XCircle } from "lucide-react";
import { Painel } from "@/components/dashboard/wait-charts";
import { AvisoCarregando } from "@/components/dashboard/carregando";
import { calcularCelula, folhaDeReceita, formatarValor, rotuloMes, valorLinha, type ContaDre, type ItemAssociacao, type LinhaEstrutura } from "@/lib/dre";

type Ajuste = { id: number; folha: string; valor: number; descricao: string; em: string; por: string };
type Versao = {
  mes: string; versao: number; status: "aguardando" | "aprovado" | "rejeitado" | "substituido" | "reaberto"
  valores: Array<{ cdConta: number | null; valor: number; titulos: number }>; mapeamento: Record<string, ItemAssociacao[]>; ajustes: Ajuste[]
  conciliacao: { linhas?: Record<string, number>; observacao?: string; em?: string; por?: string }
  motivo: string | null; criadoEm: string; criadoPor: string; decididoEm: string | null; decididoPor: string | null; decisaoMotivo: string | null
};
type Mes = { mes: string; status: "aberto" | "em_aprovacao" | "fechado"; aberto: boolean; diferenca: { contas: number; valor: number } | null; versoes: Versao[] };
type Modal =
  | { tipo: "fechar"; mes: string; nova: boolean }
  | { tipo: "rejeitar" | "aprovar"; mes: string; versao: Versao }
  | { tipo: "reabrir"; mes: string }
  | { tipo: "ajuste"; mes: string }
  | { tipo: "conciliar"; mes: string; versao: Versao };

const ROTULO_STATUS: Record<Versao["status"], [string, string]> = {
  aguardando: ["Aguardando aprovação", "bg-amber-100 text-amber-800"], aprovado: ["Aprovada (vigente)", "bg-emerald-100 text-emerald-800"],
  rejeitado: ["Rejeitada", "bg-red-100 text-red-700"], substituido: ["Substituída", "bg-slate-100 text-slate-600"], reaberto: ["Reaberta", "bg-slate-100 text-slate-600"],
};
const SITUACAO: Record<Mes["status"], [string, string, typeof Lock]> = {
  fechado: ["Fechado", "bg-emerald-100 text-emerald-800", Lock], em_aprovacao: ["Em aprovação", "bg-amber-100 text-amber-800", Send], aberto: ["Provisório", "bg-slate-100 text-slate-600", LockOpen],
};
const dataHora = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "");

export function FechamentoDre({ estrutura, contas, podeFechar, podeAprovar }: { estrutura: LinhaEstrutura[]; contas: ContaDre[]; podeFechar: boolean; podeAprovar: boolean }) {
  const [ano, setAno] = useState(new Date().getFullYear());
  const [meses, setMeses] = useState<Mes[] | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<Modal | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/backend/clinux/dre/fechamentos?ano=${ano}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Não foi possível carregar os fechamentos.");
      setMeses(j.meses); setErro("");
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro"); } finally { setCarregando(false); }
  }, [ano]);
  useEffect(() => { void carregar(); }, [carregar]);

  // Resultado de uma versão (fotografia + associação do fechamento + ajustes).
  const resultado = useCallback((v: Versao) => {
    const extras: ContaDre[] = v.ajustes.map(a => ({ cdConta: a.id, conta: a.descricao, grupo: null, despesa: false, itens: [{ folha: a.folha, pct: 100 }], salvo: true, ajuste: true }));
    const valores = [...v.valores.map(x => ({ mes: v.mes, ...x })), ...v.ajustes.map(a => ({ mes: v.mes, cdConta: a.id, valor: a.valor, titulos: 0 }))];
    return calcularCelula(estrutura, { contas: [...contas, ...extras], valores, mapeamentoMes: { [v.mes]: v.mapeamento } }, [v.mes]);
  }, [estrutura, contas]);

  async function enviar(url: string, metodo: "POST" | "PUT", corpo: unknown, sucesso: string) {
    const res = await fetch(`/api/backend/clinux/dre/fechamentos/${url}`, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(res.status === 403 ? "Seu usuário não tem permissão para esta ação." : j.error ?? "Não foi possível concluir.");
    setAviso(j.mesmoUsuario ? `${sucesso} Atenção: a versão foi aprovada pelo mesmo usuário que a fechou.` : sucesso);
    setModal(null);
    await carregar();
  }

  const alternar = (mes: string) => setAbertos(s => { const n = new Set(s); if (n.has(mes)) n.delete(mes); else n.add(mes); return n; });

  return (
    <div className="space-y-4">
      <AvisoCarregando ativo={carregando} mensagem="Carregando os fechamentos…" />
      <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Ano
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 px-2 font-bold">
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(a => <option key={a}>{a}</option>)}
          </select>
        </label>
        <p className="text-sm text-slate-500">Fechar grava a fotografia do mês; aprovar bloqueia o mês. Ajustes e novas versões passam por aprovação.</p>
      </section>
      {!podeFechar && !podeAprovar && <p className="text-sm text-slate-500">Somente leitura: fechar exige “DRE — fechar mês e ajustes”; aprovar exige “DRE — aprovar fechamento”.</p>}
      {erro && <p className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700"><AlertTriangle size={16} />{erro}</p>}
      {aviso && <p className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{aviso}</p>}

      {meses && (
        <Painel titulo={`Fechamento mensal de ${ano}`} subtitulo="Situação, versão vigente e diferenças do Clinux depois do fechamento." icone={Lock}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="rounded-l-xl bg-slate-50 px-3 py-2">Mês</th><th className="bg-slate-50 px-3 py-2">Situação</th><th className="bg-slate-50 px-3 py-2">Versão vigente</th>
                <th className="bg-slate-50 px-3 py-2 text-right">Lucro/prejuízo</th><th className="bg-slate-50 px-3 py-2">Depois do fechamento</th><th className="rounded-r-xl bg-slate-50 px-3 py-2">Ações</th>
              </tr></thead>
              <tbody>
                {meses.map(m => {
                  const aprovada = m.versoes.find(v => v.status === "aprovado");
                  const aguardando = m.versoes.find(v => v.status === "aguardando");
                  const vigente = aprovada ?? aguardando;
                  const [rot, cls, Icone] = SITUACAO[m.status];
                  const aberto = abertos.has(m.mes);
                  return (
                    <Fragment key={m.mes}>
                      <tr className="border-b border-slate-100 align-top">
                        <td className="px-3 py-2.5">
                          <button onClick={() => alternar(m.mes)} disabled={!m.versoes.length} className="flex items-center gap-1.5 font-bold text-slate-900 disabled:cursor-default">
                            {m.versoes.length ? (aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}{rotuloMes(m.mes)}
                          </button>
                        </td>
                        <td className="px-3 py-2.5"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${cls}`}><Icone size={12} />{rot}</span>
                          {aguardando && aprovada && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">v{aguardando.versao} em aprovação</span>}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{vigente ? <>v{vigente.versao} · fechada por {vigente.criadoPor} em {dataHora(vigente.criadoEm)}{aprovada && <span className="block">aprovada por {aprovada.decididoPor} em {dataHora(aprovada.decididoEm)}</span>}</> : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{vigente ? formatarValor(valorLinha(resultado(vigente), "LL")) : "—"}</td>
                        <td className="px-3 py-2.5 text-xs">{m.diferenca ? (m.diferenca.contas ? <span className="font-semibold text-amber-700">{m.diferenca.contas} conta(s) mudaram no Clinux ({formatarValor(m.diferenca.valor)})</span> : <span className="text-emerald-700">Sem alterações</span>) : "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {podeFechar && !m.aberto && !aguardando && <Acao onClick={() => setModal({ tipo: "fechar", mes: m.mes, nova: Boolean(aprovada) })} icone={Lock}>{aprovada ? "Nova versão" : "Fechar mês"}</Acao>}
                            {podeAprovar && aguardando && <Acao onClick={() => setModal({ tipo: "aprovar", mes: m.mes, versao: aguardando })} icone={CheckCircle2} cor="verde">Aprovar v{aguardando.versao}</Acao>}
                            {podeAprovar && aguardando && <Acao onClick={() => setModal({ tipo: "rejeitar", mes: m.mes, versao: aguardando })} icone={XCircle} cor="vermelho">Rejeitar</Acao>}
                            {podeFechar && vigente && <Acao onClick={() => setModal({ tipo: "ajuste", mes: m.mes })} icone={PenLine}>Ajuste</Acao>}
                            {podeFechar && vigente && <Acao onClick={() => setModal({ tipo: "conciliar", mes: m.mes, versao: vigente })} icone={Scale}>Conciliar</Acao>}
                            {podeAprovar && aprovada && !aguardando && <Acao onClick={() => setModal({ tipo: "reabrir", mes: m.mes })} icone={Undo2}>Reabrir</Acao>}
                            {m.aberto && <span className="text-xs text-slate-400">mês em andamento</span>}
                          </div>
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="border-b border-slate-100 bg-slate-50/60"><td colSpan={6} className="px-6 py-3">
                          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Histórico de versões</p>
                          <ul className="space-y-2">
                            {m.versoes.map(v => {
                              const [r, c] = ROTULO_STATUS[v.status];
                              const linhasConc = Object.keys(v.conciliacao?.linhas ?? {}).length;
                              return (
                                <li key={v.versao} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                                  <span className="font-bold">Versão {v.versao}</span> <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${c}`}>{r}</span>
                                  <span className="ml-2 text-xs text-slate-500">fechada por {v.criadoPor} em {dataHora(v.criadoEm)}{v.decididoPor ? ` · ${v.status === "aprovado" || v.status === "substituido" ? "aprovada" : v.status === "rejeitado" ? "rejeitada" : "reaberta"} por ${v.decididoPor} em ${dataHora(v.decididoEm)}` : ""}</span>
                                  {v.motivo && <span className="block text-xs text-slate-600">Motivo: {v.motivo}</span>}
                                  {v.decisaoMotivo && <span className="block text-xs text-slate-600">Decisão: {v.decisaoMotivo}</span>}
                                  {v.ajustes.length > 0 && <span className="block text-xs text-slate-600">Ajustes: {v.ajustes.map(a => `${a.descricao} (${formatarValor(a.valor)}, ${a.por})`).join(" · ")}</span>}
                                  <span className="block text-xs text-slate-500">Resultado: {formatarValor(valorLinha(resultado(v), "LL"))}{linhasConc ? ` · conciliada por ${v.conciliacao.por} em ${dataHora(v.conciliacao.em ?? null)}` : ""}</span>
                                </li>
                              );
                            })}
                          </ul>
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Painel>
      )}

      {modal && <ModalFechamento modal={modal} estrutura={estrutura} resultado={resultado} onFechar={() => setModal(null)} onEnviar={enviar} />}
    </div>
  );
}

function Acao({ onClick, icone: Icone, children, cor }: { onClick: () => void; icone: typeof Lock; children: ReactNode; cor?: "verde" | "vermelho" }) {
  const c = cor === "verde" ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" : cor === "vermelho" ? "border-red-200 text-red-700 hover:bg-red-50" : "border-slate-200 text-slate-700 hover:bg-slate-50";
  return <button onClick={onClick} className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition ${c}`}><Icone size={13} />{children}</button>;
}

function ModalFechamento({ modal, estrutura, resultado, onFechar, onEnviar }: {
  modal: Modal; estrutura: LinhaEstrutura[]; resultado: (v: Versao) => ReturnType<typeof calcularCelula>
  onFechar: () => void; onEnviar: (url: string, metodo: "POST" | "PUT", corpo: unknown, sucesso: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState("");
  const [folha, setFolha] = useState("");
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const folhas = useMemo(() => estrutura.flatMap(l => (l.tipo === "grupo" ? l.folhas.map(f => ({ id: f.id, nome: `${l.nome.replace("(−) ", "")} › ${f.nome}` })) : [])), [estrutura]);
  const linhasConc = useMemo(() => estrutura.flatMap(l => (l.tipo === "grupo" ? [{ id: l.id, nome: l.nome, grupo: true }] : [{ id: l.id, nome: l.nome, grupo: false }])), [estrutura]);
  const [contabil, setContabil] = useState<Record<string, string>>(() =>
    modal.tipo === "conciliar" ? Object.fromEntries(Object.entries(modal.versao.conciliacao?.linhas ?? {}).map(([k, v]) => [k, String(v).replace(".", ",")])) : {});
  const gerencial = modal.tipo === "conciliar" ? resultado(modal.versao) : null;
  const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));

  async function confirmar() {
    setEnviando(true); setErro("");
    try {
      if (modal.tipo === "fechar") await onEnviar(`${modal.mes}/fechar`, "POST", { motivo: motivo || undefined }, `${rotuloMes(modal.mes)}: versão criada, aguardando aprovação.`);
      if (modal.tipo === "aprovar") await onEnviar(`${modal.mes}/aprovar`, "POST", { versao: modal.versao.versao }, `${rotuloMes(modal.mes)} fechado (versão ${modal.versao.versao} aprovada).`);
      if (modal.tipo === "rejeitar") await onEnviar(`${modal.mes}/rejeitar`, "POST", { versao: modal.versao.versao, motivo }, `Versão ${modal.versao.versao} rejeitada.`);
      if (modal.tipo === "reabrir") await onEnviar(`${modal.mes}/reabrir`, "POST", { motivo }, `${rotuloMes(modal.mes)} reaberto: volta a ser provisório.`);
      if (modal.tipo === "ajuste") await onEnviar(`${modal.mes}/ajustes`, "POST", { folha, valor: folhaDeReceita(folha) ? num(valor) : -num(valor), descricao: motivo }, "Ajuste registrado; a versão precisa de aprovação.");
      if (modal.tipo === "conciliar") {
        const linhas = Object.fromEntries(Object.entries(contabil).filter(([, v]) => v.trim() !== "" && Number.isFinite(num(v))).map(([k, v]) => [k, num(v)]));
        await onEnviar(`${modal.mes}/conciliacao`, "PUT", { versao: modal.versao.versao, linhas, observacao: motivo || undefined }, "Conciliação salva.");
      }
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro"); } finally { setEnviando(false); }
  }

  const titulo = {
    fechar: modal.tipo === "fechar" && modal.nova ? `Nova versão de ${rotuloMes(modal.mes)}` : `Fechar ${rotuloMes(modal.mes)}`,
    aprovar: `Aprovar o fechamento de ${rotuloMes(modal.mes)}`, rejeitar: `Rejeitar versão de ${rotuloMes(modal.mes)}`,
    reabrir: `Reabrir ${rotuloMes(modal.mes)}`, ajuste: `Ajuste posterior em ${rotuloMes(modal.mes)}`, conciliar: `Conciliação contábil de ${rotuloMes(modal.mes)}`,
  }[modal.tipo];
  const precisaMotivo = modal.tipo === "rejeitar" || modal.tipo === "reabrir" || modal.tipo === "ajuste" || (modal.tipo === "fechar" && modal.nova);
  const valido = (!precisaMotivo || motivo.trim().length >= 3) && (modal.tipo !== "ajuste" || (folha && Number.isFinite(num(valor)) && num(valor) !== 0));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4" onClick={onFechar}>
      <div className={`flex max-h-[88vh] w-full flex-col rounded-3xl bg-white shadow-2xl ${modal.tipo === "conciliar" ? "max-w-3xl" : "max-w-lg"}`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <h3 className="text-lg font-extrabold text-slate-900">{titulo}</h3>
          <button onClick={onFechar} aria-label="Fechar" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="space-y-3 overflow-auto p-5 text-sm">
          {modal.tipo === "fechar" && <p className="text-slate-600">Grava a fotografia dos valores atuais do Clinux e da associação das contas. O mês só fica bloqueado depois da aprovação.</p>}
          {modal.tipo === "aprovar" && <p className="text-slate-600">Ao aprovar a versão {modal.versao.versao} (fechada por {modal.versao.criadoPor}), o mês fica bloqueado: a DRE passa a usar esta fotografia.</p>}
          {modal.tipo === "reabrir" && <p className="text-slate-600">O mês volta a ser provisório e a usar os valores atuais do Clinux. A versão aprovada fica no histórico.</p>}
          {modal.tipo === "ajuste" && (
            <>
              <p className="text-slate-600">O ajuste entra na versão em aprovação ou cria uma nova versão a partir da fotografia aprovada. Use valor positivo para aumentar a linha (receita ou despesa) e negativo para reduzir.</p>
              <select value={folha} onChange={e => setFolha(e.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-2">
                <option value="">— linha da DRE —</option>
                {folhas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <input value={valor} onChange={e => setValor(e.target.value)} placeholder="Valor (ex.: 1.250,00 ou -300,00)" inputMode="decimal" className="h-10 w-full rounded-lg border border-slate-200 px-3" />
            </>
          )}
          {modal.tipo === "conciliar" && gerencial && (
            <table className="w-full text-sm">
              <thead><tr className="text-right text-xs uppercase tracking-wider text-slate-500"><th className="bg-slate-50 px-2 py-1.5 text-left">Linha</th><th className="bg-slate-50 px-2 py-1.5">Gerencial</th><th className="bg-slate-50 px-2 py-1.5">Contábil</th><th className="bg-slate-50 px-2 py-1.5">Diferença</th></tr></thead>
              <tbody>
                {linhasConc.map(l => {
                  const g = valorLinha(gerencial, l.id);
                  const c = contabil[l.id]?.trim() ? num(contabil[l.id]) : null;
                  const d = c !== null && Number.isFinite(c) ? c - g : null;
                  return (
                    <tr key={l.id} className={`border-b border-slate-100 ${l.grupo ? "" : "font-bold"}`}>
                      <td className="px-2 py-1.5">{l.nome}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{formatarValor(g)}</td>
                      <td className="px-2 py-1.5 text-right"><input value={contabil[l.id] ?? ""} onChange={e => setContabil(s => ({ ...s, [l.id]: e.target.value }))} inputMode="decimal" className="h-8 w-32 rounded-lg border border-slate-200 px-2 text-right" /></td>
                      <td className={`px-2 py-1.5 text-right tabular-nums ${d === null ? "text-slate-300" : Math.abs(d) < 0.01 ? "text-emerald-600" : "font-bold text-red-600"}`}>{d === null ? "—" : Math.abs(d) < 0.01 ? "ok" : formatarValor(d)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {modal.tipo !== "aprovar" && (
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
              placeholder={modal.tipo === "ajuste" ? "Descrição do ajuste (obrigatória)" : modal.tipo === "conciliar" ? "Observação da conciliação (opcional)" : precisaMotivo ? "Motivo (obrigatório)" : "Observação (opcional)"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2" />
          )}
          {erro && <p className="font-semibold text-red-600">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
          <button onClick={onFechar} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button onClick={() => void confirmar()} disabled={!valido || enviando} className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            {enviando && <Loader2 size={16} className="animate-spin" />}Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
