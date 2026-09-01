"use client";
import { useEffect, useState } from "react";
import { Clock3, Save } from "lucide-react";
type Settings = { toleranceMinutes: number; timeBasis: "EXAM" | "ARRIVAL" };
export default function Page() {
  const [settings, setSettings] = useState<Settings>({ toleranceMinutes: 0, timeBasis: "ARRIVAL" }); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { fetch("/api/late-settings", { cache: "no-store" }).then((res) => res.json()).then(setSettings); }, []);
  async function save() { setSaving(true); const res = await fetch("/api/late-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) }); const data = await res.json(); setMessage(res.ok ? "Configuração salva." : data.error ?? "Não foi possível salvar."); setSaving(false); }
  return <main className="p-5 md:p-10"><div className="mx-auto max-w-3xl"><header className="mb-8 flex items-center gap-4"><span className="rounded-2xl bg-red-600 p-3 text-white"><Clock3 /></span><div><p className="text-sm font-bold uppercase tracking-widest text-red-600">Atendimentos</p><h1 className="text-3xl font-bold">Destaque de atrasos</h1></div></header><section className="space-y-7 rounded-2xl border bg-white p-6 shadow-sm">
    <label className="block"><span className="font-bold">Tolerância após o horário</span><p className="mb-3 text-sm text-slate-500">O destaque aparece somente após este período.</p><input type="number" min={0} max={1440} value={settings.toleranceMinutes} onChange={(e) => setSettings({ ...settings, toleranceMinutes: Number(e.target.value) })} className="w-32 rounded-xl border px-4 py-3" /> <span>minutos</span></label>
    <fieldset><legend className="font-bold">Horário usado</legend><p className="mb-3 text-sm text-slate-500">A chegada é o horário do exame menos a antecedência da sala.</p><div className="grid gap-3 sm:grid-cols-2">{[["EXAM", "Hora do exame"], ["ARRIVAL", "Hora de chegada"]].map(([value, label]) => <label key={value} className={`cursor-pointer rounded-xl border p-4 ${settings.timeBasis === value ? "border-blue-600 bg-blue-50" : ""}`}><input type="radio" className="mr-3" checked={settings.timeBasis === value} onChange={() => setSettings({ ...settings, timeBasis: value as Settings["timeBasis"] })} />{label}</label>)}</div></fieldset>
    <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50"><Save size={18} />{saving ? "Salvando..." : "Salvar configuração"}</button>{message && <p className="font-semibold">{message}</p>}
  </section></div></main>;
}
