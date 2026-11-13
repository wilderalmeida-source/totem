"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date, showSeconds: boolean) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  }).format(date);
}

export default function DigitalClock({ showSeconds = true }: { showSeconds?: boolean }) {
  const [time, setTime] = useState(showSeconds ? "--:--:--" : "--:--");

  useEffect(() => {
    const update = () => setTime(formatTime(new Date(), showSeconds));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [showSeconds]);

  return (
    <time
      aria-label={`Horário atual: ${time}`}
      className="mb-2 select-none font-mono text-lg font-medium tabular-nums tracking-wide text-slate-500"
    >
      {time}
    </time>
  );
}
