"use client";

import { useRouter } from "next/navigation";
import { PointerEvent, useEffect, useRef } from "react";

const HOLD_DURATION_MS = 5_000;

type AdminAccessTriggerProps = {
  companyName: string;
};

export default function AdminAccessTrigger({ companyName }: AdminAccessTriggerProps) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelHold() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function startHold() {
    cancelHold();
    timer.current = setTimeout(() => {
      timer.current = null;
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
  );
}
