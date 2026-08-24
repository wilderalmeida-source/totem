"use client";

import { useRouter } from "next/navigation";
import { PointerEvent, useEffect, useRef, useState } from "react";

const HOLD_DURATION_MS = 5_000;

type AdminAccessTriggerProps = {
  companyName: string;
};

export default function AdminAccessTrigger({ companyName }: AdminAccessTriggerProps) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);

  function cancelHold() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(0);
  }

  function startHold() {
    cancelHold();
    const startedAt = Date.now();
    setProgress(1);
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min((elapsed / HOLD_DURATION_MS) * 100, 100));
    }, 50);
    timer.current = setTimeout(() => {
      timer.current = null;
      if (progressTimer.current) clearInterval(progressTimer.current);
      progressTimer.current = null;
      setProgress(100);
      router.push("/login");
    }, HOLD_DURATION_MS);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startHold();
  }

  useEffect(() => cancelHold, []);

  return (
    <>
      {progress > 0 && (
        <div className="fixed inset-x-0 top-0 z-[100] h-2 bg-slate-200" aria-hidden="true">
          <div
            className="h-full bg-blue-600 transition-[width] duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      <button
      type="button"
      aria-label={`Acesso administrativo — ${companyName}`}
      onPointerDown={handlePointerDown}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onPointerLeave={cancelHold}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.repeat) startHold();
      }}
      onKeyUp={cancelHold}
      onBlur={cancelHold}
      className="select-none bg-transparent p-0 text-inherit outline-none"
    >
      {companyName}
      </button>
    </>
  );
}
