# Fila persistente de auditoria

## Publicacao

1. No banco de logs, aplique o bloco `eventId` de `db/init/01_init.sql` (ou a migracao `20260912010000_audit_event_id`). Ele acrescenta uma coluna UUID opcional e um indice unico; nao apaga registros.
2. Publique as imagens atualizadas do backend e frontend com o Compose atualizado. Os volumes `audit_backend` e `audit_frontend` devem montar `/app/data/audit-outbox` em seus respectivos containers. O frontend roda como UID 1001: a imagem prepara as permissoes do diretorio para um volume novo.
3. Nao use `docker compose down -v` nem exclua esses volumes enquanto houver eventos pendentes. Cada instancia precisa de seu proprio volume, sem compartilhar o mesmo diretorio entre processos ou replicas.

## Funcionamento

O Next grava localmente antes de confirmar o recebimento em `/api/audit`. O backend tambem confirma `/clinux/audit` somente depois da gravacao em sua fila local. Cada arquivo recebe um ID aleatorio, horario original, escrita sincronizada em disco e renomeacao para marcar o evento completo.

O reenvio ocorre a cada cinco segundos, em lotes de ate 100 eventos. Um erro mantem o arquivo na fila. Ao reiniciar o processo, o worker retoma os arquivos pendentes automaticamente. Depois da confirmacao do destino o arquivo e removido. O banco usa `ON CONFLICT (eventId) DO NOTHING`: perder a resposta depois do commit e reenviar nao duplica o evento.

O destino pode receber eventos fora de ordem. O painel continua usando o horario original e o ID de fluxo. Durante indisponibilidade do banco os registros pendentes ainda nao aparecem no painel.

## Limites e operacao

- Sem dependencia nova: usa o disco local e os volumes Docker, separados do banco de logs.
- Limites por instancia: 100.000 arquivos pendentes e 256 KiB por evento. Ao atingir um limite, nao elimina os arquivos antigos; rejeita novas entradas e registra erro no console.
- `AUDIT_LOCAL_WRITE_FAILED` indica que um evento novo nao foi persistido (por exemplo, disco cheio ou permissoes). `AUDIT_DELIVERY_FAILED` indica que eventos permanecem aguardando reenvio. Falhas de gravacao em disco nao sao mascaradas como recebimento bem-sucedido pelo endpoint.
- Arquivos `.tmp` nao confirmados podem restar se o processo cair durante uma escrita. Preserve-os para investigacao; nao sao enviados automaticamente, pois podem estar incompletos.
- Eventos que nunca chegaram ao Next, como os de um navegador sem rede ou fechado antes do envio, ainda nao sao preservados. Esta etapa protege os eventos aceitos no servidor; nao inclui uma fila offline no navegador.
- A durabilidade depende do volume e do disco. A fila nao garante recuperacao apos perda fisica do armazenamento. Inclua esses volumes no procedimento de backup e monitore espaco livre.
- O contador de senhas e a autenticacao ainda dependem do banco de logs; esta fila preserva auditoria, nao torna essas operacoes disponiveis sem o banco.

## Validacao em homologacao

Interrompa o banco de logs, gere eventos, confira os arquivos no volume, reinicie o backend e restaure o banco. Os eventos devem aparecer uma unica vez com o horario original. Repita interrompendo apenas o backend para verificar a fila do Next. Nao realize esse teste na recepcao em atendimento.
