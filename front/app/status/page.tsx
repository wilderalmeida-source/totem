"use client";
import { StatsResponse, VoiceStatus, DailyUsage} from "../../services/fetchData";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
type WsEvent =
  | { type: "tts:delta"; payload: { date: string; chars: number; requestsInc: number } }
  | { type: "tts:stats"; payload: { dailyUsage: DailyUsage[] } };
export default function VoiceStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  
  function isWsEvent(msg: unknown): msg is WsEvent { // FORÇA A TIPAGEM DE EVENTOS
  if (!msg || typeof msg !== "object") return false;
  if (!("type" in msg)) return false;
  const t = (msg as { type?: unknown }).type;
  return t === "tts:delta" || t === "tts:stats";
}
  useEffect(() => { //WEBSOCKETS
  const eventSource = new EventSource('/api/events');
  eventSource.onmessage = (event) => {
    if (!isWsEvent(event)) return;
      try {
        // A ponte envia um JSON com { message: "...", timestamp: "..." }
        const bridgePayload = JSON.parse(event.data);
        // O dado real vindo do Node.js está em bridgePayload.message
        const msg = JSON.parse(bridgePayload.message);
    if (msg.type === "tts:delta") {
      const { date, chars, requestsInc } = msg.payload;
      setStats((prev) => {
        if (!prev) return prev;

        const list = [...prev.dailyUsage];
        const idx = list.findIndex((x) => x.date === date);

        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            chars: list[idx].chars + chars,
            requests: list[idx].requests + requestsInc,
          };
        } else {
          list.unshift({ date, chars: chars, requests: requestsInc });
        }

        return { ...prev, dailyUsage: list };
      });
    }

    if (msg.type === "tts:stats") {
      setStats((prev) => (prev ? { ...prev, dailyUsage: msg.payload.dailyUsage } : prev));
    }
  }catch{}};

}, [setStats]);
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await VoiceStatus();
        const data = await res
        setStats(data);
      } catch (e) {
        console.error("Erro ao buscar stats:", e);
      } finally {
        setLoading(false);
      }
    }
    if(loading===true){
    fetchStats();
    }
  }, [loading,stats]);
  
  
  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Erro ao carregar dados.</div>;
  }

  return (
    <div className="p-6 space-y-8">
         <Link href="/configuracao"><Button>Configurações</Button></Link>
         <Link href="/dic" className="ml-3"><Button>Dicionário</Button></Link>
      {/* Card voz da semana */}
      <div className="border rounded-xl p-4 shadow-sm bg-white">
        <h1 className="text-2xl font-bold mb-2">Voz da semana</h1>
        <p className="text-sm text-gray-500">
          Semana {stats.currentWeek.week} de {stats.currentWeek.year}
        </p>
        <p className="mt-2 text-lg font-semibold">
          {stats.currentWeek.voiceName}
        </p>
      </div>

        {/*Mostra se a voz é automatica ou não*/}
       <div className="text-sm border rounded-2xl p-5 shadow-sm bg-white space-y-3">
          <div className=" flex flex-1 flex-row gap-8">
            <div>
              <span className="text-gray-500">Voz automática:</span>{" "}
              <span className="font-medium">{stats.currentWeek.autoVoice}</span>
            </div>
            <div>
              <span className="text-gray-500">Voz Velocidade:</span>{" "}
              <span className="font-medium">{stats.rate}</span>
            </div>
          </div>
          <div>
            <span className="text-gray-500">Override:</span>{" "}
            <span className="font-medium">{stats.currentWeek.overrideVoice ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Env forçada:</span>{" "}
            <span className="font-medium">{stats.currentWeek.envForced ?? "—"}</span>
          </div>
          <div>
            <span className="text-gray-500">Voz em uso:</span>{" "}
            <span className="text-lg font-semibold">{stats.currentWeek.voiceName}</span>
          </div>
        </div>

      {/* Uso diário */}
      <div className="border rounded-xl p-4 shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-3">Uso diário (últimos 30 dias)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Data</th>
                <th className="text-right py-2 pr-4">Caracteres</th>
                <th className="text-right py-2 pr-4">Requisições</th>
              </tr>
            </thead>
            <tbody>
              {stats.dailyUsage.map((d) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="py-1 pr-4">
                    {new Date(d.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="py-1 pr-4 text-right">{d.chars}</td>
                  <td className="py-1 pr-4 text-right">{d.requests}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vozes por semana */}
      <div className="border rounded-xl p-4 shadow-sm bg-white">
        <h2 className="text-xl font-bold mb-3">Histórico de vozes por semana</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Ano</th>
                <th className="text-left py-2 pr-4">Semana</th>
                <th className="text-left py-2 pr-4">Voz</th>
                <th className="text-left py-2 pr-4">Registrado em</th>
              </tr>
            </thead>
            <tbody>
              {stats.weekVoices.map((w) => (
                <tr key={w.id} className="border-b last:border-0">
                  <td className="py-1 pr-4">{w.year}</td>
                  <td className="py-1 pr-4">{w.week}</td>
                  <td className="py-1 pr-4">{w.voiceName}</td>
                  <td className="py-1 pr-4">
                    {new Date(w.createdAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}