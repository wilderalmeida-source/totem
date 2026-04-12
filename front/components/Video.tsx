"use client";
import { useRef } from "react";

export default function Video() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <aside className="bg-white rounded-2xl shadow-soft row-span-2 h-full flex flex-col">
      {/* Cabeçalho fixo */}
      {/* Vídeo ocupa todo restante do aside */}
      <div className="flex-1 min-h-0">
        <video
          ref={videoRef}
          className="w-full h-full object-cover rounded-lg"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/videos/propaganda.webm" type="video/webm" />
          Seu navegador não suporta vídeo HTML5.
        </video>
      </div>
    </aside>
  );
}