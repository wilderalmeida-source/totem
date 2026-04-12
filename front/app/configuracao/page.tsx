"use client";
import {
  StatsResponse,
  VoiceList,
  VoiceStatus,
  VoiceItem,
  ApplyVoiceOverride,
  ClearVoiceOverride,
  SetRate,
  PlaySoundTest,
  SetVolume,
} from "../../services/fetchData";
import { Button } from "@/components/ui/button";
import OrbitProgress from "react-loading-indicator";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { FaPlay, FaPause } from "react-icons/fa";

export default function VoiceStatsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [voices, setVoice] = useState<VoiceItem[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [audioLoading, setAudioLoading] = useState(false);
  const [playIcon, setPlayIcon] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [testRate, setTestRate] = useState(1.0);
  const [volume, setVolume] = useState(0);
  const [volumeTest, setTestVolume] = useState(0);
  const [percent, setPercent] = useState(0);
  const [percentVT, setPercentVT] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ✅ deixe as helpers fora do refresh (pra não recriar tudo sem necessidade)
  const percentToValue = useCallback((percent: number) => {
    if (percent >= 0) return Math.round((percent / 100) * 16);
    return Math.round((percent / 100) * 96);
  }, []);

  const valueToPercent = useCallback((value: number) => {
    if (value >= 0) return Math.round((value / 16) * 100);
    return Math.round((value / 96) * 100);
  }, []);

  // ✅ refreshAll estável
  const refreshAll = useCallback(async () => {
    const [s, v] = await Promise.all([VoiceStatus(), VoiceList()]);

    setStats(s);
    setRate(s.rate ?? 1.0);
    setVoice(v.voices);

    // (você tinha setVolume 2x)
    const vol = s.volumeSound ?? 0;
    setVolume(vol);
    setPercent(valueToPercent(vol));

    // evita crash se currentWeek estiver vazio
    setSelectedVoice(s.currentWeek?.voiceName ?? "");
  }, [valueToPercent]);

  // ✅ roda uma vez ao montar (sem loop)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await refreshAll();
      } catch (e) {
        console.error("Erro ao buscar stats:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshAll]);

  const currentTags = useMemo(() => {
    if (!selectedVoice) return null;
    const v = voices.find((x) => x.name === selectedVoice);
    return v ? `${v.name.toUpperCase()} — ${v.tier.toUpperCase()} — ${v.gender === "female" ? "FEM" : "MAS"}` : null;
  }, [selectedVoice, voices]);

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (!stats) {
    return <div className="p-6 text-red-500">Erro ao carregar dados.</div>;
  }
  function waitCanPlay(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      if (audio.readyState >= 4) return resolve();
      audio.addEventListener("canplaythrough", () => resolve(), { once: true });
    });
  }
  const PlayTeste = async () => {
    const next = !playIcon;          // ✅ decide ANTES
    setAudioLoading(true)
    setPlayIcon(next);

    // Se o próximo estado é "parar", pausa o áudio atual
    if (!next) {
      setAudioLoading(false)
      audioRef.current?.pause();
      return;
    }

    try {
      // ✅ para qualquer áudio anterior
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      const audio64 = await PlaySoundTest(selectedVoice, testRate, volumeTest);
      const proxyUrl = `/api/voice-proxy?path=${encodeURIComponent(audio64.audioContent)}`
      const audio = new Audio(proxyUrl);
      audio.preload = "auto";
      audio.load();

      audioRef.current = audio;

      // ✅ evita cortar o começo
      await waitCanPlay(audio);
      setTimeout(() => { setAudioLoading(false); audio.play() }, 400);

      audio.addEventListener(
        "ended",
        () => {
          audioRef.current = null;
          setPlayIcon(false); // ✅ terminou = não está tocando
        },
        { once: true }
      );
    } catch (e) {
      console.warn("Falha ao preparar áudio TTS:", e);
      setPlayIcon(false);
      audioRef.current = null;
    }
  };
  async function applyOverride() {
    if (!stats) return;
    setBusy("override");
    try {
      await ApplyVoiceOverride(stats.currentWeek.year, stats.currentWeek.week, selectedVoice);
      await refreshAll()
    } finally {
      window.alert(`Voz ${selectedVoice} selecionada e ativada.`)
      setBusy(null);
    }
  }

  async function clearOverride() {
    if (!stats) return;
    setBusy("clearOverride");
    try {
      await ClearVoiceOverride(stats.currentWeek.year, stats.currentWeek.week);
      await refreshAll()
    } finally {
      window.alert("Modo automatico ativado.")
      setBusy(null);
    }
  }

  async function saveRate(r: number) {
    setBusy("rate");
    try {
      await SetRate(r);
      await refreshAll();
    } finally {
      setBusy(null);
    }
  }
  async function saveVolume(r: number) {
    setBusy("volume");
    try {
      await SetVolume(r);
      await refreshAll();
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="p-6 space-y-8">
      <Link href="/status"><Button>Status</Button></Link>
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

      {/* Select override */}
      <div className="pt-3 space-y-2 border rounded-xl p-4 shadow-sm bg-white">
        <label className="block text-sm font-medium">Selecionar voz manualmente</label>
        <div className="flex flex-1 items-center gap-4">
          <select
            className="w-2/5 border rounded-xl p-2"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name} — {v.tier.toUpperCase()} — {v.gender === "female" ? "FEM" : "MAS"}
              </option>
            ))}
          </select>
          <div className="flex flex-1 gap-3 w-full items-center">
            <span className="flex items-center gap-2 border-2 rounded-full px-3 border-black cursor-pointer w-2/12 h-1/4" onClick={() => { PlayTeste() }}>{audioLoading ? <OrbitProgress /> : playIcon ? <FaPause /> : <FaPlay />}Play</span>
            {/* Slider rate teste sound*/}
            <div className="pt-4">
              <label className="block text-sm font-medium mb-2">Velocidade da fala</label>
              <input
                type="range"
                min={0.6}
                max={1.4}
                step={0.05}
                value={testRate}
                onChange={(e) => setTestRate(Number(e.target.value))}
              />
              <div className="text-sm text-gray-600 mt-1">Atual: {testRate.toFixed(2)}x</div>
            </div>
            {/* Slider volume */}
            <div className="pt-4 flex flex-col items-center mb-24">
              <label className="text-sm font-medium mb-20">Volume da fala</label>
              <input
                type="range"
                min={-100}
                max={100}
                step={1}
                value={percentVT}
                onChange={(e) => {
                  const p = Number(e.target.value);
                  setPercentVT(p);
                  setTestVolume(percentToValue(p));
                }}
                className="-rotate-90"
              />
              <div className="text-sm text-gray-600 mt-1 ml-28">Atual: {percentVT}%</div>
            </div>
          </div>
        </div>
        {currentTags && <div className="text-xs text-gray-500">Selecionada: {currentTags}</div>}
        <div className="flex gap-2 pt-1">
          <button
            disabled={busy === "override"}
            onClick={applyOverride}
            className="px-3 py-2 rounded-xl bg-black text-white text-sm disabled:opacity-60"
          >
            Aplicar nesta semana
          </button>
          <button
            disabled={busy === "clearOverride"}
            onClick={clearOverride}
            className="px-3 py-2 rounded-xl border text-sm disabled:opacity-60"
          >
            Voltar para automático
          </button>
        </div>
      </div>

      {/* Slider rate */}
      <div className="flex flex-1 gap-10 border rounded-xl p-4 shadow-sm bg-white">
        <div className="pt-4 w-5/12">
          <label className="block text-sm font-medium mb-2">Velocidade da fala</label>
          <input
            type="range"
            min={0.6}
            max={1.4}
            step={0.05}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            onMouseUp={() => saveRate(rate)}
            onTouchEnd={() => saveRate(rate)}
            className="w-full"
          />
          <div className="text-sm text-gray-600 mt-1">Atual: {rate.toFixed(2)}x</div>
        </div>
        {/* Slider volume */}
        <div className="pt-4 flex flex-col items-center mb-24">
          <label className="text-sm font-medium mb-20">Volume da fala</label>
          <input
            type="range"
            min={-100}
            max={100}
            step={1}
            value={percent}
            onChange={(e) => {
              const p = Number(e.target.value);
              setPercent(p);
              setVolume(percentToValue(p));
            }}
            onMouseUp={() => saveVolume(volume)}
            onTouchEnd={() => saveVolume(volume)}
            className="-rotate-90"
          />
          <div className="text-sm text-gray-600 mt-1 ml-28">Atual: {percent}%</div>
        </div>
      </div>
    </div>
  );
}