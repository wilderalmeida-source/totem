"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import NowCard from "@/components/NowCard";
import QueueList, { QueuePerson } from "@/components/QueueList";
import Video from "@/components/Video";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TtsBody = { audioContent: string } | { errorTTS: string };

type WsMsg =
  | { type: "tcp"; ts?: number; data: string }
  | {
    type: "tts:audio";
    ts?: number;
    payload: {
      eventId?: string;
      eventID?: string;
      ttsBody: TtsBody;
    };
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

function isTtsAudioMsg(
  msg: unknown
): msg is Extract<WsMsg, { type: "tts:audio" }> {
  return (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    (msg as { type?: unknown }).type === "tts:audio" &&
    "payload" in msg
  );
}

// ---------------------------------------------------------------------------
// Audio Queue Types
// ---------------------------------------------------------------------------

type QueueItem =
  | {
    kind: "atencao-mp3";
    proxyUrl: string;
    key: string;
  }
  | {
    kind: "atencao-speech";
    text: string;
    key: string;
  }
  | {
    kind: "tcp";
    raw: string;
    guiche: string;
    nome: string;
    hora: string;
    key: string;
  }
  | {
    kind: "tts-mp3";
    proxyUrl: string;
    key: string;
    enqueuedAt: number;
  }
  | {
    kind: "tts-speech";
    text: string;
    key: string;
    enqueuedAt: number;
  };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Page() {
  // --- UI State ---
  const [atencaoVisible, setAtencaoVisible] = useState(false);
  const [guiche, setGuiche] = useState("");
  const [nome, setNome] = useState("SEM NOME");
  const [hora, setHora] = useState("");
  const [queue, setQueue] = useState<QueuePerson[]>([]);
  const [soundReady, setSoundReady] = useState(false);

  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundReadyRef = useRef(false);
  const currentTtsRef = useRef<HTMLAudioElement | null>(null);

  // Refs para o worker acessar os valores atuais da tela sem closure stale
  const nomeRef = useRef<string>("SEM NOME");
  const guicheRef = useRef<string>("");

  const playQueueRef = useRef<QueueItem[]>([]);
  const workerRunningRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const lastPlayedRef = useRef<{ key: string; finishedAt: number } | null>(null);

  // Mantém nome/guiche sincronizados nos refs para o worker
  useEffect(() => {
    nomeRef.current = nome;
  }, [nome]);

  useEffect(() => {
    guicheRef.current = guiche;
  }, [guiche]);

  // --- Sound setup ---
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

  // Fallback: auto-enable sound after 10 s
  useEffect(() => {
    const id = window.setTimeout(() => setSoundReady(true), 10000);
    return () => window.clearTimeout(id);
  }, []);

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

  // ---------------------------------------------------------------------------
  // Low-level audio helpers
  // ---------------------------------------------------------------------------

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

  const playAudioUrl = useCallback((proxyUrl: string): Promise<void> => {
    return new Promise((resolve) => {
      const audio = new Audio(proxyUrl);
      audio.preload = "auto";
      currentTtsRef.current = audio;
      const done = () => {
        if (currentTtsRef.current === audio) currentTtsRef.current = null;
        resolve();
      };
      audio.addEventListener("ended", done, { once: true });
      audio.addEventListener("error", done, { once: true });
      audio.play().catch(done);
    });
  }, []);

  const speakText = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      const trySpeak = () => {
        const voz = window.speechSynthesis
          .getVoices()
          .find((v) => v.lang === "pt-BR");
        if (voz) utterance.voice = voz;
        window.speechSynthesis.speak(utterance);
      };
      if (window.speechSynthesis.getVoices().length > 0) {
        trySpeak();
      } else {
        window.speechSynthesis.onvoiceschanged = trySpeak;
      }
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Queue helpers
  // ---------------------------------------------------------------------------

  const prependAndReindex = useCallback(
    (arr: QueuePerson[], novo: Omit<QueuePerson, "id">): QueuePerson[] => {
      const shifted = arr.map((i) => ({ ...i, id: i.id + 1 }));
      return [{ id: 1, active: true, ...novo }, ...shifted];
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Worker — consome playQueueRef um item por vez
  // ---------------------------------------------------------------------------

  const REREAD_DELAY_MS = 4000;

  const runWorker = useCallback(async () => {
    if (workerRunningRef.current) return;
    workerRunningRef.current = true;

    while (playQueueRef.current.length > 0) {
      const item = playQueueRef.current[0];

      // Re-read delay
      if (
        item.kind !== "atencao-mp3" &&
        item.kind !== "atencao-speech" &&
        lastPlayedRef.current?.key === item.key
      ) {
        const elapsed = Date.now() - lastPlayedRef.current.finishedAt;
        const remaining = REREAD_DELAY_MS - elapsed;
        if (remaining > 0) {
          await new Promise<void>((r) => setTimeout(r, remaining));
        }
      }

      // ------------------------------------------------------------------
      // Play item
      // ------------------------------------------------------------------
      try {
        if (item.kind === "atencao-mp3") {
          setAtencaoVisible(true);

          if (currentTtsRef.current) {
            currentTtsRef.current.pause();
            currentTtsRef.current.currentTime = 0;
            currentTtsRef.current = null;
          }

          const audio = new Audio(item.proxyUrl);
          audio.preload = "auto";
          await new Promise<void>((resolve) => {
            audio.addEventListener("canplaythrough", () => resolve(), { once: true });
            audio.addEventListener("error", () => resolve(), { once: true });
            setTimeout(resolve, 3000);
            audio.load();
          });

          currentTtsRef.current = audio;
          await new Promise<void>((resolve) => {
            audio.addEventListener("ended", () => resolve(), { once: true });
            audio.addEventListener("error", () => resolve(), { once: true });
            audio.play().catch(() => resolve());
          });
          if (currentTtsRef.current === audio) currentTtsRef.current = null;

          setAtencaoVisible(false);
        } else if (item.kind === "atencao-speech") {
          setAtencaoVisible(true);
          if (currentTtsRef.current) {
            currentTtsRef.current.pause();
            currentTtsRef.current.currentTime = 0;
            currentTtsRef.current = null;
          }
          await speakText(item.text);
          setAtencaoVisible(false);
        } else if (item.kind === "tcp") {
          // ----------------------------------------------------------------
          // Antes de trocar o nome na tela, empurra o nome ATUAL para a fila
          // visual. Isso garante que a queue só cresce 1 item por vez,
          // sincronizado com o worker — não com a chegada das mensagens SSE.
          // ----------------------------------------------------------------
          const prevNome = nomeRef.current;
          const prevGuiche = guicheRef.current;

          if (prevNome && prevNome !== "SEM NOME") {
            setQueue((q) =>
              prependAndReindex(q, {
                name: prevNome,
                instruction:
                  prevGuiche === "00"
                    ? "ENTREGA DE EXAMES"
                    : `GUICHÊ: ${prevGuiche}`,
              })
            );
          }

          setNome(item.nome);
          setGuiche(item.guiche);
          setHora(item.hora);

          await playDing();
        } else if (item.kind === "tts-mp3") {
          await playDing();
          await playAudioUrl(item.proxyUrl);
        } else if (item.kind === "tts-speech") {
          await playDing();
          await speakText(item.text);
        }
      } catch (err) {
        console.warn("Audio queue item error:", err);
      }

      lastPlayedRef.current = { key: item.key, finishedAt: Date.now() };
      playQueueRef.current.shift();

      pendingKeyRef.current =
        playQueueRef.current.length > 0
          ? playQueueRef.current[0].key
          : null;

      if (playQueueRef.current.length > 0) {
        await new Promise<void>((r) => setTimeout(r, 300));
      }
    }

    workerRunningRef.current = false;
  }, [playDing, playAudioUrl, speakText, prependAndReindex]);

  // ---------------------------------------------------------------------------
  // Enqueue helpers
  // ---------------------------------------------------------------------------

  const enqueue = useCallback(
    (item: QueueItem) => {
      const isAtencao =
        item.kind === "atencao-mp3" || item.kind === "atencao-speech";

      if (isAtencao) {
        const hasPendingAtencao = playQueueRef.current.some(
          (i) => i.kind === "atencao-mp3" || i.kind === "atencao-speech"
        );
        if (!hasPendingAtencao) {
          const insertAt = workerRunningRef.current ? 1 : 0;
          playQueueRef.current.splice(insertAt, 0, item);
        }
        runWorker();
        return;
      }

      const alreadyPending = playQueueRef.current.some(
        (i) => i.key === item.key
      );
      if (alreadyPending) {
        console.log("⏱️ Descartado (já na fila):", item.key);
        return;
      }

      playQueueRef.current.push(item);
      pendingKeyRef.current = pendingKeyRef.current ?? item.key;
      runWorker();
    },
    [runWorker]
  );

  // ---------------------------------------------------------------------------
  // SSE handler
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.onmessage = (event) => {
      try {
        const bridgePayload = JSON.parse(event.data);
        let msg = bridgePayload.message;
        if (typeof msg === "string") msg = JSON.parse(msg);

        // ===== TCP (chamada de guichê) =====
        if (isTcpMsg(msg)) {
          const raw = msg.data;
          const parts = raw.split("-").map((p: string) => p.trim());
          const horaMin = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const guicheAux = parts[3] || "";
          const nomeAux = (parts[5] || "SEM NOME").trim();
          const key = raw.trim();

          // Apenas enfileira — a atualização da queue visual
          // acontece no worker, quando cada item é de fato tocado.
          enqueue({
            kind: "tcp",
            raw,
            guiche: guicheAux,
            nome: nomeAux,
            hora: horaMin,
            key,
          });
          return;
        }

        // ===== TTS =====
        if (isTtsAudioMsg(msg)) {
          const { ttsBody, eventID, eventId } = msg.payload;
          const id = eventID ?? eventId ?? "";

          if ("audioContent" in ttsBody) {
            const proxyUrl = `/api/voice-proxy?path=${encodeURIComponent(
              ttsBody.audioContent
            )}`;

            if (id === "atencao") {
              enqueue({ kind: "atencao-mp3", proxyUrl, key: "atencao" });
              return;
            }

            enqueue({
              kind: "tts-mp3",
              proxyUrl,
              key: String(id) || proxyUrl,
              enqueuedAt: Date.now(),
            });
            return;
          }

          if ("errorTTS" in ttsBody) {
            if (id === "atencao") {
              enqueue({
                kind: "atencao-speech",
                text: ttsBody.errorTTS,
                key: "atencao",
              });
              return;
            }

            enqueue({
              kind: "tts-speech",
              text: ttsBody.errorTTS,
              key: String(id) || ttsBody.errorTTS,
              enqueuedAt: Date.now(),
            });
            return;
          }
        }
      } catch {
        console.log("Erro na mensagem");
      }
    };

    return () => eventSource.close();
  }, [enqueue]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
          instruction={
            guiche === "00" ? "ENTREGA DE EXAMES" : "GUICHÊ: " + guiche
          }
        />
        <Video />
        <QueueList people={queue} />
      </main>
    </div>
  );
}
