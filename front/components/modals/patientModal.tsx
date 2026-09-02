"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Image from "next/image";
import OrbitProgress from "react-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sendClinux } from "@/services/sendClinux";
import {
  buscaPaciente,
  buscarRecepcoesModalidades,
  type Atendimento,
} from "@/services/api";
import { entregaDeExames } from "@/services/entregadeexames";
import ok from "@/assets/icons/ok.png";
import atention from "@/assets/icons/atention.png";
import { formatarDataNascimento } from "@/lib/formatdate";
import type { RecepcaoModalidade } from "@/services/api/types";
import { auditTotem } from "@/lib/audit-client";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface DadosPaciente {
  ds_paciente?: string;
  ds_telefone?: string;
  ds_celular?: string;
  ds_celular_web?: string;
  cd_paciente?: number;
  dt_nascimento?: string;
  servico: string | null;
  preferencial: number | undefined | null;
  qr?: boolean;
  ds_cpf?: string;
  ds_observacao?: string;
  tipo?: string;
  cd_modalidade?: number;
  ds_modalidade?: string;
  modalidade?: number;
}




function obterDataHoraAtendimento(atendimento: Atendimento): Date | null {
  if (!atendimento.dt_data) return null;

  const data = String(atendimento.dt_data).slice(0, 10);
  const hora = atendimento.dt_hora
    ? String(atendimento.dt_hora).match(/T(\d{2}:\d{2}:\d{2})/)?.[1] ?? "00:00:00"
    : "00:00:00";

  const dataHora = new Date(`${data}T${hora}`);
  return Number.isNaN(dataHora.getTime()) ? null : dataHora;
}

function extrairSegundosDoHorario(valor: string | null | undefined): number | null {
  if (!valor) return null;

  const texto = String(valor);
  const partes = texto.match(/(?:T|\s)(\d{2}):(\d{2})(?::(\d{2}))?/)
    ?? texto.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!partes) return null;

  return Number(partes[1]) * 3600 + Number(partes[2]) * 60 + Number(partes[3] ?? 0);
}

