"use client";
import { useEffect, useState } from "react";

type MediaType = "video" | "image" | null;

export default function Video() {
  const [mediaType, setMediaType] = useState<MediaType>(null);
  const [cacheBuster, setCacheBuster] = useState<number>(Date.now());

  useEffect(() => {
    async function detectType() {
      try {
        const res = await fetch("/api/media", { method: "HEAD", cache: "no-store" });

        if (!res.ok) {
          setMediaType(null);
          return;
        }

        const contentType = res.headers.get("Content-Type") ?? "";
        if (contentType.startsWith("video/")) setMediaType("video");
        else if (contentType.startsWith("image/")) setMediaType("image");
        else setMediaType(null);

        setCacheBuster(Date.now());
      } catch (err) {
        console.error("Erro ao detectar mídia:", err);
        setMediaType(null);
      }
    }

    detectType();
  }, []);

  if (!mediaType) {
    return <div className="w-full h-full bg-gray-100 rounded-lg" />;
  }

  const src = `/api/media?t=${cacheBuster}`;

  return (
    <aside className="bg-white rounded-2xl shadow-soft row-span-2 h-full flex flex-col">
      <div className="flex-1 min-h-0 w-full h-full">
        {mediaType === "video" ? (
          <video
            key={src}
            className="w-full h-full object-cover rounded-lg"
            autoPlay
            muted
            loop
            playsInline
          >
            <source src={src} />
          </video>
        ) : (
          <img
            src={src}
            alt="Propaganda"
            className="w-full h-full object-cover rounded-lg"
          />
        )}
      </div>
    </aside>
  );
}