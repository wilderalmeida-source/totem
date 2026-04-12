import {
  CadastraPaciente,
  Paciente,
} from "../../services/fetchData";
import {
  GerarSenha
} from "./postSenha"
type Props = {
  cd_paciente?: number;
  ds_paciente?: string;
  dt_nascimento?: string;
  preferencial: number | null | undefined;
  servico: string | null;
};
import {parseBRDate} from "./createDate"

// ------------------------ Função principal ------------------------
export async function SendClinux({
  cd_paciente,
  ds_paciente,
  dt_nascimento,
  preferencial,
  servico,
}: Props) {
  if (cd_paciente) { //__________________VERIFICA SE EXISTE PACIENTE CADASTRADO____________
    await GerarSenha({ cd_paciente, preferencial, servico }); //______INICIAMOS O CADASTRO DE SENHA_____
  } else { //_____________________________CADASTRAREMOS UM PACIENTE______________________________
    if (dt_nascimento) { //_______________VERIFICAMOS SE TEM DATA DE NASCIMENTO QUE FOI DIGITADO NO INPUT____________
      const dt = parseBRDate(dt_nascimento);//PASSAMOS A DATA DE NASCIMENTO PARA UM PADRAO ACEITAVEL PELO CLINUX_____________
      const paciente: Paciente = await CadastraPaciente({ //_________FUNCAO QUE CADASTRA PACIENTE NO BACKEND
        ds_paciente,
        dt_nascimento: dt ?? new Date(0).toISOString(),
      });
      await GerarSenha({//_________________APOS O CADASTRO DO PACIENTE GERAMOS A SENHA
        cd_paciente: paciente.cd_paciente,
        preferencial,
        servico,
      });
    } else {//_____________CASO NÃO SEJA DIGITADO UMA DATA DE NASCIMENTO COLOCAMOS UMA FICTICIA____________
      const paciente: Paciente = await CadastraPaciente({
        ds_paciente,
        dt_nascimento: new Date(0).toISOString(),
      });
      await GerarSenha({ //___________GERAMOS A SENHA COM O PACIENTE CADASTRADO
        cd_paciente: paciente.cd_paciente,
        preferencial,
        servico,
      });
    }
  }
}