function formatarHoraChegada(atendimento: Atendimento): string {
  const horarioAtendimento = extrairSegundosDoHorario(atendimento.dt_hora);
  if (horarioAtendimento === null) return "Horário não informado";

  const antecedencia = extrairSegundosDoHorario(atendimento.salas?.dt_hora_chegada) ?? 0;
  const segundosNoDia = 24 * 60 * 60;
  const chegada = (horarioAtendimento - antecedencia + segundosNoDia) % segundosNoDia;
  const horas = Math.floor(chegada / 3600);
  const minutos = Math.floor((chegada % 3600) / 60);

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

type ConfiguracaoAtraso = { toleranceMinutes: number; timeBasis: "EXAM" | "ARRIVAL" };
function estaAtrasado(atendimento: Atendimento, config: ConfiguracaoAtraso, agora: number) {
  if (!atendimento.dt_data) return false;
  const exame = extrairSegundosDoHorario(atendimento.dt_hora);
  if (exame === null) return false;
  const antecedencia = config.timeBasis === "ARRIVAL" ? extrairSegundosDoHorario(atendimento.salas?.dt_hora_chegada) ?? 0 : 0;
  const referencia = exame - antecedencia + config.toleranceMinutes * 60;
  const inicioDia = new Date(`${String(atendimento.dt_data).slice(0, 10)}T00:00:00`);
  return !Number.isNaN(inicioDia.getTime()) && agora > inicioDia.getTime() + referencia * 1000;
}

function obterAtendimentoMaisProximo(
  atendimentos: Atendimento[] | null,
): Atendimento | null {
  const agora = Date.now();

  const validos = (atendimentos ?? [])
    .map((item) => {
      const atendimento = item as Atendimento;
      const dataHora = obterDataHoraAtendimento(atendimento);
      const cdModalidade = Number(atendimento.salas?.cd_modalidade ?? 0);

      return { atendimento, dataHora, cdModalidade };
    })
    .filter(
      (item) =>
        item.dataHora !== null &&
        item.cdModalidade > 0 &&
        (item.atendimento.exames?.length ?? 0) > 0,
    );

  const proximoFuturo = validos
    .filter((item) => item.dataHora!.getTime() >= agora)
    .sort((a, b) => a.dataHora!.getTime() - b.dataHora!.getTime())[0];

  if (proximoFuturo) return proximoFuturo.atendimento;

  // Se todos os horários do dia já passaram, usa o atendimento mais recente.
  return (
    validos.sort(
      (a, b) => b.dataHora!.getTime() - a.dataHora!.getTime(),
    )[0]?.atendimento ?? null
  );
}

interface ConfirmacaoRecepcao {
  recepcao: string;
  localizacao: string | null;
}

interface DialogPatientProps {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  dados: DadosPaciente | null;
  setDados: Dispatch<SetStateAction<DadosPaciente | null>>;
  exames: Atendimento[] | null;
  setExames: Dispatch<SetStateAction<Atendimento[] | null>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  tentativas: number | null;
  setTentativas: Dispatch<SetStateAction<number | null>>;
  invalido: string | null;
  setInvalido: Dispatch<SetStateAction<string | null>>;
}

// ─── Sub-componente: ícone de status ─────────────────────────────────────────
function StatusIcon({ done }: { done: boolean }) {
  return done ? (
    <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
  ) : (
    <Image
      className="mx-auto"
      width={20}
      height={20}
      src={atention}
      alt="Caution"
    />
  );
}

// ─── Sub-componente: label de serviço ────────────────────────────────────────
const SERVICO_LABEL: Record<string, string> = {
  B: "Atendimento",
  C: "Entrega de Exames",
  D: "Agendamento",
};

// ─── DialogPatient ────────────────────────────────────────────────────────────
export function DialogPatient({
  showModal,
  setShowModal,
  dados,
  setDados,
  exames,
  setExames,
  loading,
  setLoading,
  tentativas,
  invalido,
}: DialogPatientProps) {
  const [confirmacaoRecepcao, setConfirmacaoRecepcao] =
    useState<ConfirmacaoRecepcao | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(15);
  const [configAtraso, setConfigAtraso] = useState<ConfiguracaoAtraso>({ toleranceMinutes: 0, timeBasis: "ARRIVAL" });
  const [agora, setAgora] = useState(Date.now());
  const processandoRef = useRef(false);
  const aberturaRegistradaRef = useRef(false);
  const mostraHorarioPrevisto = dados?.servico === "B" || dados?.servico === "D";

  useEffect(() => {
    if (!showModal || !mostraHorarioPrevisto) return;
    fetch("/api/late-settings", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((value) => { if (value) setConfigAtraso(value); }).catch(() => undefined);
    const timer = window.setInterval(() => setAgora(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [showModal, mostraHorarioPrevisto]);

  useEffect(() => {
    if (!showModal) {
      aberturaRegistradaRef.current = false;
      return;
    }

    if (aberturaRegistradaRef.current || !dados?.ds_paciente) return;

    auditTotem('modal_paciente_aberto', 'modal', {
      nomePaciente: dados.ds_paciente,
    });
    aberturaRegistradaRef.current = true;
  }, [showModal, dados]);

  const finalizarAtendimento = () => {
    processandoRef.current = false;
    setLoading(false);
    setConfirmacaoRecepcao(null);
    setShowModal(false);
    window.location.href = "/";
  };

  const irParaInicio = () => {
    setTimeout(finalizarAtendimento, 600);
  };

  useEffect(() => {
    if (!confirmacaoRecepcao) return;
    setSegundosRestantes(15);

    const contador = window.setInterval(() => {
      setSegundosRestantes((valorAtual) => Math.max(valorAtual - 1, 0));
    }, 1000);

    const fechamentoAutomatico = window.setTimeout(() => {
      finalizarAtendimento();
    }, 15000);

    return () => {
      window.clearInterval(contador);
      window.clearTimeout(fechamentoAutomatico);
    };
  }, [confirmacaoRecepcao]);

  const gerarSenha = async (valorQR: string | null = null) => {
    auditTotem('confirmacao_senha', 'confirmacao', { servico: dados?.servico, preferencial: dados?.preferencial, pacienteId: dados?.cd_paciente, viaQr: Boolean(valorQR) });
    // Fluxo QR
    if (dados?.qr) {
      if (!valorQR) {
        window.alert("PACIENTE NÃO ENCONTRADO");
        return;
      }

      const listpaciente = await buscaPaciente({
        cd_paciente: parseInt(valorQR),
      });
      if (!listpaciente?.length) {
        window.alert("PACIENTE NÃO ENCONTRADO");
        return;
      }

      const newDados = {
        ...listpaciente[0],
        servico: dados.servico,
        preferencial: dados.preferencial,
        cd_modalidade: dados.cd_modalidade ?? dados.modalidade,
      };

      if (dados.servico === "C" && listpaciente[0].cd_paciente) {
        const entrega = await entregaDeExames(listpaciente[0].cd_paciente);
        setExames(
          entrega.filter((i) => [5].includes(i.status ?? -999)).slice(0, 10),
        );
      }

      setDados(newDados);
      return;
    }

    // Fluxo normal
    if (!dados) return;

    // Para agendamento, usa a modalidade do próximo atendimento do dia.
    // Para os demais serviços, mantém a modalidade já presente em dados.
    const atendimentoMaisProximo =
      dados.servico === "D" || dados.servico === "B"
      ? obterAtendimentoMaisProximo(exames)
      : null;

    const cdModalidade = Number(
      atendimentoMaisProximo?.salas?.cd_modalidade ??
        dados.cd_modalidade ??
        dados.modalidade ??
        0,
    );
    

    // Evita que clique, toque ou submit duplicado gere mais de uma senha.
    if (processandoRef.current) return;
    processandoRef.current = true;
    setLoading(true);

    await sendClinux({
      cd_paciente: dados.cd_paciente,
      ds_paciente: dados.ds_paciente,
      dt_nascimento: dados.dt_nascimento,
      preferencial: dados.preferencial,
      servico: dados.servico,
      cd_modalidade: cdModalidade || undefined,
    });

    if (!cdModalidade) {
      irParaInicio();
      return;
    }

    try {
      const resposta = await buscarRecepcoesModalidades();

      const recepcoes: RecepcaoModalidade[] = Array.isArray(resposta)
        ? resposta
        : [];


      const servicoAtual = String(dados.servico ?? "").trim().toUpperCase();


      const destino = recepcoes.find((item) => {
        const modalidadeRecepcao = Number(item.cd_modalidade);
        const servicoRecepcao = String(item.servico ?? "")
          .trim()
          .toUpperCase();

        const recepcaoAtiva =
          item.ativo === true ||
          String(item.ativo).toLowerCase() === "true" ||
          Number(item.ativo) === 1;

        const mesmaModalidade = modalidadeRecepcao === cdModalidade;
        const mesmoServico = servicoRecepcao === servicoAtual;

        return recepcaoAtiva && mesmaModalidade && mesmoServico;
      });


      if (!destino) {
        irParaInicio();
        return;
      }

      setLoading(false);
      setConfirmacaoRecepcao({
        recepcao: destino.recepcao,
        localizacao: destino.localizacao,
      });
    } catch (error) {
      console.error("Erro ao buscar recepção da modalidade:", error);
      irParaInicio();
    }
  };

  const handleCancelar = () => {
    const semPacienteNovo =
      !dados?.cd_paciente && !dados?.qr && dados?.tipo !== "NEW";
    if (tentativas && tentativas <= 0 && semPacienteNovo) {
      irParaInicio();
    } else {
      setShowModal(false);
    }
  };

  return (
    <Dialog
      open={showModal}
      onOpenChange={(aberto) => {
        if (confirmacaoRecepcao && !aberto) {
          finalizarAtendimento();
          return;
        }

        setShowModal(aberto);
      }}
    >
      <DialogContent>
        {confirmacaoRecepcao ? (
          <div className="flex flex-col gap-6 py-4 text-center">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-green-700">
                Cadastro realizado com sucesso!
              </DialogTitle>
              <DialogDescription className="text-xl font-semibold text-gray-700">
                Dirija-se para:
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <p className="text-3xl font-extrabold text-gray-900">
                {confirmacaoRecepcao.recepcao}
              </p>

              {confirmacaoRecepcao.localizacao && (
                <p className="mt-3 text-2xl font-bold text-gray-700">
                  {confirmacaoRecepcao.localizacao}
                </p>
              )}
            </div>

            <p className="text-base font-medium text-gray-500">
              Esta mensagem será fechada automaticamente em {segundosRestantes}{" "}
              segundo
              {segundosRestantes === 1 ? "" : "s"}.
            </p>

            <Button
              type="button"
              className="h-14 bg-green-600 text-xl font-bold text-white hover:bg-green-700"
              onClick={finalizarAtendimento}
            >
              Fechar
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            {!invalido && (
              <DialogHeader>
                <DialogTitle className="text-xl font-normal">
                  {SERVICO_LABEL[dados?.servico ?? ""] ?? "Atendimento"}
                </DialogTitle>
                <DialogDescription className="text-3xl font-bold text-black">
                  {dados?.qr
                    ? dados.ds_paciente
                    : `NOME: ${dados?.ds_paciente}`}
                </DialogDescription>
              </DialogHeader>
            )}

            {/* Conteúdo principal */}
            {invalido ? (
              <div>
                <h2 className="font-bold text-xl">{invalido}</h2>
                <p>Você tem {tentativas} tentativas restantes!</p>
              </div>
            ) : (
              <div>
                {dados?.ds_telefone && (
                  <h2 className="font-bold text-xl">
                    Telefone: {dados.ds_telefone}
                  </h2>
                )}
                {dados?.ds_celular && (
                  <h2 className="font-bold text-xl">
                    Celular: {dados.ds_celular}
                  </h2>
                )}
                {dados?.ds_celular_web && (
                  <h2 className="font-bold text-xl">
                    Celular 2: {dados.ds_celular_web}
                  </h2>
                )}
                {dados?.ds_observacao && (
                  <div>
                    <h2 className="font-bold text-xl">Obs.:</h2>
                    <p>{dados.ds_observacao}</p>
                  </div>
                )}
                {dados?.cd_paciente && (
                  <h2 className="font-bold text-xl">
                    ID Paciente: {dados.cd_paciente}
                  </h2>
                )}
                {dados?.dt_nascimento && (
                  <h2 className="font-bold text-xl">
                    Data de Nascimento:{" "}
                    {formatarDataNascimento(dados.dt_nascimento)}
                  </h2>
                )}
              </div>
            )}

            {/* Tabela de exames */}
            {!invalido && exames && exames.length > 0 && (
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-700 uppercase sticky top-0">
                  <tr>
                    <th className="px-6 py-3 w-64 bg-slate-300">Exame</th>
                    <th className="px-6 py-3 w-1/5 bg-slate-300">
                      {mostraHorarioPrevisto ? "Chegada prevista" : "Laudado"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {exames.flatMap((atend, ai) =>
                    (atend.exames ?? []).map((exame, ei) => (
                      <tr key={`${ai}-${ei}`} className={mostraHorarioPrevisto && estaAtrasado(atend, configAtraso, agora) ? "bg-red-50 text-red-950" : undefined}>
                        <td>
                          {
                            exame
                              .procedimentos_exames_cd_procedimentoToprocedimentos
                              ?.ds_procedimento
                          }
                        </td>
                        <td className={mostraHorarioPrevisto ? "font-bold text-gray-800" : undefined}>
                          {mostraHorarioPrevisto
                            ? formatarHoraChegada(atend)
                            : <StatusIcon done={!!exame.dt_assinado} />}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            )}

            {/* Form QR oculto */}
            {dados?.qr && (
              <form
                className="opacity-0"
                onSubmit={(e) => {
                  e.preventDefault();
                  const valor = (
                    e.currentTarget.elements.namedItem("ID") as HTMLInputElement
                  ).value;
                  void gerarSenha(valor);
                }}
              >
                <input type="text" name="ID" autoFocus />
                <button type="submit">enviar</button>
              </form>
            )}

            {/* Botão OK */}
            {!dados?.qr && dados?.servico !== "" && !invalido && (
              <Button
                type="button"
                variant="outline"
                className="bg-green-400"
                onClick={() => void gerarSenha()}
                disabled={loading}
              >
                {loading ? <OrbitProgress /> : "OK"}
              </Button>
            )}

            {/* Botão Cancelar */}
            <Button
              type="button"
              variant="outline"
              className="bg-red-400"
              onClick={handleCancelar}
            >
              Cancelar
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── PatientModal (wrapper com estado) ───────────────────────────────────────
export default function PatientModal() {
  const [showModal, setShowModal] = useState(false);
  const [dados, setDados] = useState<DadosPaciente | null>(null);
  const [exames, setExames] = useState<Atendimento[] | null>(null);
  const [tentativas, setTentativas] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [invalido, setInvalido] = useState<string | null>(null);

  const dialogPatientElement = (
    <DialogPatient
      showModal={showModal}
      setShowModal={setShowModal}
      dados={dados}
      setDados={setDados}
      exames={exames}
      setExames={setExames}
      loading={loading}
      setLoading={setLoading}
      tentativas={tentativas}
      setTentativas={setTentativas}
      invalido={invalido}
      setInvalido={setInvalido}
    />
  );

  return {
    setShowModal,
    DialogPatient: dialogPatientElement,
    setDados,
    setExames,
    setLoading,
    setTentativas,
    setInvalido,
  };
}
