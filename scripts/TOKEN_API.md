# Gerar token na VM

Leve `gerar-token.sh` e a pasta `scripts` junto com a instalacao. Na raiz devem existir `.env.backend` e `.env.frontend`. O backend `totem-backend` e seu banco de logs precisam estar funcionando, com `ADMIN_SECRET` do arquivo igual ao carregado pelo container.

Execute na raiz da instalacao Linux:

```sh
sh gerar-token.sh
```

O script usa Docker e o Node da imagem local do backend; nao precisa instalar Node na VM nem publicar a porta HTTP do backend. Gera um token pelo endpoint `/tokens` e grava `TOKEN_API_INT` nos dois arquivos. Chaves existentes sao atualizadas; ausentes sao acrescentadas. Se `TOKENAPIINT` existir, sua linha e mantida e recebe o mesmo valor para compatibilidade.

As demais linhas, comentarios e quebras de linha sao preservados. Antes da chamada sao criados backups privados com sufixo exclusivo. O token nao e exibido. Nenhum arquivo original e excluido, e nenhum container e reiniciado ou recriado. Evite editar os arquivos ou executar duas instancias do script simultaneamente.

Depois, recrie os containers pelo procedimento de implantacao para carregar o novo ambiente. Tokens anteriores nao sao revogados por este script. Se houver falha de rede apos a solicitacao, pode existir um token registrado no banco que nao foi aplicado nos arquivos.

Caso o container tenha outro nome:

```sh
BACKEND_CONTAINER=outro-nome sh gerar-token.sh
```
