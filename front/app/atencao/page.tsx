"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Settings, Book } from 'lucide-react';
import { AtentionCreateSound, AtentionGetText, AtentionSound } from '@/services/fetchData';

export default function AtencaoPanel() {
  const [text, setText] = useState("Atenção, por favor fazer silêncio na recepção.");
  const [loading, setLoading] = useState(false);
  const [playIcon, setPlayIcon] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const getTextAudio = async () => {
      setLoading(true);
      try {
        const response = await AtentionGetText();
        if (response) {
          setText(response.audioContent);
        }
      } catch (error) {
        console.log(error)
      } finally {
        setLoading(false);
      }
    };

    getTextAudio();
  }, [])
  const speakWithBrowser = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

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
  }, []);
  const handleApplyAndListen = async () => {
    setLoading(true);
    try {
      // 1. Gera o áudio via POST
      const response = await AtentionCreateSound(text);
      if (response.audioContent) {
        await PlayTeste()
        alert("Áudio atualizado e reproduzido com sucesso!");
        const responseText = await AtentionGetText();
        if (responseText) {
          setText(responseText.audioContent);
        }
      } else if (response.errorTTS) {
        speakWithBrowser(response.errorTTS)
        alert("Áudio atualizado e reproduzido com sucesso!");
        const responseText = await AtentionGetText();
        if (responseText) {
          setText(responseText.audioContent);
        }
      }
    } catch (error) {
      console.error("Erro ao processar áudio:", error);
    } finally {
      setLoading(false);
    }
  };

  function waitCanPlay(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve) => {
      if (audio.readyState >= 4) return resolve();
      audio.addEventListener("canplaythrough", () => resolve(), { once: true });
    });
  }
  const PlayTeste = async () => {
    const next = !playIcon;          // ✅ decide ANTES
    setPlayIcon(next);

    // Se o próximo estado é "parar", pausa o áudio atual
    if (!next) {
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

      const audio64 = await AtentionSound("teste");
      const ttsBody = audio64.ttsBody
      if (ttsBody.errorTTS) {
        speakWithBrowser(ttsBody.errorTTS);
        setPlayIcon(false);
        return;
      }
      const proxyUrl = `/api/voice-proxy?path=${encodeURIComponent(ttsBody.audioContent)}&t=${Date.now()}`
      const audio = new Audio(proxyUrl);
      audio.preload = "auto";
      audio.load();

      audioRef.current = audio;

      // ✅ evita cortar o começo
      await waitCanPlay(audio);
      setTimeout(() => { audio.play() }, 400);

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

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-slate-800">
      {/* Header / Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="bg-[#0f172a] text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium">
          <Settings size={16} /> Configurações
        </button>
        <button className="bg-[#0f172a] text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium">
          <Book size={16} /> Dicionário
        </button>
      </div>
      {/* Input Area */}
      <div className="space-y-4 border-t pt-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Texto de Atenção</label>
          <textarea
            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Digite o texto que será convertido em voz..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleApplyAndListen}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? "Processando..." : <><Save size={20} /> Aplicar e Ouvir</>}
          </button>
        </div>
      </div>
    </div>
  );
}