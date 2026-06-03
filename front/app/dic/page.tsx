"use client";
import {
  DictionaryDelete,
  DictionaryList,
  DictionaryUpsert,
  DictItem,
} from "../../services/fetchData";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function VoiceStatsPage() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dict, setDict] = useState<DictItem[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const refreshAll = useCallback(async () => {
    const d = await DictionaryList(search);
    setDict(d.items);
  }, [search]);

  useEffect(() => {
    if (!loading) return;

    (async () => {
      try {
        await refreshAll();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [loading, refreshAll]);

  useEffect(() => {
    if (loading) return;

    const t = setTimeout(async () => {
      try {
        const d = await DictionaryList(search);
        setDict(d.items);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search, loading]);

  async function addDict() {
    const k = newKey.trim();
    const v = newValue.trim();
    if (!k || !v) return;

    setBusy("dictAdd");
    try {
      await DictionaryUpsert(k, v);
      setNewKey("");
      setNewValue("");
      await refreshAll(); // ✅ usa o refreshAll
    } finally {
      setBusy(null);
    }
  }

  async function removeDict(key: string) {
    setBusy(`dictDel:${key}`);
    try {
      await DictionaryDelete(key);
      await refreshAll(); // ✅ usa o refreshAll
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-8">
      <Link href="/configuracao">
        <Button>Configurações</Button>
      </Link>
      <Link href="/status" className="ml-3">
        <Button>Status</Button>
      </Link>

      <div className="border rounded-2xl p-5 shadow-sm bg-white space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-bold">Dicionário de nomes</h2>
            <p className="text-sm text-gray-500">
              Use para corrigir pronúncia/acentos (ex: graca → Graça, jose → José).
            </p>
          </div>

          <input
            className="border rounded-xl p-2 text-sm w-full sm:w-72"
            placeholder="Pesquisar (key ou value)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            className="border rounded-xl p-2"
            placeholder='Como chega (ex: "jose")'
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <input
            className="border rounded-xl p-2"
            placeholder='Como falar (ex: "José")'
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button
            disabled={busy === "dictAdd"}
            onClick={addDict}
            className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            Adicionar / Atualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Key</th>
                <th className="text-left py-2 pr-4">Value</th>
                <th className="text-left py-2 pr-4">Atualizado</th>
                <th className="text-right py-2 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {dict.map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-mono">{d.key}</td>
                  <td className="py-2 pr-4">{d.value}</td>
                  <td className="py-2 pr-4 text-gray-500">
                    {new Date(d.updatedAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button
                      disabled={busy === `dictDel:${d.key}`}
                      onClick={() => removeDict(d.key)}
                      className="px-3 py-1 rounded-lg border text-xs disabled:opacity-60"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}

              {dict.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-gray-500">
                    Nenhum item encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
