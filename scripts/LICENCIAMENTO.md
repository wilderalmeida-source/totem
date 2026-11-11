# Ativação e validação da licença no totem

O serviço de licenças é separado do backend clínico. A ativação é feita pelo
navegador em **Configurações → Licença do sistema** (`/licenca`). Não é necessário
colar um JSON no console VMware nem colocar a credencial no `.env`.

## Configuração do backend

Somente o backend recebe estas variáveis. Não use `NEXT_PUBLIC_` nem copie os
valores para o frontend:

O `.env.backend` de execução precisa manter os valores reais. Para compartilhar
a configuração, gere uma cópia com todos os valores mascarados:

```sh
sh mascarar-env.sh
```

Isso usa o Node da imagem local do backend, sem instalar Node na VM, e cria
`.env.backend.mascarado`. O original é preservado; comentários e conteúdos de
valores com várias linhas não são copiados. Essa cópia é apenas para compartilhar,
não deve ser usada pelo Compose. Também aceita `sh mascarar-env.sh .env.frontend`.
No computador com Node: `node scripts/mascarar-env.cjs`.

```dotenv
LICENSE_SERVER_URL=https://SEU-WORKER.workers.dev
LICENSE_PUBLIC_KEY_JWK='{"kty":"OKP","crv":"Ed25519","x":"CHAVE_PUBLICA_DE_PRODUCAO"}'
LICENSE_KEY_ID=totem-licencas-v1
LICENSE_ISSUER=urn:totem:licencas
```

`LICENSE_PUBLIC_KEY_JWK` é a chave pública de produção do serviço de licenças,
contida em `.secrets/production/public-key.json` do projeto separado. A chave
privada e os tokens administrativos nunca devem ser enviados à clínica.
URL e chave pública são referências de confiança, não credenciais: o acesso
à licença exige também a credencial exclusiva da instalação. Ocultar a URL
não impede por si só requisições à Cloudflare; proteções contra excesso de
requisições devem ser configuradas também no Worker/conta.

Para preparar o arquivo local sem copiar a chave manualmente:

```powershell
node scripts/configurar-licenca-env.cjs --url https://SEU-WORKER.workers.dev --public-key "D:\caminho\totem-licencas\.secrets\production\public-key.json"
```

### Baixar a chave diretamente do Worker

O serviço de licenças tem um endpoint público `GET /public-key.json`. Publique a
versão que contém esse endpoint com `npm run deploy` no projeto `totem-licencas`.
Ele devolve somente a chave de verificação, nunca a chave privada ou tokens.

Na VM Linux com Docker e o backend já criado, leve os scripts junto com a instalação e rode:

```sh
sh configurar-licenca.sh https://SEU-WORKER.workers.dev
```

Não é necessário instalar Node ou colar o JSON. O script usa a imagem local do
backend, baixa a chave e acrescenta as variáveis no `.env.backend`. O backend
deve ter saída HTTPS; proxy/firewall da rede podem precisar de liberação.
O shell aceita `BACKEND_CONTAINER=outro-nome` quando necessário.
Ele não reinicia containers. Recrie o backend pelo procedimento habitual para
carregar a configuração preparada e depois envie a licença pela tela `/licenca`.

No computador com Node, o comando equivalente é:

```sh
node scripts/configurar-licenca-env.cjs --url https://SEU-WORKER.workers.dev
```

Sem `--public-key`, a origem padrão é `/public-key.json` no mesmo Worker. Também
existe `--public-key-url`, restrito à mesma origem HTTPS. Redirecionamentos,
respostas acima de 4 KB, chaves privadas e formatos incorretos são recusados.
Nenhum script remoto é baixado ou executado. O código executado é o script local
da instalação; somente a chave pública é obtida por HTTPS.

Essa é a primeira configuração de confiança, então confirme que o domínio
informado é o seu. Opcionalmente, `--public-key-sha256` confere uma impressão
SHA-256 obtida por outro canal. A impressão usa o JSON compacto com os campos
nessa ordem: `kty`, `crv`, `x`. Uma chave existente diferente não é substituída
automaticamente. O backend continua usando a chave fixada no ambiente e não
baixa uma chave nova a cada ativação ou consulta de licença.

