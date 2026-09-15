# Diagnostico do totem

Os eventos usam a tabela `AuditLog` existente no banco de logs. A fila persistente exige a coluna eventId e seu indice unico; consulte FILA-LOGS.md.

## Resultados e pesquisa

O painel permite filtrar inicio e fim (hora local do navegador, convertida para UTC), resultado do evento e codigo interno da senha (`cd_senha`, diferente do numero exibido). Esses filtros combinam com grupo, origem, fluxo e equipamento. A navegacao possui paginas de 50 registros e desempate pelo ID para eventos no mesmo instante.

Os novos eventos informam `outcome`: `CONCLUIDO`, `CANCELADO`, `EXPIRADO`, `FALHOU` ou `DESCONHECIDO`. O evento `fluxo_encerrado` preserva o resultado observado na emissao, mesmo quando o usuario volta ao inicio. Falha de comunicacao ou comprovante invalido sao resultado desconhecido, nao comprovam que a senha deixou de ser gravada.

Resultado e uma observacao por evento/origem, nao um estado global conciliado: o backend pode registrar commit concluido enquanto o navegador registra falta de confirmacao. Registros antigos sem `outcome` continuam visiveis sem o filtro de resultado; nao recebem classificacao retroativa. Ausencia de evento nao comprova falha. A fila persistente esta implementada conforme FILA-LOGS.md; reconciliacao automatica ainda nao foi implementada.

- No painel **Logs**, pesquise o ID completo do fluxo ou equipamento e abra **Ver detalhes**. Use as paginas para consultar os registros mais antigos.
- Cada navegador tem um ID persistido em `localStorage`. Em **Identificar este navegador**, configure um nome, por exemplo `Totem recepcao 1`, em cada maquina. Limpar os dados do navegador gera outro ID.
- O ID do fluxo acompanha navegador, Next e backend por `x-flow-id`. Ele muda apos o encerramento da sessao do paciente. Esse ID serve somente para diagnostico, nunca para autorizar acesso.
- Configure `APP_VERSION` no backend e no servidor Next, e `NEXT_PUBLIC_APP_VERSION` no build do frontend, preferencialmente com o commit publicado. Sem configuracao, o log informa `nao_informada`.
- `numero_reservado` confirma a reserva no banco de logs. `senha_e_vinculo_confirmados` confirma o commit clinico. `emissao_confirmada` indica que o Next recebeu uma resposta valida. `resposta_next` indica a chegada da resposta ao navegador.
- O chamado TCP recebe outro ID, enviado ao navegador como `traceId`. Buscar esse ID encontra o processamento TCP e os eventos de reproducao. O protocolo clinico atual nao transmite o ID do fluxo de emissao; a referencia do chamado fica em `chamado_referencia`, sem associacao automatica por suposicao.
- `audio_iniciado` e `audio_concluido` indicam eventos do navegador, nao comprovam volume fisico ou funcionamento das caixas de som. `audio_rejeitado` permite identificar bloqueio de autoplay.
- A auditoria usa filas locais persistentes no Next e backend, com reenvio e deduplicacao. Consulte FILA-LOGS.md para limites, volumes e atualizacao SQL. Eventos que nao chegaram ao servidor ainda podem se perder.
- Os diagnosticos de pacientes incluem nome e nascimento solicitados para suporte, mas nao CPF completo, cookies, tokens ou prontuarios. Eventos do navegador sao informativos e nao comprovam uma transacao no banco; use o evento de commit do backend para isso.

Para validar a publicacao: emita uma senha em cada totem, pesquise cada fluxo e confira os IDs de equipamento; cancele outro atendimento; deixe outro expirar; faca um chamado clinico e confira os eventos TCP, TTS e navegador. Teste falhas somente em ambiente de homologacao.
