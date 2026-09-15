# Retenção e acesso aos logs

Configure no ambiente do backend `AUDIT_RETENTION_DAYS=90` para guardar 90 dias.
O prazo é uma escolha operacional, não uma recomendação legal. Ausente ou `0`
desativa a exclusão. Aceita inteiros de 1 a 3650. Recrie o container para aplicar.
Nenhum arquivo de ambiente existente foi alterado e nenhuma limpeza foi executada
durante a implementação.

Quando ativada, a limpeza remove até 1000 registros de AuditLog por minuto,
anteriores ao instante atual menos o prazo. Usa apenas o banco de logs, com
SKIP LOCKED. Exclusões são definitivas. Registra quantidade, limite de data e
sucesso/falha. Um acúmulo grande leva vários ciclos para desaparecer.

A política não apaga backups, logs de console nem arquivos das filas persistentes.
Eventos antigos reenviados pela fila entram no banco e ficam sujeitos à próxima
limpeza. A retenção desses outros locais deve ser configurada separadamente.

O painel e seu proxy exigem sessão administrativa válida com permissão LOGS ou
acesso total. Consultas encaminhadas ao backend geram `logs_consultados`, com ator
e resultado, sem copiar os filtros ou os dados encontrados. Respostas do proxy
não podem ser armazenadas em cache. Permissões são geridas na tela de usuários.

O endpoint direto do backend continua protegido pelo token interno e não pela
sessão do painel: portadores desse token continuam com acesso interno. Não há
auditoria de consultas feitas diretamente no banco, nem revogação desse token
nesta alteração. Não exponha a credencial interna no navegador.

Validação: `node --test back/tests/audit-retention.test.cjs`.
Homologar com banco de logs de teste antes de habilitar a exclusão em produção.
