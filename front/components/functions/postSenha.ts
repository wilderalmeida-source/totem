import {
  CadastraAtendimentos,
  Atendimento,
  AtualizaAtendimentos,
  CadastraSenha,
  BuscaModalidades,
  BuscaAtendimentos,
  BuscaSenha,
  Senha

} from "../../services/fetchData";
import {
  EntregaDeExames
} from "./lastExames"
import {
  ArrayID
} from "./arrayID"
type Props = {
  cd_paciente?: number;
  ds_paciente?: string;
  dt_nascimento?: string;
  preferencial: number | null | undefined;
  servico: string | null;
};
export async function GerarSenha({
  cd_paciente,
  preferencial,
  servico,
}: Pick<Props, "cd_paciente" | "preferencial" | "servico">) { //_____________AQUI RECEBEMOS OS DADOS PARA GERAR A SENHA_____________
  if (!cd_paciente) {
    console.error("Paciente inválido");//_____COMO CADASTRAMOS O PACIENTE NA HORA SEMPRE TERÁ UM ID A NO SER QUE DE ALGUM ERRO NO CADASTRO________ 
    return;//______SE DER ERRO PARA A EXECUCÃO AQUI
  }
  if (servico === "C") {//______________ VERIFICAMOS O SERVIÇO SE É ENTREGA OU ATENDIMENTO/AGENDAMENTO___________-
    const atendimentos = await EntregaDeExames(cd_paciente);
    let nrControle: number | undefined = undefined
    let cd_modalidade: number | undefined = 0
    if (atendimentos.length > 0) { //exame que existe
      const atendimentosNew = atendimentos.filter((i) => (i.nr_controle && i.salas.cd_modalidade != 11)); //______FILTRA OS ATENDIDOS
      if (atendimentosNew.length < 1) { //________SE NENHUM TIVER O NR_CONTROLE
        const newAtendimentos = await CadastraAtendimentos({ cd_paciente });
        nrControle = newAtendimentos[newAtendimentos.length - 1].cd_atendimento
        cd_modalidade = newAtendimentos[newAtendimentos.length - 1].salas.cd_modalidade;
      } else {
        nrControle = atendimentosNew[atendimentosNew.length - 1].nr_controle
        cd_modalidade = atendimentosNew[atendimentosNew.length - 1].salas.cd_modalidade;
      }
    } else { //_________SE NAO TIVER NENHUM ATENDIMENTO
      const newAtendimentos = await CadastraAtendimentos({ cd_paciente });
      nrControle = newAtendimentos[newAtendimentos.length - 1].cd_atendimento
      cd_modalidade = newAtendimentos[newAtendimentos.length - 1].salas.cd_modalidade;
    }//_____PEGA A MODALIDADE DO PRIMEIRO ATENDIMENTO
    await CadastraSenha({ //_____CADASTRAMOS A SENHA PARA A ENTREGA DE RESULTADOS, QUANDO ACHADO UM PROCEDIMENTO_______
      nr_modalidade: cd_modalidade,
      nr_senha: nrControle ? nrControle % 10000 : undefined,
      sn_preferencial: preferencial !== 0,
      ds_opcao: "C",
      ds_local: "RESULTADO",
      ds_fila: "R",
      method: "C",
      sn_especial: preferencial === 2,
      nr_controle: nrControle
    });
  } else { //________________CASO NÃO SEJA ENTREGA DE RESULTADOS____________________
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0)
    const atendimentos = await BuscaAtendimentos({ //________BUSCAMOS ATENDIMENTO DO PACIENTE NA DATA DE HOJE__________
      cd_paciente,
      date: { from: hoje, to: hoje },
    });
    const exameAtendimento: Atendimento[] = []
    let novoAtendimento = false;
    if (atendimentos) {//________________SE ATENDIMENTO EXISTIR__________________
      const listar = [2, 3, 7]
      atendimentos.map((item) => {
        if (item.exames && item.exames.length > 0 && item.ds_status && listar.includes(item.ds_status)) {
          exameAtendimento.push(item)
        }
      })
      if (exameAtendimento.length < 1) { //____________SE NAO EXIXTIR EXAME_____________________ 
        const newAtendimentos = await CadastraAtendimentos({ cd_paciente }); //___________CRIA UM NOVO ATENDIMENTO
        exameAtendimento.push(newAtendimentos[0])
        novoAtendimento = true;
      }
    } else { //_________________CASO NÃO TENHA ATENDIMENTO___________
      const newAtendimentos = await CadastraAtendimentos({ cd_paciente }); //___________CRIA UM NOVO ATENDIMENTO
      exameAtendimento.push(newAtendimentos[0])
      novoAtendimento = true;
    }
    const arrayAtualiza = ArrayID(exameAtendimento); //_______CRIAMOS UM ARRAY COM OS ID DOS ATENDIMENTOS_______
    const cd_modalidade = exameAtendimento[0].salas.cd_modalidade; //_______SEPARAMOS O CODIGO DA MODALIDADE DO PRIMEIRO ATENDIMENTO_________
    const modalidades = await BuscaModalidades(cd_modalidade); //_______BUSCAMOS A MODALIDADE___________
    let ds_modalidade = modalidades[0]?.ds_modalidade ?? "";
    if (novoAtendimento && servico == 'A') {
      ds_modalidade = "ATENDIMENTO PRÉ"

    } //_______PEGA A PRIMEIRA MODALIDADE______
    const fila = novoAtendimento ? "N" : ds_modalidade[0];
    //_________PRIMEIRA LETRA DA MODALIDADE___________
    const senhas = await BuscaSenha(); //_________________INICIAMOS A BUSCA DA ULTIMA SENHA PARA GERAR_______
    const lengthSenha = (senhas.senhas?.length ?? 0) + 1;
    const criarSenha: Senha = await CadastraSenha({ //______________CADASTRAMOS A SENHA _______________
      nr_senha: lengthSenha,
      nr_modalidade: cd_modalidade,
      sn_preferencial: preferencial !== 0,
      ds_opcao: servico,
      ds_local: ds_modalidade,
      ds_fila: fila,
      sn_especial: preferencial === 2,
      method: "A",
    });
    const senha = criarSenha;
    const cd_senha = senha.cd_senha
    const nr_senha = criarSenha.nr_senha//________________PEGAMOS O CODIGO DA SENHA___________
    const ds_senha = `${preferencial !== 0 ? "P" : "F"}${fila}-${nr_senha}`
    await AtualizaAtendimentos(arrayAtualiza, ds_senha, cd_senha);//_________COLOCAMOS O CODIGO DA SENHA NOS ATENDIMENTOS_________________
  }
}