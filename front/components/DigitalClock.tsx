"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export default function DigitalClock() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const update = () => setTime(formatTime(new Date()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <time
      aria-label={`Horário atual: ${time}`}
      className="mb-2 select-none font-mono text-lg font-medium tabular-nums tracking-wide text-slate-500"
    >
      {time}
    </time>
  );
}
