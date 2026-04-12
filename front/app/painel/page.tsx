"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import NowCard from "@/components/NowCard";
import QueueList, { QueuePerson } from "@/components/QueueList";
import Video from "@/components/Video";

type WsMsg =
  | { type: "tcp"; ts?: number; data: string }
  | {type: "tts:audio";ts?: number;payload: { eventId?: string; audioContent?: string;};
  };

function isTcpMsg(msg: unknown): msg is Extract<WsMsg, { type: "tcp" }> {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as { type?: unknown }).type === "tcp" &&
    "data" in msg &&
    typeof (msg as { data?: unknown }).data === "string"
  );
}

function isTtsAudioMsg(msg: unknown): msg is Extract<WsMsg, { type: "tts:audio" }> {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as { type?: unknown }).type === "tts:audio" &&
    "payload" in msg
  );
}

export default function Page() {
  const lastMsgRef = useRef<string | null>(null);
  const lastValuesRef = useRef<{ nome: string; guiche: string } | null>(null);

  // ===== Controle de concorrência =====
  const playSeqRef = useRef(0);
  const currentTtsRef = useRef<HTMLAudioElement | null>(null);

  // evita tocar o mesmo audio se chegar repetido
  const lastEventIdRef = useRef<string | null>(null);
  const lastPlayedKeyRef = useRef<string | null>(null);
  const lastPlayedAtRef = useRef<number>(0);


  const [guiche, setGuiche] = useState("");
  const [nome, setNome] = useState("SEM NOME");
  const [hora, setHora] = useState("");
  const [queue, setQueue] = useState<QueuePerson[]>([]);

  // ===== Ding =====
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundReady, setSoundReady] = useState(false);
  const soundReadyRef = useRef(false);

  // ===== Inicializa ding =====
  useEffect(() => {
    const el = new Audio("/music/notification.mp3");
    el.preload = "auto";
    el.loop = false;
    el.volume = 1;
    audioRef.current = el;
  }, []);

  useEffect(() => {
    soundReadyRef.current = soundReady;
  }, [soundReady]);

  const enableSound = useCallback(async () => {
    try {
      const el = audioRef.current;
      if (el) {
        await el.play();
        el.pause();
        el.currentTime = 0;
      }
      setSoundReady(true);
    } catch (e) {
      console.warn("Falha ao habilitar som:", e);
    }
  }, []);

  // timeout único (não criar N)
  useEffect(() => {
    const id = window.setTimeout(() => setSoundReady(true), 10000);
    return () => window.clearTimeout(id);
  }, []);

  const stopAllAudio = useCallback(() => {
    const ding = audioRef.current;
    if (ding) {
      ding.pause();
      ding.currentTime = 0;
    }

    const tts = currentTtsRef.current;
    if (tts) {
      tts.pause();
      tts.currentTime = 0;
    }

    currentTtsRef.current = null;
  }, []);

  const playDing = useCallback((delayMs = 600): Promise<void> => {
    return new Promise((resolve) => {
      const el = audioRef.current;
      if (!el || !soundReadyRef.current) {
        resolve();
        return;
      }

      try {
        el.pause();
        el.currentTime = 0;
        el.play().catch(() => resolve());
        window.setTimeout(resolve, delayMs);
      } catch {
        resolve();
      }
    });
  }, []);

  // ✅ garante exclusividade e deps corretas
  const playTtsExclusive = useCallback(
    async (proxyUrl:string) => {
      stopAllAudio();

      const audio = new Audio(proxyUrl);
      audio.preload = "auto";
      currentTtsRef.current = audio;

      audio.addEventListener(
        "ended",
        () => {
          if (currentTtsRef.current === audio) {
            currentTtsRef.current = null;
          }
        },
        { once: true }
      );

      try {
        await playDing();
        await audio.play();
      } catch { }
    },
    [stopAllAudio, playDing]
  );

  const prependAndReindex = useCallback(
    (arr: QueuePerson[], novo: Omit<QueuePerson, "id">): QueuePerson[] => {
      const shifted = arr.map((i) => ({ ...i, id: i.id + 1 }));
      return [{ id: 1, active: true, ...novo }, ...shifted];
    },
    []
  );

  // ===== Socket =====
  useEffect(() => {
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
    try{
    const bridgePayload = JSON.parse(event.data);
    let msg = bridgePayload.message;
    if (typeof msg === 'string') {
      msg = JSON.parse(msg);
    }
    
      (async () => {
        const mySeq = ++playSeqRef.current;
        

        // ✅ Mensagem TCP: atualiza UI + toca DING
        if (isTcpMsg(msg)) {
          stopAllAudio();

          const raw = msg.data;
          const parts = raw.split('-').map(p => p.trim());
          const horaMin = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });


          const guicheAux = parts[3] || "";

          const nomeAux = (parts[5] || "SEM NOME").trim();
          if (lastMsgRef.current !== raw.trim()) {
    const prev = lastValuesRef.current;
    if (prev && prev.nome !== nomeAux) {
      setQueue((q) =>
        prependAndReindex(q, {
          name: prev.nome,
          instruction: prev.guiche === "00" ? "ENTREGA DE EXAMES" : `GUICHÊ: ${prev.guiche}`,
        })
      );
            }
          }

        lastMsgRef.current = raw.trim();
        lastValuesRef.current = { nome: nomeAux, guiche: guicheAux };

        setNome(nomeAux);
        setGuiche(guicheAux);
        setHora(horaMin);

          await playDing();
          if (mySeq !== playSeqRef.current) return;

          return;
        }

        // ✅ Mensagem com áudio pronto do servidor: toca voz
        if (isTtsAudioMsg(msg)) {
          const pathDoNode = msg.payload?.audioContent;
          if (!pathDoNode) return;
          
          const proxyUrl = `/api/voice-proxy?path=${encodeURIComponent(pathDoNode)}`;
          const key = String(msg.payload?.eventId ?? ""); // estável
          const now = Date.now();

          if (
            key &&
            lastPlayedKeyRef.current === key &&
            now - lastPlayedAtRef.current < 3000
          ) {
            console.log("⏱️ Ignorado (cooldown 3s):", key);
            return;
          }

          lastPlayedKeyRef.current = key || null;
          lastPlayedAtRef.current = now;

          const eventId = msg.payload?.eventId ?? null;
          if (eventId) lastEventIdRef.current = eventId;

          await playTtsExclusive(proxyUrl);
          return;
        }
      })()}catch{console.log("Erro na mensagem")}};
    },[stopAllAudio, playDing, playTtsExclusive, prependAndReindex])

  return (
    <div className="h-dvh w-screen max-w-none mx-auto px-6 pt-8 pb-4 bg-slate-200 bg-cover bg-center bg-no-repeat flex flex-col">
      <header className="text-center mb-6">
        {!soundReady && (
          <button
            onClick={enableSound}
            className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold"
          >
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
