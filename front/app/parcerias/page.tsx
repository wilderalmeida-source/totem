"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Handshake, Plus, Save, Shuffle, Trash2, Upload } from "lucide-react";
import type { PartnerLogo, PartnershipsConfig } from "@/lib/partnerships";

type Panel = { painel: number; ativo?: boolean };
const positions: Array<[PartnerLogo["position"], string]> = [
  ["top-left", "Canto superior esquerdo"], ["top-center", "Superior central"], ["top-right", "Canto superior direito"],
  ["center-left", "Meio à esquerda"], ["center", "Centro"], ["center-right", "Meio à direita"],
  ["bottom-left", "Canto inferior esquerdo"], ["bottom-center", "Inferior central"], ["bottom-right", "Canto inferior direito"],
];
const logoUrl = (id: string) => `/api/partnerships/logo/${encodeURIComponent(id)}`;
const button = "inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

async function readResponse(response: Response): Promise<PartnershipsConfig> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 409) throw new Error("As parcerias foram alteradas em outro navegador. Recarregue antes de tentar novamente.");
    throw new Error(body?.error ?? "Não foi possível concluir. Tente novamente.");
  }
  return body as PartnershipsConfig;
}

function LogoPreview({ logo }: { logo: PartnerLogo }) {
  const index = positions.findIndex(([value]) => value === logo.position);
  return <div>
    <div className="relative grid aspect-video grid-cols-3 grid-rows-3 gap-1 overflow-hidden rounded-xl border bg-slate-200 p-3" aria-label={`Prévia da logo: ${positions[index]?.[1]}`}>
      {positions.map(([position]) => <div key={position} className="rounded border border-dashed border-slate-400/40" />)}
      <div className="pointer-events-none absolute inset-3 grid grid-cols-3 grid-rows-3">
        <div className="flex items-center justify-center p-1" style={{ gridRow: Math.floor(index / 3) + 1, gridColumn: index % 3 + 1 }}>
          <Image src={logoUrl(logo.id)} alt={logo.name} width={logo.orientation === "portrait" ? 256 : 512} height={logo.orientation === "portrait" ? 512 : 256} unoptimized
            className="max-h-full max-w-full rounded bg-white/90 object-contain" style={{ aspectRatio: logo.orientation === "portrait" ? "1 / 2" : "2 / 1", width: logo.orientation === "portrait" ? "40%" : "100%", height: "100%" }} />
        </div>
      </div>
    </div>
    <p className="mt-2 text-xs text-slate-500">Prévia da posição. Na chamada, nome do paciente, guichê e recepção aparecem junto da logo, sem alterar a voz.</p>
  </div>;
}

