"use client";

import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Base from "@/components/ui/base";
import { modalContext } from "@/components/modals/providers";
import { PatientList } from "@/components/totem/patientList";
import { PatientSearchInput } from "@/components/totem/patientSearchInput";
import { SearchTypeSelector } from "@/components/totem/searchTypeSelector";
import { TotemHeader } from "@/components/totem/totemHeader";
import { VirtualKeyboard } from "@/components/totem/virtualKeyboard";
import { usePatientSearch } from "@/hooks/usePatientSearch";
import { buscarConfiguracaoPaineis, Paciente } from "@/services/api";
import { onlyNumbers, TipoBusca } from "@/lib/patientUtils";
import { buscarPacienteCPF } from "@/services/buscaCPF";
import { auditTotem } from "@/lib/audit-client";
import { deveSelecionarModalidade } from "@/lib/painel-selection";
export default function Totem() {
  const url = useSearchParams();
  const { setShowModal, setDados, setExames, setInvalido, setLoading, setTentativas } = useContext(modalContext);
  const router = useRouter();
  const [text, setText] = useState("");
  const [tipo, setTipo] = useState<TipoBusca>("DATA");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { pacientes, loading, error, pesquisar, clearPatients } =
    usePatientSearch(tipo);

  const servico = url.get("servico") ?? "";
  const preferencial = Number(url.get("preferencial") ?? 0);

  const title = useMemo(() => {
    if (servico === "C") return "Entrega de Exames";
    if (servico === "D") return "Agendamento";
    return "Atendimento";
  }, [servico]);

  const updateSearchText = useCallback(
    (value: string) => {
      const nextValue = (value ?? "").toUpperCase();
      setText(nextValue);
      pesquisar(nextValue);
    },
    [pesquisar]
  );
  async function handleCPFPatientClick(paciente: Paciente) {
  setLoading(true);

  try {
    const result = await buscarPacienteCPF(
      onlyNumbers(text),
      paciente.dt_nascimento ?? "",
      servico,
      preferencial
    );

    const configPainel = await buscarConfiguracaoPaineis();

    const temSelecaoModalidadeAtiva = deveSelecionarModalidade(configPainel, servico);

    const naoTemExames = !result.exames || result.exames.length === 0;

    if (tipo === "CPF" && temSelecaoModalidadeAtiva && naoTemExames && result.dados) {
      sessionStorage.setItem(
        "pacienteModalidade",
        JSON.stringify({
          dados: result.dados,
          exames: result.exames,
          tentativas: result.tentativas,
          invalido: result.invalido,
        })
      );

      router.replace(
        `/modalidades?servico=${servico}&preferencial=${preferencial}`
      );

      return;
    }

    setDados(result.dados);
    setExames(result.exames);
    setTentativas(result.tentativas);
    setInvalido(result.invalido);
    setShowModal(true);
  } catch (error) {
    console.error(error);
    window.alert("Erro ao buscar paciente.");
  } finally {
    setLoading(false);
  }
}
  function handleChangeTipo(nextTipo: TipoBusca) {
    auditTotem('tipo_busca_selecionado', 'busca', { tipo: nextTipo, servico, preferencial });
    setTipo(nextTipo);
    setText("");
    clearPatients();
    inputRef.current?.focus();
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    updateSearchText(event.target.value);
  }
  function voltar() {
    router.replace(`/preferencial?servico=${servico}`)
  }
  async function avancar() {
    auditTotem('avancar_clicado', 'busca', { tipo, servico, preferencial, preenchido: Boolean(text.trim()) });
    if (!text.trim()) {
      window.alert("Digite o nome do paciente");
      return;
    }

    if (tipo !== "NOME") {
      window.alert("Digite um nome para poder avançar.");
      return;
    }

    const dadosNovoPaciente = {
      ds_paciente: text.trim(),
      dt_nascimento: undefined,
      tipo: "NEW" as const,
      servico,
      preferencial,
    };

    try {
      setLoading(true);

      const configPainel = await buscarConfiguracaoPaineis();

      const temSelecaoModalidadeAtiva = deveSelecionarModalidade(configPainel, servico);

      if (temSelecaoModalidadeAtiva) {
        sessionStorage.setItem(
          "pacienteModalidade",
          JSON.stringify({
            dados: dadosNovoPaciente,
            exames: null,
            tentativas: null,
            invalido: null,
          })
        );

        router.replace(
          `/modalidades?servico=${servico}&preferencial=${preferencial}`
        );

        return;
      }

      setDados(dadosNovoPaciente);
      setExames(null);
      setTentativas(null);
      setInvalido(null);
      setShowModal(true);
    } catch (error) {
      console.error(error);
      window.alert("Erro ao carregar a configuração de modalidades.");
    } finally {
      setLoading(false);
    }
  }

  function abrirQRCode() {
    setDados({
      qr: true,
      ds_paciente: "Escaneie o QRCode.",
      servico,
      preferencial,
    });
    setShowModal(true);
  }
  return (
    <div className="overflow-hidden h-screen">
      <TotemHeader title={title} onAdvance={avancar} onBack={voltar} />

      <Base type="totem">
        <div className="flex h-full flex-col justify-start mt-8 px-2">
          <SearchTypeSelector tipo={tipo} onChange={handleChangeTipo} />

          <PatientSearchInput
            tipo={tipo}
            value={text}
            inputRef={inputRef}
            onChange={handleInputChange}
            onQRCodeClick={abrirQRCode}
          />

          <PatientList
            pacientes={pacientes}
            tipo={tipo}
            servico={servico}
            preferencial={preferencial}
            loading={loading}
            error={error}
            onCPFPatientClick={handleCPFPatientClick}
          />

          <VirtualKeyboard
            tipo={tipo}
            value={text}
            onChange={updateSearchText}
          />
        </div>
      </Base>
    </div>
  );
}