O script prepara `.env.backend`, usado pelo Compose e ignorado pelo Git. Se ele
não existir, copia as linhas de `env.backend` antes de acrescentar a configuração.
Se existir, apenas acrescenta as variáveis ausentes, sem apagar ou reescrever
linhas existentes. Se encontrar um valor diferente ou uma duplicação, interrompe
sem alterar o arquivo. Aceita `--env` para outro arquivo privado e recusa gravar
no `env.backend` versionado. Não imprime valores. `--key-id` e `--issuer` são opcionais.

O `env.backend` original deste projeto é versionado. Não acrescente nele chaves,
tokens ou senhas de produção. Use o arquivo privado `.env.backend` na implantação.
Transfira esse arquivo pelo método de implantação/SFTP que já utiliza; a licença
da instalação será enviada posteriormente pelo navegador. Alterações no ambiente
exigem recriar o container do backend.

## Persistência entre containers

O Compose recebe um volume exclusivo no backend:

```yaml
services:
  backend:
    env_file:
      - .env.backend
    volumes:
      - license_backend:/app/data/license

volumes:
  license_backend:
```

Isso já foi incluído em `docker-compose.example.yml` e no Compose local. Caso
use outro arquivo no servidor, inclua a mesma montagem. O caminho pode ser
alterado por `LICENSE_STATE_DIRECTORY`; a montagem deve acompanhar essa alteração.
Rebuild, recriação e reinício preservam a ativação quando o volume é mantido.
`docker compose down -v` remove os volumes e exige nova ativação.

`state.json` guarda a credencial e a última resposta assinada no backend, com
permissão de arquivo 0600 e gravação atômica. O volume e seus backups devem ser
privados. O frontend não grava nem devolve a credencial após o upload. Não
compartilhe esse volume entre vários processos backend gravadores; os três
totens existentes podem usar normalmente o mesmo backend.

## Ativar pelo navegador

1. Publique/recrie as imagens de backend e frontend com estas mudanças e mantenha
   o volume e o ambiente configurados.
2. Entre no painel de licenças da Cloudflare, cadastre a instalação e baixe o
   arquivo de acesso. Se já perdeu esse arquivo, use **Nova credencial**.
3. No painel administrativo da clínica, abra **Configurações → Licença do sistema**.
   É necessário ter a permissão **USUARIOS** ou acesso administrativo completo e
   não estar com troca de senha obrigatória.
4. Selecione o arquivo JSON de até 8 KB, confirme a instalação e clique em
   **Validar e ativar licença**. O backend precisa de saída HTTPS para a Cloudflare.
5. Aguarde a confirmação. Os totens conectados ficam liberados; a tela inicial
   reconsulta a disponibilidade a cada 30 segundos. Atualizar a página antecipa
   essa leitura local.

Formato aceito: `installationId`, `licenseId` e `credential`, exatamente como
baixados do painel. O arquivo não pode fornecer endereço do Worker ou chave
pública. Arquivos de senha administrativa, chaves privadas e campos adicionais
são rejeitados. Uma licença inválida enviada como substituição não substitui
a licença anteriormente aceita. Uma negação assinada referente à instalação
atual é aplicada mesmo durante uma nova tentativa de ativação.

Sem licença ativa ou com configuração ausente, novas operações do totem ficam
indisponíveis. O login administrativo e a tela de ativação permanecem acessíveis.

## Validação e bloqueio

- O backend consulta a Cloudflare ao iniciar com uma ativação existente e,
  depois, em segundo plano a cada cinco minutos. **Verificar agora** antecipa
  uma consulta. Requisições simultâneas de atualização compartilham uma consulta.
- Busca de pacientes e emissão de senhas verificam apenas o estado em memória:
  não aguardam a internet, nem leem o arquivo de licença a cada requisição.
- Cada resposta é verificada com Ed25519, algoritmo e chave esperados, emissor,
  destinatário, instalação, ID da licença, nonce novo, versão e prazos.
- Falha de internet usa apenas uma autorização ativa já aceita, até o menor
  prazo entre a validade da licença e a tolerância offline. Falhas, reinícios
  e tentativas de upload não reiniciam essa tolerância.
- Bloqueio assinado é persistido e continua impedindo operações após reiniciar
  ou vencer a resposta curta de bloqueio. Uma autorização antiga não o desfaz.
  A reativação precisa ser assinada e ter uma versão posterior.
- Sem conexão, um bloqueio remoto chega quando o backend reconecta; até lá,
  a última autorização ativa pode continuar válida dentro da tolerância definida.
- Estado e credencial sobrevivem ao reinício pelo volume. O relógio do servidor
  deve estar sincronizado. O processo também usa tempo monotônico para evitar
  prolongar a autorização se o relógio recuar durante sua execução.
