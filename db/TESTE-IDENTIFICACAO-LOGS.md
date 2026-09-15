# Homologação da identificação

Na categoria TOTEM, filtre pelo ID do fluxo e abra os detalhes dos eventos:

1. `identificacao_entrada_original`: valor recebido do campo pelo frontend antes
   do trim/conversão da busca inicial, quando uma pesquisa válida é disparada.
2. `identificacao_confirmacao_original`: entrada complementar e nome/data selecionados.
3. `identificacao_enviada_next`: campos enviados para confirmar a sessão.
4. `identificacao_recebida`: entrada recebida pelo Next, antes do trim do servidor.
5. `identificacao_enviada_backend`: valores normalizados encaminhados ao backend.
6. `diagnostico_identificacao`: filtro Prisma, quantidade e amostra antes do filtro final.
7. `identificacao_retorno_backend`: status e resposta recebida pelo Next.
8. `identificacao_resposta_final`: decisão do Next, erro mostrado ou paciente confirmado.
9. `identificacao_resposta_navegador`: resposta efetivamente recebida no navegador.

Teste nomes com espaços no início/fim, paciente existente, dados sem correspondência,
data inválida, tentativas esgotadas e backend indisponível. Compare o status e o erro
registrados com a mensagem apresentada. Confira também o fluxo por QR.

Os campos originais correspondem ao valor fornecido pelo componente de entrada:
o campo controlado e a máscara podem já ter convertido caracteres durante a digitação.
Não há captura de teclas. Nome limitado a 150 caracteres, com tamanho original e
marcador de truncamento; respostas em lista têm amostra de até 10 itens. CPF completo,
tokens e cookies não são copiados pelo novo diagnóstico. Não são respostas HTTP brutas.

Eventos do navegador continuam dependendo de conseguir chegar ao Next. O registro
final da confirmação cobre validação e processamento após as verificações de acesso;
bloqueios do operador/origem ocorrem antes desses eventos. Nenhuma consulta ao banco
de homologação foi executada durante a implementação.
