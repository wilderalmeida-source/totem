# Saúde dos logs

Na página Logs, abra “Saúde dos logs (frontend e backend)”. A consulta ocorre ao
abrir a tela e ao clicar em Buscar / Atualizar, com permissão LOGS ou acesso total.
O endpoint Next é `/api/admin/log-health`, sem cache. Não gera eventos de auditoria
para evitar realimentar a fila monitorada. O backend direto exige token interno.

Indicadores por processo: pendências, bytes dos arquivos finais, arquivos temporários,
capacidade de 100 mil eventos, idade do arquivo pendente mais antigo, entregas,
falhas totais e consecutivas, última entrega e última falha. Os contadores e horários
de entrega são voláteis; as pendências são medidas no disco. A idade usa a data de
modificação do arquivo, não a data original do evento. Não são expostos payloads,
credenciais nem caminhos do disco.

ATENCAO: falha de entrega pendente de recuperação, espera de pelo menos 60 segundos,
arquivo temporário ou fila com pelo menos 80 mil eventos. ERRO: falha ao ler a fila.
INDISPONIVEL: Next não conseguiu consultar o backend. OK não é uma prova de que o
banco está disponível ou de que o disco permite novas escritas: são indicadores da
fila, sem escrita de teste. Eventos rejeitados antes de entrar na fila não são
contados aqui; permanecem os avisos de console existentes.

Consulta somente a instância que responde, sem agregação entre réplicas. A leitura
percorre os metadados dos arquivos e pode custar mais com fila grande. Não executa
limpeza, reenvio manual ou alertas externos. Validar em homologação a interrupção
do destino e sua recuperação.
