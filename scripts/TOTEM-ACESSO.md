# Acesso de colaboradores ao totem

O colaborador libera o terminal para varios pacientes. A sessao do paciente
continua independente e termina ao concluir o atendimento. O login administrativo
nao exige cartao e nao libera automaticamente o atendimento.

## Instalacao

1. Faca backup do banco PostgreSQL de configuracoes/logs.
2. Aplique somente o arquivo
   `back/prisma-logs/migrations/20260911020000_totem_operator_access/migration.sql`
   nesse banco, preferencialmente em uma transacao com parada em caso de erro.
   Ele cria quatro tabelas e nao apaga dados existentes.
3. Reconstrua e atualize backend e frontend. O cliente Prisma deve ser gerado
   com `prisma.logs.config.ts`, como no processo de build do projeto.
4. Na Central, abra **Acesso ao totem**. Requer permissao de usuarios (`USUARIOS`)
   ou administrador completo.
5. Cadastre um colaborador, PIN temporario e sua data/hora de expiracao.
6. Baixe o cartao SVG, que pode ser aberto e impresso no navegador.
7. Habilite a exigencia de cartao/PIN e teste em homologacao antes de producao.

O `db/init/01_init.sql` tambem contem as tabelas para bancos novos. Reiniciar o
container com volume existente nao executa automaticamente os scripts de init.
Nao remova volumes para atualizar. Se usar controle de migrations do Prisma,
coordene a aplicacao/registro dessa migration com o historico ja existente.

## Operacao

- `/login-totem`: leia o QR em leitor USB configurado como teclado (HID).
  Esta implementacao nao usa camera. Confira o layout do leitor para o UUID.
- Digite o PIN no teclado numerico da tela. Sao aceitos de 4 a 12 digitos.
- No primeiro acesso, apos redefinicao ou vencimento, autentique com o PIN
  atual/temporario e escolha outro PIN, com confirmacao.
- O totem fica liberado por 12 horas por padrao, configuravel de 1 a 24 horas.
  Finalizar um paciente nao encerra essa liberacao.
- **Bloquear totem**, na pagina inicial, encerra a liberacao.
- **Admin**, no topo do login, abre o login administrativo normal.
- A validade apos troca e de 90 dias por padrao, configuravel de 1 a 365 dias.
- Alterar a politica encerra todas as liberacoes. Editar/desativar um
  colaborador ou renovar seu cartao invalida as sessoes dele.
- Em caso de perda do cartao, use **Renovar cartao** e baixe a nova versao.
- O recurso inicia desabilitado; cadastre um colaborador ativo antes de ativar.

## Seguranca e validacao

PINs sao armazenados como hash scrypt com salt; o cartao contem o UUID, nao o PIN.
Tokens de sessao ficam em cookies HttpOnly e no banco apenas como hash.
Ha limite por cartao (5 tentativas por janela de 15 minutos) e por origem.
Use HTTPS em producao para proteger PINs e cookies em transito; em HTTP a rede
pode intercepta-los. Configure o proxy para substituir cabecalhos encaminhados
do cliente, incluindo X-Forwarded-For, X-Forwarded-Host e X-Forwarded-Proto.
Mantenha a API interna e seu token restritos ao frontend confiavel.

Os testes automatizados usam banco simulado. Antes da ativacao, valide o leitor
fisico, a impressao/leitura do cartao, troca inicial, PIN expirado, bloqueio,
desativacao e atendimentos consecutivos no equipamento real.
