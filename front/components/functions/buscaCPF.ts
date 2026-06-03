import { BuscaAtendimentos, buscaPaciente } from "@/services/fetchData";
import { useContext } from "react";
import { modalContext } from "@/components/modals/providers";
import { EntregaDeExames } from "./lastExames";
export const useListPacienteCPF = async(ds_cpf:string,dt_nascimento:string,servico:string,preferencial:number)=>{
const { setShowModal, setDados, setExames, setLoading, setTentativas,setInvalido} = useContext(modalContext);
setShowModal(true)
const listpaciente= await buscaPaciente({ds_cpf,dt_nascimento,tipo: "ID"});
  if (listpaciente && listpaciente.length > 0) {
          if (!listpaciente[0].cd_paciente) {
            setInvalido("Dados Invalidos!")
            setLoading(false)
            if (listpaciente[0].tentativas) {
              setTentativas(listpaciente[0].tentativas)
              setLoading(false)
            }
          } else { 
            setDados({
              ds_paciente: listpaciente[0].ds_nome,
              dt_nascimento: listpaciente[0].dt_nascimento,
              servico:servico,
              preferencial: preferencial
            });
            if(servico=='C'&&listpaciente[0].cd_paciente){
              const entrega = await EntregaDeExames(listpaciente[0].cd_paciente);
              if(entrega&&entrega.length>0){
              const relatEntrega = entrega.filter((i) => [5].includes(i.status ?? -999)).slice(0, 10);
              setExames(relatEntrega)
              setLoading(false)}
              else{
              setLoading(false)
              }
            }else if(listpaciente[0].cd_paciente){
              const hoje = new Date
              hoje.setHours(0,0,0,0)
              const atendimento = await BuscaAtendimentos({cd_paciente:listpaciente[0].cd_paciente,date:{from:hoje}});
              if(atendimento && atendimento.length>0){
              const listar = [2, 3, 7]
              const examesProcedimentos = atendimento.filter((i) => { if (i.exames && i.exames.length > 0 && i.ds_status && listar.includes(i.ds_status)) { return i } })
              setExames(examesProcedimentos)
             }else{
                setLoading(false)
              }
             }
          }
        }
}