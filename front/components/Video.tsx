"use client";
import { useRef, useState } from "react";

export default function Video() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  // Caminho base do arquivo (como todos têm o mesmo nome)
  const basePath = "/videos/propaganda";

  return (
    <aside className="bg-white rounded-2xl shadow-soft row-span-2 h-full flex flex-col">
      {/* Cabeçalho fixo */}
      {/* Vídeo/Imagem ocupa todo restante do aside */}
      <div className="flex-1 min-h-0 w-full h-full">
        {!videoFailed ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover rounded-lg"
            autoPlay
            muted
            loop
            playsInline
            // Se o último source falhar, ativa o fallback de imagem
            onError={() => setVideoFailed(true)} 
          >
            {/* 1º Busca WebM */}
            <source src={`${basePath}.webm`} type="video/webm" />
            {/* 2º Se não houver WebM, o navegador busca o MP4 */}
            <source src={`${basePath}.mp4`} type="video/mp4" />
            
            {/* Fallback caso o navegador não suporte a tag video de forma alguma */}
            <picture className="w-full h-full">
              <source srcSet={`${basePath}.jpeg`} type="image/jpeg" />
              <img 
                src={`${basePath}.png`} 
                alt="Propaganda" 
                className="w-full h-full object-cover rounded-lg"
              />
            </picture>
          </video>
        ) : (
          /* 3º e 4º Caso os arquivos de vídeo não existam ou quebrem */
          <picture className="w-full h-full">
            {/* Busca JPEG primeiro */}
            <source srcSet={`${basePath}.jpeg`} type="image/jpeg" />
            {/* Se não houver JPEG, renderiza o PNG por padrão */}
            <img 
              src={`${basePath}.png`} 
              alt="Propaganda" 
              className="w-full h-full object-cover rounded-lg"
            />
          </picture>
        )}
      </div>
    </aside>
  );
}