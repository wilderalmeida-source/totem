# Exportar autotextos / laudos_chaves

O schema local usa `laudos_chaves` (plural). O exportador consulta
`cd_chave`, `ds_chave`, `ds_observacao`, `cd_medico`, `bb_chave` e o nome do
médico relacionado, sem modificar registros do banco.

No diretório `back`, após o build e com o ambiente do backend configurado:

```sh
npm run export:chaves-rtf -- ./export/chaves-rtf
```

Em Docker, com a imagem atualizada (substitua o nome do serviço se necessário):

```sh
docker compose exec backend npm run export:chaves-rtf -- /app/export/chaves-rtf
docker compose cp backend:/app/export/chaves-rtf ./chaves-rtf
```

Os arquivos dentro do container precisam ser copiados para o host ou gravados
em volume montado para sobreviver à recriação do container.

- O nome segue `ds_chave (ds_observacao) - ds_medico.rtf`, com caracteres
  incompatíveis substituídos. Usa a relação
  `laudos_chaves.cd_medico = medicos.cd_medico`, sem consultar funcionários.
- Observação vazia não gera parênteses. Sem nome correspondente, usa
  `medico_<código>`; sem código, omite o autor. Para nomes longos, reserva
  até 40 caracteres para a chave, 30 para observação e 40 para o autor.
- Sem nome, usa `chave_<cd_chave>.rtf`.
- Nomes repetidos ou arquivos já existentes recebem sufixos; nada é sobrescrito.
- Conteúdos vazios são contados e ignorados.
- Os bytes de `bb_chave` são preservados; não há conversão de HTML ou de outro
  formato para RTF. A extensão segue o padrão do exportador de máscaras.
- Nenhum PIN, senha ou token é necessário no comando: utilize o ambiente já
  configurado do backend. Não envie os arquivos de credenciais.

Valide alguns arquivos no editor de laudos antes de importar no sistema destino.
