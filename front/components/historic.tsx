'use client';

import React, {
  ReactElement,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
  useTransition,
} from 'react';
import Image from 'next/image';
import ok from '../assets/icons/ok.png';
import atention from '../assets/icons/atention.png';
import { BuscaSenha, SenhasResponse } from "../services/fetchData";

/** ===== Utils ===== **/
function uniqBy<T>(arr: T[], keyFn: (x: T) => string) {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = keyFn(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default function Historic() {
  const [dados, setDados] = useState<SenhasResponse>({ senhasnr: [], senhas: [] });
  const [loading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await BuscaSenha();
      if (!response) throw new Error(`HTTP ${response}`);
      const listagem: SenhasResponse = response;
      
      // Atualização não-bloqueante da UI (Excelente para totens)
      startTransition(() => setDados(listagem));
    } catch (e) {
      console.error('[Historic] fetchData error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [startTransition]);

  // Throttle para conter avalanche de requisições do WebSocket
  const throttleRef = useRef<number | null>(null);
  const scheduleFetch = useCallback(() => {
    if (throttleRef.current !== null) return;
    throttleRef.current = window.setTimeout(() => {
      throttleRef.current = null;
      void fetchData();
    }, 250);
  }, [fetchData]);

  useEffect(() => {
    let aborted = false;

    // 1) Primeira carga de dados ao iniciar
    void fetchData();

    // 2) Conexão com o Server-Sent Events (SSE) / Bridge do WebSocket
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const bridgePayload = JSON.parse(event.data);
        const msg = JSON.parse(bridgePayload.message);
        
        if (!msg || (msg.type && !['db', 'tcp'].includes(msg.type))) return;
        if (!aborted) scheduleFetch();
      } catch {
        console.log("Erro conexão WS");
      }
    };

    return () => {
      aborted = true;
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
      eventSource.close(); // Garante o fechamento da conexão ao desmontar o totem
    };
  }, [fetchData, scheduleFetch]);

  /** ===== Deduplicações & filtros (memo) ===== **/
  const senhasnrUnique = useMemo(() => {
    const base = dados?.senhasnr ?? [];
    return uniqBy(base, (s) => {
      const status = s.dt_saida ? 'finalizado' : 'pendente';
      return `${s.ds_paciente}|${status}`;
    });
  }, [dados?.senhasnr]);

  const senhasFiltered = useMemo(() => {
    const base = dados?.senhas ?? [];
    return base.filter((s) => s.ds_local !== 'RESULTADO' && s.atendimentos && s.atendimentos.length > 0);
  }, [dados?.senhas]);

  const senhasUnique = useMemo(() => {
    return uniqBy(senhasFiltered, (s) => {
      const pac = s.atendimentos?.[0]?.pacientes_atendimentos_cd_pacienteTopacientes;
      const id = pac?.cd_paciente ?? 0;
      const status = s.dt_saida ? 'finalizado' : 'pendente';
      return `${id}|${status}`;
    });
  }, [senhasFiltered]);

  /** ===== Contadores (memo) ===== **/
  const atendidos = useMemo(() => senhasUnique.filter((s) => s.dt_saida).length, [senhasUnique]);
  const entregues = useMemo(() => senhasnrUnique.filter((s) => s.dt_saida).length, [senhasnrUnique]);

  /** ===== Tabelas (memo) ===== **/
  const tabela1: (ReactElement | null)[] = useMemo(() => {
    return senhasUnique.map((s) => {
      const pac = s.atendimentos?.[0]?.pacientes_atendimentos_cd_pacienteTopacientes;
      
      // Ajuste na chave estável usando também o código da senha para evitar colisão caso o ID do paciente venha nulo
      const key = `a-${pac?.cd_paciente ?? 'sem-id'}-${s.cd_senha}-${s.dt_saida ? '1' : '0'}`; 
      
      if (!pac) return null; // Retornar null evita trs órfãs e vazias quebrando a tabela

      return (
        <tr
          key={key}
          className="border-b bg-gray-200/[0.6] dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <td className="font-bold uppercase w-64">
            {/* ds_paciente já vem perfeitamente mascarado do Fastify Backend */}
            <p className="px-2 truncate w-64">{pac.ds_paciente}</p>
          </td>
          <td className="px-3 py-2 w-1/5">
            {s.dt_saida ? (
              <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
            ) : (
              <Image className="mx-auto" width={20} height={20} src={atention} alt="Caution" />
            )}
          </td>
        </tr>
      );
    });
  }, [senhasUnique]);

  const tabela2: ReactElement[] = useMemo(() => {
    return senhasnrUnique.map((s) => {
      const key = `e-${s.ds_paciente}-${s.cd_senha}-${s.dt_saida ? '1' : '0'}`; 
      return (
        <tr
          key={key}
          className="border-b bg-gray-200/[0.6] dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <td className="font-bold uppercase w-64">
            <p className="px-2 truncate w-64">{s.ds_paciente}</p>
          </td>
          <td className="px-3 py-2 w-1/5">
            {s.dt_saida ? (
              <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
            ) : (
              <Image className="mx-auto" width={20} height={20} src={atention} alt="Caution" />
            )}
          </td>
        </tr>
      );
    });
  }, [senhasnrUnique]);

  /** ===== Render ===== **/
  return (
    <>
      <div className="ml-3 flex">
        {/* SEÇÃO: ATENDIMENTO */}
        <div className="mr-5">
          <div className="ml-3">
            <h1 className="text-xl font-semibold">Atendimento</h1>
            <h2>
              Total: {tabela1.filter(Boolean).length} | Atendidos: {atendidos} | Restantes:{' '}
              {tabela1.filter(Boolean).length - atendidos}
            </h2>
          </div>

          <div className="overflow-y-auto h-80 no-scrollbar xl:h-36 lg:h-44">
            {loading && <div className="p-2 text-sm text-gray-500">Atualizando…</div>}
            {!loading && (
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 h-4">
                <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-400 sticky top-0 bg-primary">
                  <tr>
                    <th scope="col" className="px-6 py-3 w-64 bg-slate-300">Nome</th>
                    <th scope="col" className="px-6 py-3 w-1/5 bg-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="h-4 bg-ternary">{tabela1}</tbody>
              </table>
            )}
          </div>
        </div>

        {/* SEÇÃO: ENTREGA */}
        <div>
          <div className="ml-3">
            <h1 className="text-xl font-semibold">Entrega</h1>
            <h2>
              Total: {tabela2.length} | Atendidos: {entregues} | Restantes:{' '}
              {tabela2.length - entregues}
            </h2>
          </div>

          <div className="overflow-y-auto h-80 no-scrollbar xl:h-36 lg:h-44">
            {loading && <div className="p-2 text-sm text-gray-500">Atualizando…</div>}
            {!loading && (
              <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 h-4">
                <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-400 sticky top-0 bg-primary">
                  <tr>
                    <th scope="col" className="px-6 py-3 w-64 bg-slate-300">Nome</th>
                    <th scope="col" className="px-6 py-3 w-1/5 bg-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody className="h-4 bg-ternary">{tabela2}</tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Indicador suave de background-sync via React Transition */}
      {isPending && (
        <div className="ml-3 mt-2 text-xs text-gray-400 animate-pulse">Sincronizando dados…</div>
      )}
    </>
  );
}