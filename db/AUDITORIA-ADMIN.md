# Alterações administrativas

No painel de logs, selecione a categoria ADMIN e procure a ação
`alteracao_administrativa`. O backend registra operações de escrita de usuários
administrativos, operadores e configuração de acesso ao totem, guichês, painéis,
recepções/modalidades, tolerância, configuração de mídias, voz/dicionário e atenção.

Cada evento contém método, rota, identificador da requisição, alvo, campos enviados
permitidos, campos permitidos da resposta, status HTTP, duração e resultado
CONCLUIDO/FALHOU. A fila persistente de logs também atende esses eventos.

O proxy administrativo e as rotas específicas de guichês e painéis encaminham o
administrador da sessão validada. Chamadas sem essa informação ficam explicitamente
como `api_interna_nao_identificada`. O cabeçalho interno não substitui autenticação:
o backend exige o token interno; seus portadores são considerados confiáveis.

Não são registrados senhas, PINs, hashes, cartões, tokens, cookies ou respostas de
erro potencialmente sensíveis. Alterações de credencial indicam somente a presença
do pedido. JSON aninhado registra apenas sua presença; textos têm limite de tamanho.

Limites: `requested` é o valor solicitado e `result` é a resposta do endpoint, não
um histórico transacional antes/depois. Ainda não há captura do estado anterior,
auditoria de uploads locais nem garantia de identidade nas demais rotas específicas
que não encaminham o administrador. Rejeições anteriores ao processamento podem
não conter corpo. Uma falha HTTP pode ocorrer após uma alteração parcial, portanto
FALHOU descreve a resposta HTTP, não prova rollback. Alterações diretas no banco
não passam por esta auditoria.

Verificação automatizada: `node --test back/tests/admin-audit.test.cjs`.
Validar também em homologação uma alteração e uma falha pelo painel, verificando
ator, alvo e filtros. Nenhuma migração nova é necessária para esta etapa.
