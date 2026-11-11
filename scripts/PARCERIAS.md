# Parcerias nos painéis

Em Configurações → Parcerias (permissão **Painéis**), envie uma logo PNG, JPEG ou
WebP de até 5 MB. Escolha os painéis, a posição e a orientação para cada imagem.
Salve e ative **Exibir parcerias nas chamadas**. Logos sem painel não aparecem.

Na playlist, use as setas para ordenar e o botão + para incluir imagens. Cada
painel avança uma logo por chamada, pulando as que não estão vinculadas a ele.
O botão **Aleatório** ignora a playlist e escolhe entre todas as logos vinculadas
ao painel, evitando repetição imediata quando existem alternativas. A sequência
é local ao navegador e recomeça ao recarregar a página.

Paisagem: limite de 512 × 256 px. Retrato: limite de 256 × 512 px. A proporção é
preservada, sem recorte; em telas menores a imagem pode ficar menor. O upload é
decodificado e convertido para WebP com limite de 512 × 512 px para permitir
trocar a orientação depois. SVGs, imagens animadas e imagens acima de 16 MP são
rejeitados. O nome, a recepção e o guichê continuam visíveis no pop-up.

O pop-up acompanha a chamada na fila de áudio. A exibição mínima configurada é de
5 a 60 segundos, e continua enquanto o TTS toca. O próximo chamado pode substituir
o pop-up antes desse mínimo para não atrasar a fila. O aviso de atenção fica acima
do pop-up e não avança a playlist. Falhas na imagem não impedem a chamada nem o TTS.
A recepção usa o vínculo ativo de modalidade/serviço; sem vínculo, aparece
“Recepção N”, seguindo a numeração do painel. Esses vínculos usam cache de 30 segundos,
atualizado sob demanda nas chamadas. Se o serviço de voz falhar, permanece o fallback de fala do
navegador, sujeito à habilitação de som/autoplay do equipamento.

## Implantação

Recompile e recrie **frontend e backend**. O backend passa a enviar identificação
única e dados da chamada junto ao áudio. Não há migração ou mudança no banco clínico.
As imagens e config.json ficam em `/app/public/videos/partnerships`, dentro do volume
de vídeos já utilizado pelo frontend. Preserve esse volume e suas permissões de
escrita para o usuário nextjs (UID/GID 1001). O Dockerfile prepara permissões da
imagem; permissões de uma pasta montada pelo host continuam sendo as do host.

No modelo atual há um frontend gravador. Para várias réplicas gravando configuração,
é necessário armazenamento compartilhado e coordenação entre processos. As revisões
evitam sobrescrita de edições concorrentes no mesmo processo. Falhas de gravação não
são convertidas em configuração vazia nem em sucesso. Inclua a pasta de parcerias
no backup do volume. APIs de edição exigem sessão administrativa e permissão PAINEIS;
as leituras são públicas para permitir a exibição nos painéis.

O painel consulta configurações ao abrir e a cada 30 segundos. Sem configuração
carregada, desativada ou sem logos elegíveis, mantém a apresentação normal. Salvar
a configuração não interrompe áudio em reprodução. O painel administrativo exige
salvar as edições antes de enviar ou excluir outro arquivo.

## Homologação

1. Enviar duas logos, uma retrato e uma paisagem, em posições distintas.
2. Vincular uma ao painel 1 e ambas ao painel 2; salvar e aguardar até 30 segundos.
3. Chamar pacientes fictícios consecutivamente e confirmar ordem, nome, recepção,
   guichê e áudio correspondentes. Testar dois guichês chamando simultaneamente.
4. Ativar Aleatório e remover uma logo da playlist: ela continua elegível no modo
   aleatório, mas somente nos painéis selecionados.
5. Reproduzir Atenção; conferir prioridade e retomada das próximas chamadas.
6. Testar imagem indisponível, serviço TTS indisponível e parcerias desativadas.
7. Recriar o container mantendo o volume e conferir persistência das logos.

Testes automatizados: `node --test front/tests/partnerships.test.cjs
front/tests/panel-call.test.cjs front/tests/partner-call-lifecycle.test.cjs
front/tests/panel-partner-audio.test.cjs back/tests/panel-call-events.test.cjs`.
Os testes usam imagens fictícias, mocks de chamadas e diretórios temporários.
Não substituem o teste de autoplay, layout e som nos painéis reais.
