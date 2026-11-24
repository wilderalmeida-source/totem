"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, FileDown, KeyRound, Loader2, ShieldCheck, X } from "lucide-react";
import { loadBrand } from "@/components/brand/useBrand";
import type { ResultadoPdf } from "@/lib/pdf-dashboard-dom";

// Botão flutuante dos dashboards (área Analíticos): gera o PDF da tela aberta com senha aleatória de 6 dígitos.
// A senha aparece só aqui, uma vez; não é guardada nem enviada a lugar nenhum (o log registra só que houve exportação).
export default function BotaoPdfDashboard() {
  const [gerando, setGerando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState<(ResultadoPdf & { url: string }) | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => () => { if (pronto) URL.revokeObjectURL(pronto.url); }, [pronto]);

  function baixar(r: { url: string; arquivo: string }) {
    const a = document.createElement("a");
    a.href = r.url; a.download = r.arquivo; a.click();
  }

  async function gerar() {
    setErro(""); setGerando("Preparando…"); setCopiado(false);
    try {
      const [{ exportarDashboardPdf }, empresa, usuario, marca] = await Promise.all([
        import("@/lib/pdf-dashboard-dom"),
        fetch("/api/informativos", { cache: "no-store" }).then(r => r.json()).then(v => (typeof v?.company === "string" ? v.company : "")).catch(() => ""),
        fetch("/api/auth/session", { cache: "no-store" }).then(r => r.json()).then(v => (typeof v?.username === "string" ? v.username : undefined)).catch(() => undefined),
        loadBrand(),
      ]);
      const r = await exportarDashboardPdf({ empresa: empresa || "Clínica", usuario, logoUrl: marca?.lightUrl ?? null, aoProgredir: setGerando });
      const url = URL.createObjectURL(r.blob);
      setPronto(p => { if (p) URL.revokeObjectURL(p.url); return { ...r, url }; });
      baixar({ url, arquivo: r.arquivo });
      void fetch("/api/dashboard-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: location.pathname, titulo: r.titulo, paginas: r.paginas }) }).catch(() => undefined);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar o PDF.");
    } finally {
      setGerando(null);
    }
  }

  async function copiar() {
    if (!pronto) return;
    try { await navigator.clipboard.writeText(pronto.senha); setCopiado(true); } catch { setCopiado(false); }
  }

  return <>
    <button type="button" onClick={() => void gerar()} disabled={!!gerando} data-pdf="ocultar"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 disabled:opacity-80 print:hidden"
      title="Gerar PDF desta tela protegido por senha">
      {gerando ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}{gerando ? "Gerando…" : "PDF"}
    </button>

    {gerando && <div data-pdf="ocultar" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 font-semibold text-slate-700 shadow-xl"><Loader2 className="animate-spin text-blue-600" />{gerando}</div>
    </div>}

    {erro && <div data-pdf="ocultar" role="alert" className="fixed bottom-20 right-5 z-50 flex max-w-sm items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-lg">
      <span className="flex-1">{erro}</span><button type="button" aria-label="Fechar" onClick={() => setErro("")}><X size={16} /></button>
    </div>}

    {pronto && <div data-pdf="ocultar" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pdf-senha-titulo">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><ShieldCheck size={22} /></span>
            <div><h2 id="pdf-senha-titulo" className="text-lg font-extrabold text-slate-900">PDF gerado e protegido</h2><p className="text-sm text-slate-500">{pronto.titulo} · {pronto.paginas} {pronto.paginas === 1 ? "página" : "páginas"}</p></div></div>
          <button type="button" aria-label="Fechar" onClick={() => setPronto(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-600"><KeyRound size={16} />Senha para abrir o arquivo</p>
        <div className="mt-2 flex items-center gap-3">
          <output className="flex-1 rounded-2xl bg-slate-100 py-3 text-center font-mono text-4xl font-bold tracking-[0.35em] text-slate-900" aria-label={`Senha ${pronto.senha.split("").join(" ")}`}>{pronto.senha}</output>
          <button type="button" onClick={() => void copiar()} className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50" title="Copiar senha">{copiado ? <Check className="text-emerald-600" /> : <Copy />}</button>
        </div>
        <ul className="mt-4 space-y-1 text-xs text-slate-500">
          <li>• Anote agora: a senha <b>não fica guardada</b> e não aparece de novo. Para outra senha, gere outro PDF.</li>
          <li>• Envie a senha por um canal diferente do arquivo (ex.: arquivo por e-mail, senha por telefone).</li>
          <li>• O arquivo usa criptografia AES-256; imprimir e copiar texto são permitidos, editar não.</li>
        </ul>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => baixar(pronto)} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><Download size={16} />Baixar de novo</button>
          <button type="button" onClick={() => setPronto(null)} className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Concluir</button>
        </div>
      </div>
    </div>}
  </>;
}