export default function PartnershipsPage() {
  const [config, setConfig] = useState<PartnershipsConfig | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [selected, setSelected] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const accept = useCallback((next: PartnershipsConfig) => {
    setConfig(next);
    setDirty(false);
    setSelected(current => next.logos.some(logo => logo.id === current) ? current : next.logos[0]?.id ?? "");
  }, []);

  const load = useCallback(async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const [next, panelResponse] = await Promise.all([
        fetch("/api/partnerships", { cache: "no-store" }).then(readResponse),
        fetch("/api/paineis-config", { cache: "no-store" }),
      ]);
      if (!panelResponse.ok) throw new Error("Não foi possível carregar os painéis. Tente recarregar.");
      const panelData = await panelResponse.json();
      const configured: Panel[] = Array.isArray(panelData?.paineis)
        ? panelData.paineis.filter((panel: Panel) => Number.isInteger(panel.painel) && panel.painel > 0) : [];
      setPanels(configured.length ? configured : [{ painel: 1, ativo: true }]);
      accept(next);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar parcerias."); }
    finally { setBusy(false); }
  }, [accept]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function edit(update: (previous: PartnershipsConfig) => PartnershipsConfig) {
    setConfig(previous => previous ? update(previous) : previous);
    setDirty(true); setNotice("");
  }
  function editLogo(change: Partial<PartnerLogo>) {
    edit(previous => ({ ...previous, logos: previous.logos.map(logo => logo.id === selected ? { ...logo, ...change } : logo) }));
  }
  async function save() {
    if (!config) return;
    setBusy(true); setError(""); setNotice("");
    try {
      accept(await readResponse(await fetch("/api/partnerships", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) })));
      setNotice("Parcerias salvas. Os painéis buscarão a configuração atualizada automaticamente.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !config || dirty) return;
    if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Envie uma imagem PNG, JPEG ou WebP de até 5 MB."); return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.append("file", file); form.append("revision", config.revision);
      const next = await readResponse(await fetch("/api/partnerships", { method: "POST", body: form }));
      accept(next); setSelected(next.logos[next.logos.length - 1]?.id ?? "");
      setNotice("Logo enviada. Escolha seus painéis, orientação e posição e salve.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao enviar imagem."); }
    finally { setBusy(false); }
  }
  async function remove(logo: PartnerLogo) {
    if (!config || dirty || !window.confirm(`Excluir a logo “${logo.name}” da biblioteca e da playlist?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      accept(await readResponse(await fetch(`/api/partnerships?id=${encodeURIComponent(logo.id)}`, { method: "DELETE", headers: { "If-Match": config.revision } })));
      setNotice("Logo excluída.");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao excluir."); }
    finally { setBusy(false); }
  }
  function move(index: number, offset: number) {
    edit(previous => {
      const playlist = [...previous.playlist];
      [playlist[index], playlist[index + offset]] = [playlist[index + offset], playlist[index]];
      return { ...previous, playlist };
    });
  }

  const selectedLogo = config?.logos.find(logo => logo.id === selected);
  const allPanels = [...new Set([...panels.map(panel => panel.painel), ...(selectedLogo?.panelIds ?? [])])].sort((a, b) => a - b);

  return <main className="min-h-screen bg-slate-100 px-5 py-8 md:px-10">
    <div className="mx-auto max-w-7xl">
      <Link href="/configuracoes" onClick={event => { if (dirty && !window.confirm("Sair sem salvar as alterações?")) event.preventDefault(); }} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"><ArrowLeft size={16} />Configurações</Link>
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><span className="rounded-2xl bg-teal-600 p-3 text-white"><Handshake size={28} /></span><div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Painéis de chamada</p><h1 className="text-3xl font-bold text-slate-950">Parcerias</h1><p className="mt-1 text-sm text-slate-600">Organize as logos exibidas durante as chamadas dos pacientes.</p></div></div>
        <div className="flex gap-2"><button disabled={busy} onClick={() => { if (!dirty || window.confirm("Descartar as alterações e recarregar?")) void load(); }} className={`${button} bg-white`}>Recarregar</button><button disabled={busy || !config || !dirty} onClick={() => void save()} className={`${button} border-teal-600 bg-teal-600 text-white`}><Save size={18} />{busy ? "Aguarde…" : "Salvar alterações"}</button></div>
      </header>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-5 rounded-xl border border-teal-200 bg-teal-50 p-4 text-teal-900">{notice}</p>}
      {dirty && <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Há alterações não salvas. Salve antes de enviar ou excluir imagens.</p>}
      {!config ? <p className="rounded-2xl bg-white p-8 text-slate-600">{busy ? "Carregando parcerias…" : "Recarregue para tentar novamente."}</p> : <fieldset disabled={busy} className="min-w-0 disabled:opacity-70">
        <section className="mb-6 flex flex-wrap items-center gap-6 rounded-2xl border bg-white p-5 shadow-sm">
          <label className="flex items-center gap-3 font-semibold text-slate-900"><input className="h-5 w-5 accent-teal-600" type="checkbox" checked={config.enabled} onChange={event => edit(value => ({ ...value, enabled: event.target.checked }))} />Exibir parcerias nas chamadas</label>
          <button type="button" aria-pressed={config.random} onClick={() => edit(value => ({ ...value, random: !value.random }))} className={`${button} ${config.random ? "border-violet-600 bg-violet-600 text-white" : "bg-slate-50 text-slate-800"}`}><Shuffle size={18} />Aleatório {config.random ? "ativado" : "desativado"}</button>
          <label className="text-sm font-semibold text-slate-700">Exibição mínima <input aria-label="Duração mínima da chamada em segundos" className="mx-2 w-20 rounded-lg border p-2" type="number" min={5} max={60} value={config.displaySeconds} onChange={event => edit(value => ({ ...value, displaySeconds: Number(event.target.value) }))} />segundos</label>
          <p className="w-full text-sm text-slate-500">{config.random ? "Aleatório usa todas as logos vinculadas ao painel, mesmo fora da playlist." : "A cada chamada, o painel avança para a próxima logo da playlist vinculada a ele."} A chamada por voz continua funcionando.</p>
        </section>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(280px,0.75fr),minmax(0,1.25fr)]">
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-slate-900">Logos dos parceiros</h2><span className="text-sm text-slate-500">{config.logos.length}/100</span></div>
            <label className={`${button} mb-2 w-full border-teal-200 bg-teal-50 text-teal-900 ${dirty || config.logos.length >= 100 ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}><Upload size={18} />Enviar logo<input aria-label="Enviar logo do parceiro" className="sr-only" type="file" disabled={dirty || config.logos.length >= 100} accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(file); }} /></label>
            <p className="mb-5 text-xs text-slate-500">PNG, JPEG ou WebP • Até 5 MB por imagem</p>
            <div className="max-h-[600px] space-y-2 overflow-y-auto">
              {!config.logos.length && <p className="rounded-xl border border-dashed p-7 text-center text-sm text-slate-500">Envie a primeira logo para configurar sua apresentação.</p>}
              {config.logos.map(logo => <div key={logo.id} className={`flex items-center gap-2 rounded-xl border p-2 ${logo.id === selected ? "border-teal-500 bg-teal-50" : "border-slate-200"}`}>
                <button type="button" aria-pressed={logo.id === selected} onClick={() => setSelected(logo.id)} className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left"><Image src={logoUrl(logo.id)} alt="" width={52} height={52} unoptimized className="h-13 w-13 rounded bg-white object-contain" /><span className="min-w-0"><span className="block truncate text-sm font-semibold">{logo.name}</span><span className="block text-xs text-slate-500">{logo.panelIds.length ? `${logo.panelIds.length} painel(is)` : "Nenhum painel selecionado"}</span></span></button>
                <button type="button" disabled={config.playlist.includes(logo.id)} aria-label={`Adicionar ${logo.name} à playlist`} onClick={() => edit(value => ({ ...value, playlist: [...value.playlist, logo.id] }))} className="rounded-lg p-2 text-teal-700 hover:bg-teal-100 disabled:opacity-30"><Plus size={18} /></button>
                <button type="button" disabled={dirty} aria-label={`Excluir ${logo.name}`} onClick={() => void remove(logo)} className="rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"><Trash2 size={18} /></button>
              </div>)}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-900">Apresentação da logo</h2>
            {!selectedLogo ? <p className="py-14 text-center text-slate-500">Selecione uma logo da biblioteca.</p> : <div className="space-y-5">
              <label className="block text-sm font-semibold text-slate-700">Nome do parceiro<input maxLength={100} value={selectedLogo.name} onChange={event => editLogo({ name: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal text-slate-950" /></label>
              <div><p className="mb-2 text-sm font-semibold text-slate-700">Orientação desta imagem</p><button type="button" role="switch" aria-checked={selectedLogo.orientation === "portrait"} aria-label="Usar orientação retrato para esta logo" onClick={() => editLogo({ orientation: selectedLogo.orientation === "portrait" ? "landscape" : "portrait" })} className={`${button} ${selectedLogo.orientation === "portrait" ? "border-teal-600 bg-teal-50 text-teal-900" : "bg-slate-50"}`}><span className={`flex h-6 w-11 items-center rounded-full p-1 ${selectedLogo.orientation === "portrait" ? "justify-end bg-teal-600" : "bg-slate-400"}`}><span className="h-4 w-4 rounded-full bg-white" /></span>{selectedLogo.orientation === "portrait" ? "Retrato · 256 × 512 px" : "Paisagem · 512 × 256 px"}</button><p className="mt-2 text-xs text-slate-500">Tamanho máximo; a proporção original é preservada, sem recortar a logo.</p></div>
              <label className="block text-sm font-semibold text-slate-700">Posição no painel<select value={selectedLogo.position} onChange={event => editLogo({ position: event.target.value as PartnerLogo["position"] })} className="mt-2 w-full rounded-xl border p-3 font-normal">{positions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <fieldset className="rounded-xl border p-4"><legend className="px-1 text-sm font-semibold text-slate-700">Painéis que exibem esta logo</legend><div className="flex flex-wrap gap-3">{allPanels.map(id => <label key={id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"><input className="h-4 w-4 accent-teal-600" type="checkbox" checked={selectedLogo.panelIds.includes(id)} onChange={event => editLogo({ panelIds: event.target.checked ? [...selectedLogo.panelIds, id] : selectedLogo.panelIds.filter(panelId => panelId !== id) })} />Painel {id}{panels.find(panel => panel.painel === id)?.ativo === false ? " (inativo)" : !panels.some(panel => panel.painel === id) ? " (não cadastrado)" : ""}</label>)}</div><p className="mt-3 text-xs text-slate-500">Sem seleção, a logo não aparece nas chamadas.</p></fieldset>
              <LogoPreview logo={selectedLogo} />
            </div>}
          </section>
        </div>
        <section className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-bold text-slate-900">Ordem da playlist</h2>{config.random && <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">Ignorada enquanto Aleatório estiver ativo</span>}</div>
          <p className="mb-4 text-sm text-slate-500">Use o botão + na biblioteca para incluir uma logo. Cada painel pula as imagens que não estão vinculadas a ele.</p>
          {!config.playlist.length && <p className="rounded-xl border border-dashed p-5 text-sm text-slate-500">Playlist vazia. Adicione logos ou ative Aleatório.</p>}
          <ol className="space-y-2">{config.playlist.map((id, index) => {
            const logo = config.logos.find(item => item.id === id);
            if (!logo) return null;
            return <li key={id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="w-7 text-center text-sm font-bold text-slate-400">{index + 1}</span><span className="min-w-0 flex-1 truncate font-medium">{logo.name}</span><button type="button" disabled={index === 0} aria-label={`Mover ${logo.name} para cima`} onClick={() => move(index, -1)} className="rounded-lg p-2 hover:bg-white disabled:opacity-30"><ArrowUp size={18} /></button><button type="button" disabled={index === config.playlist.length - 1} aria-label={`Mover ${logo.name} para baixo`} onClick={() => move(index, 1)} className="rounded-lg p-2 hover:bg-white disabled:opacity-30"><ArrowDown size={18} /></button><button type="button" aria-label={`Remover ${logo.name} da playlist`} onClick={() => edit(value => ({ ...value, playlist: value.playlist.filter(item => item !== id) }))} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={18} /></button></li>;
          })}</ol>
        </section>
      </fieldset>}
    </div>
  </main>;
}