- Um erro de escrita não produz sucesso na ativação. Um cache inválido é
  rejeitado e pode ser recuperado por novo upload validado.

Novas consultas a pacientes, agenda/atendimentos do totem e emissões são
bloqueadas no backend. Uma requisição que já passou pelo controle pode terminar.
O processamento TCP, WebSocket, TTS, arquivos de áudio, histórico de chamadas e
recuperação administrativa permanecem funcionando. Não é um bloqueio remoto
de todas as telas do sistema. O bloqueio não consome tentativas de identificação
e não é apresentado como dados incorretos. Uma emissão rejeitada por esse
controle é registrada como não realizada, em vez de resultado desconhecido.

## Acesso e auditoria

O upload exige sessão administrativa atual, permissão, origem válida e uma prova
interna de curta duração, vinculada ao método, rota e conteúdo. O backend
reconfere os administradores do banco. A rota genérica de proxy não permite
acesso aos endpoints de licença. O endpoint de disponibilidade retorna apenas
um booleano. Status e respostas não incluem URL, chave pública, token assinado
ou credencial da instalação.

Ativação, falhas, consultas manuais e mudanças de estado são registradas em
`step: licenciamento`, sem o arquivo, credencial ou chave. Tokens de API internos
continuam independentes do licenciamento. Esta etapa não altera o esquema do
banco clínico nem exige um novo `init.sql`.

## Homologação

Teste upload correto e incorreto, bloqueio/reativação no Worker, perda de internet
dentro e depois da tolerância, reinício dos containers, falta do volume, expiração,
administrador sem permissão e tentativas de acesso direto às rotas do backend.
Confirme que chamadas e áudio continuam funcionando durante o bloqueio de novas
operações. Não aplique o primeiro rebuild em horário de atendimento sem ter o
arquivo de acesso e a configuração do ambiente prontos.

## Cotas na Cloudflare

No Workers Free a conta tem 100.000 requisições por dia; no D1 Free, 5 milhões
de linhas lidas e 100.000 escritas por dia. Um backend consultando a cada cinco
minutos gera aproximadamente 288 consultas/dia, além de uso do painel, reinícios
e verificações manuais. Os três totens no mesmo backend compartilham a consulta.
Confira [os limites atuais](https://developers.cloudflare.com/workers/platform/pricing/).

Um limitador executado dentro do Worker protege o D1 e reduz processamento,
mas a requisição já invocou o Worker. Isso também vale para respostas 401/429.
O login do painel já possui limitação; isso não cria um teto global diário para
todas as rotas. Não foram configuradas regras externas automaticamente.

Para proteger antes da execução usando WAF, é preciso um domínio seu na Cloudflare:

1. Associe um subdomínio ao Worker e teste nele painel, verificação e download.
2. Na zona do domínio, abra **Security → Security rules → Create rule → Rate limiting rules**.
3. Como ponto inicial, limite os caminhos `/v1/` e `/public-key.json` a 20 requisições por IP em
   10 segundos, com ação **Block** por 10 segundos. É uma sugestão inicial, não
   uma garantia de cota: observe e ajuste para instalações que compartilham IP.
   Não aplique desafios interativos ao endpoint consultado pelo backend.
4. O WAF Free disponibiliza uma regra e esses períodos de 10 segundos. Veja
   [passos](https://developers.cloudflare.com/waf/rate-limiting-rules/create-zone-dashboard/)
   e [recursos por plano](https://developers.cloudflare.com/waf/rate-limiting-rules/#availability).
5. Migre `LICENSE_SERVER_URL` para o domínio próprio antes de desativar a rota
   `workers.dev`. Mantenha `preview_urls=false`. Manter a URL alternativa ativa
   permite contornar regras aplicadas somente no seu domínio.

Sem domínio próprio, `workers.dev` aceita Cloudflare Access. As consultas
automáticas exigiriam Service Tokens e headers adicionais no backend/scripts;
essa integração extra ainda não foi feita. Não configure login interativo
obrigatório para toda a API atual sem preparar essa autenticação de serviço.
[Access em workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/#manage-access-to-workersdev),
[Service Tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).

Acompanhe **Workers & Pages → Worker → Metrics** e **D1 → banco → Metrics → Row Metrics**.
Observe também o consumo agregado da conta, incluindo outros Workers. Alertas
de uso, quando disponíveis, notificam; não bloqueiam automaticamente um custo.
