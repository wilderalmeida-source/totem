"use client";

import { FormEvent, Suspense, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error || "Não foi possível entrar.");
        return;
      }

      const requested = searchParams.get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//")
        ? requested
        : "/configuracoes";
      router.replace(destination);
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <LockKeyhole size={28} />
        </div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Área restrita</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Configurações do Totem</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Entre com sua conta administrativa para continuar.</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Usuário
            <input name="username" autoComplete="username" required maxLength={100} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Senha
            <input name="password" type="password" autoComplete="current-password" required maxLength={256} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </label>

          {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

          <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            <LogIn size={19} /> {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <LoginForm />
    </Suspense>
  );
}
