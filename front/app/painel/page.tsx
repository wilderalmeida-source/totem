"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import NowCard from "@/components/NowCard";
import QueueList, { QueuePerson } from "@/components/QueueList";
import Video from "@/components/Video";

type WsMsg =
  | { type: "tcp"; ts?: number; data: string }
  | { type: "tts:audio"; ts?: number; payload: { eventId?: string; eventID?: string; audioContent?: string } };

function isTcpMsg(msg: unknown): msg is Extract<WsMsg, { type: "tcp" }> {
  return typeof msg === "object" && msg !== null && "type" in msg &&
    (msg as { type?: unknown }).type === "tcp" && "data" in msg &&
    typeof (msg as { data?: unknown }).data === "string";
}

function isTtsAudioMsg(msg: unknown): msg is Extract<WsMsg, { type: "tts:audio" }> {
  return typeof msg === "object" && msg !== null && "type" in msg &&
    (msg as { type?: unknown }).type === "tts:audio" && "payload" in msg;
}

export default function Page() {
  const lastMsgRef = useRef<string | null>(null);
  const lastValuesRef = useRef<{ nome: string; guiche: string } | null>(null);

  const playSeqRef = useRef(0);
  const currentTtsRef = useRef<HTMLAudioElement | null>(null);

  const lastEventIdRef = useRef<string | null>(null);
  const lastPlayedKeyRef = useRef<string | null>(null);
  const lastPlayedAtRef = useRef<number>(0);

  // ===== Atenção =====
  const [atencaoVisible, setAtencaoVisible] = useState(false);
  const atencaoPlayingRef = useRef(false);
  // AbortController para desbloquear a Promise se algo externo parar o áudio
  const atencaoAbortRef = useRef<AbortController | null>(null);

  const [guiche, setGuiche] = useState("");
  const [nome, setNome] = useState("SEM NOME");
  const [hora, setHora] = useState("");
  const [queue, setQueue] = useState<QueuePerson[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const soundReadyRef = useRef(false);

  useEffect(() => {
    const el = new Audio("/music/notification.mp3");
    el.preload = "auto";
    el.loop = false;
    el.volume = 1;
    audioRef.current = el;
  }, []);

  useEffect(() => { soundReadyRef.current = soundReady; }, [soundReady]);

  const enableSound = useCallback(async () => {
    try {
      const el = audioRef.current;
      if (el) { await el.play(); el.pause(); el.currentTime = 0; }
      setSoundReady(true);
    } catch (e) { console.warn("Falha ao habilitar som:", e); }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setSoundReady(true), 10000);
    return () => window.clearTimeout(id);
  }, []);

  // ✅ Para o áudio normal (ding + tts comum), MAS NUNCA o áudio de atenção
  const stopAllAudio = useCallback(() => {
    const ding = audioRef.current;
    if (ding) { ding.pause(); ding.currentTime = 0; }

    // Só para o TTS atual se NÃO for o áudio de atenção em andamento
    if (!atencaoPlayingRef.current) {
      const tts = currentTtsRef.current;
      if (tts) { tts.pause(); tts.currentTime = 0; }
      currentTtsRef.current = null;
    }
  }, []);

  // Para TUDO, incluindo atenção (usado somente dentro de playAtencaoAudio)
  const stopAllAudioForce = useCallback(() => {
    const ding = audioRef.current;
    if (ding) { ding.pause(); ding.currentTime = 0; }
    const tts = currentTtsRef.current;
    if (tts) { tts.pause(); tts.currentTime = 0; }
    currentTtsRef.current = null;
  }, []);

  const playDing = useCallback((delayMs = 600): Promise<void> => {
    return new Promise((resolve) => {
      const el = audioRef.current;
      if (!el || !soundReadyRef.current) { resolve(); return; }
      try {
        el.pause(); el.currentTime = 0;
        el.play().catch(() => resolve());
        window.setTimeout(resolve, delayMs);
      } catch { resolve(); }
    });
  }, []);

  const playTtsExclusive = useCallback(async (proxyUrl: string) => {
    stopAllAudio();
    const audio = new Audio(proxyUrl);
    audio.preload = "auto";
    currentTtsRef.current = audio;
    audio.addEventListener("ended", () => {
      if (currentTtsRef.current === audio) currentTtsRef.current = null;
    }, { once: true });
    try { await playDing(); await audio.play(); } catch { }
  }, [stopAllAudio, playDing]);

  // ✅ Atenção: não interrompe se já tocando; usa AbortController para nunca travar
  const playAtencaoAudio = useCallback(async (proxyUrl: string) => {
    if (atencaoPlayingRef.current) {
      console.log("⏱️ Atenção já em andamento, ignorado.");
      return;
    }

    // Aborta qualquer atenção anterior que porventura ainda esteja pendente
    atencaoAbortRef.current?.abort();
    const controller = new AbortController();
    atencaoAbortRef.current = controller;

    atencaoPlayingRef.current = true;
    setAtencaoVisible(true);

    // Para tudo (inclusive ding em andamento), mas não outro TTS normal — já protegido
    stopAllAudioForce();

    const audio = new Audio(proxyUrl);
    audio.preload = "auto";
    currentTtsRef.current = audio;

    await new Promise<void>((resolve) => {
      // Resolve quando o áudio terminar naturalmente
      audio.addEventListener("ended", () => resolve(), { once: true });
      // Resolve se ocorrer erro de reprodução
      audio.addEventListener("error", () => resolve(), { once: true });
      // Resolve se o AbortController for acionado externamente
      controller.signal.addEventListener("abort", () => resolve(), { once: true });

      audio.play().catch(() => resolve());
    });

    // Limpeza — independente do motivo que resolveu a Promise
    if (currentTtsRef.current === audio) currentTtsRef.current = null;
    atencaoAbortRef.current = null;
    setAtencaoVisible(false);
    atencaoPlayingRef.current = false;
  }, [stopAllAudioForce]);

  const prependAndReindex = useCallback(
    (arr: QueuePerson[], novo: Omit<QueuePerson, "id">): QueuePerson[] => {
      const shifted = arr.map((i) => ({ ...i, id: i.id + 1 }));
      return [{ id: 1, active: true, ...novo }, ...shifted];
    }, []
  );

  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const bridgePayload = JSON.parse(event.data);
        let msg = bridgePayload.message;
        if (typeof msg === 'string') msg = JSON.parse(msg);

        (async () => {
          const mySeq = ++playSeqRef.current;

          if (isTcpMsg(msg)) {
            // ✅ stopAllAudio agora respeita o áudio de atenção
            stopAllAudio();

            const raw = msg.data;
            const parts = raw.split('-').map((p: string) => p.trim());
            const horaMin = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            const guicheAux = parts[3] || "";
            const nomeAux = (parts[5] || "SEM NOME").trim();

            if (lastMsgRef.current !== raw.trim()) {
              const prev = lastValuesRef.current;
              if (prev && prev.nome !== nomeAux) {
                setQueue((q) => prependAndReindex(q, {
                  name: prev.nome,
                  instruction: prev.guiche === "00" ? "ENTREGA DE EXAMES" : `GUICHÊ: ${prev.guiche}`,
                }));
              }
            }

            lastMsgRef.current = raw.trim();
            lastValuesRef.current = { nome: nomeAux, guiche: guicheAux };
            setNome(nomeAux);
            setGuiche(guicheAux);
            setHora(horaMin);

            // ✅ Só toca o ding se atenção NÃO estiver em andamento
            if (!atencaoPlayingRef.current) {
              await playDing();
              if (mySeq !== playSeqRef.current) return;
            }
            return;
          }

          if (isTtsAudioMsg(msg)) {
            const pathDoNode = msg.payload?.audioContent;
            if (!pathDoNode) return;

            const proxyUrl = `/api/voice-proxy?path=${encodeURIComponent(pathDoNode)}`;
            const eventId = msg.payload?.eventID ?? msg.payload?.eventId ?? "";

            if (eventId === "atencao") {
              await playAtencaoAudio(proxyUrl);
              return;
            }

            // TTS normal — só executa se atenção não estiver rolando
            if (atencaoPlayingRef.current) return;

            const key = String(eventId);
            const now = Date.now();
            if (key && lastPlayedKeyRef.current === key && now - lastPlayedAtRef.current < 3000) {
              console.log("⏱️ Ignorado (cooldown 3s):", key);
              return;
            }

            lastPlayedKeyRef.current = key || null;
            lastPlayedAtRef.current = now;
            if (eventId) lastEventIdRef.current = eventId;

            await playTtsExclusive(proxyUrl);
            return;
          }
        })();
      } catch { console.log("Erro na mensagem"); }
    };
  }, [stopAllAudio, playDing, playTtsExclusive, playAtencaoAudio, prependAndReindex]);

  return (
    <div className="h-dvh w-screen max-w-none mx-auto px-6 pt-8 pb-4 bg-slate-200 bg-cover bg-center bg-no-repeat flex flex-col">

      {atencaoVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600">
          <span
            className="text-white font-black uppercase tracking-widest select-none"
            style={{ fontSize: "clamp(4rem, 15vw, 12rem)" }}
          >
            ATENÇÃO
          </span>
        </div>
      )}

      <header className="text-center mb-6">
        {!soundReady && (
          <button onClick={enableSound} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold">
            Habilitar som e voz
          </button>
        )}
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-[3fr,1fr] grid-rows-[1fr,1fr] gap-6 pr-2">
        <NowCard
          name={nome}
          calledAt={hora}
          instruction={guiche === "00" ? "ENTREGA DE EXAMES" : "GUICHÊ: " + guiche}
        />
        <Video />
        <QueueList people={queue} />
      </main>
    </div>
  );
}