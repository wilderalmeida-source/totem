"use client";
import { useCallback, useEffect, useState } from "react";
type Media = { name: string; url: string; type: "video" | "image" };
export default function Video() {
  const [items, setItems] = useState<Media[]>([]); const [index, setIndex] = useState(0); const [seconds, setSeconds] = useState(10);
  useEffect(() => { fetch("/api/media", { cache: "no-store" }).then((res) => res.ok ? res.json() : null).then((data) => { setItems(data?.activeItems ?? []); setSeconds(data?.imageDurationSeconds ?? 10); }); }, []);
  const next = useCallback(() => setIndex((value) => items.length ? (value + 1) % items.length : 0), [items.length]); const current = items[index];
  useEffect(() => { if (!current || current.type === "video") return; const timer = window.setTimeout(next, seconds * 1000); return () => window.clearTimeout(timer); }, [current, seconds, next]);
  if (!current) return <div className="w-full h-full bg-gray-100 rounded-lg" />;
  return <aside className="bg-white rounded-2xl shadow-soft row-span-2 h-full"><div className="h-full w-full">{current.type === "video" ? <video key={current.url} src={current.url} className="h-full w-full rounded-lg object-cover" autoPlay muted playsInline onEnded={next} onError={next} /> : <img key={current.url} src={current.url} alt={current.name} className="h-full w-full rounded-lg object-cover" />}</div></aside>;
}
