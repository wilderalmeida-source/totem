# Teste com navegadores isolados

Executar em uma estação de teste com Node.js, fora do servidor da aplicação.
Cada usuário abre um contexto Chromium com cookies e armazenamento independentes.
Usa a página inicial real: SSE, histórico, fallback e checagem periódica de acesso.
Não seleciona serviços nem emite senhas. A página pode gravar logs e resetar seu
contador de identificação; login cria sessões. Utilize dados de homologação.

## Instalação (PowerShell, a partir da raiz do projeto)

```powershell
cd scripts/carga
npm install
npx playwright install chromium
```

## Execução

```powershell
$env:TOTEM_TEST_URL = 'http://ENDERECO-HOMOLOGACAO:3000'
$env:TOTEM_TEST_CONFIRM = 'HOMOLOGACAO'
$env:TOTEM_TEST_USERS = '3'
$env:TOTEM_TEST_SECONDS = '600'
npm start
```

Se o acesso estiver ativo, configure antes um colaborador de teste com cartão,
PIN já trocado e não expirado. O script não faz troca de PIN. Defina as credenciais
sem gravá-las no arquivo ou no histórico do terminal:

```powershell
$env:TOTEM_TEST_CARD = Read-Host 'Codigo do cartao de homologacao'
$credencialTeste = Get-Credential -UserName 'teste' -Message 'Informe o PIN no campo senha'
$env:TOTEM_TEST_PIN = $credencialTeste.GetNetworkCredential().Password
npm start
Remove-Item Env:TOTEM_TEST_PIN
Remove-Item Env:TOTEM_TEST_CARD
```

O mesmo colaborador pode autenticar os contextos, com sessões diferentes. O script
não repete login incorreto automaticamente. Se algum contexto não chegar à página
inicial, registra setupFailed e encerra com código 1. Não interprete esse caso como
teste completo. Ctrl+C interrompe e salva os dados já coletados.

## Comparação

Execute separadamente com controle desativado, ativado e LISTEN indisponível. Para
o último, use sua configuração de homologação para interromper apenas a conexão
do listener; mantenha as consultas clínicas disponíveis. O script não derruba
serviços. Depois, aumente usuários para 10 e 20 em execuções separadas.

O relatório fica em results/<data>/report.json: contagem, média, p95, erros HTTP,
falhas de rede por rota, requisições pendentes e erros JavaScript por dispositivo.
SSE não entra nas latências porque permanece aberto. uiProbes são o tempo de uma
sondagem simples do navegador, não FPS nem prova de que a tela está utilizável.
Não são gravados corpos, parâmetros da URL, screenshots, cookies, cartões ou PINs.

A duração medida das requisições vai do início até o fim do download. O relatório
inclui carregamento/login. Não mede CPU, memória ou consultas SQL: acompanhe esses
indicadores no servidor durante o teste. Contextos compartilham um processo de
navegador; não reproduzem o hardware nem as redes distintas dos totens reais.
O programa não acessa o banco diretamente nem comprova sozinho os acertos do cache.

Validação local do agregador: `node --test metrics.test.cjs`.
