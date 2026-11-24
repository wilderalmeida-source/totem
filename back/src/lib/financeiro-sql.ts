import { Prisma } from '../../prisma/app/generated/prisma/client'

// Primeiro dia do mês de competência do título (alias l = lancamentos).
export const competencia = Prisma.sql`COALESCE(
  CASE WHEN l.nr_ano BETWEEN 2000 AND 2100 AND l.nr_mes BETWEEN 1 AND 12 THEN make_date(l.nr_ano, l.nr_mes, 1) END,
  CASE WHEN upper(l.ds_historico) ~ 'COMPET.NCIA[^0-9A-Z]*(0?[1-9]|1[0-2])/20[0-9]{2}'
       THEN make_date(substring(upper(l.ds_historico) from 'COMPET.NCIA[^0-9A-Z]*(?:0?[1-9]|1[0-2])/(20[0-9]{2})')::int,
                      substring(upper(l.ds_historico) from 'COMPET.NCIA[^0-9A-Z]*(0?[1-9]|1[0-2])/20[0-9]{2}')::int, 1) END,
  CASE WHEN upper(l.ds_historico) ~ 'COMPET.NCIA[^A-Z0-9]*(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z.]*[^0-9]*20[0-9]{2}'
       THEN make_date(substring(upper(l.ds_historico) from 'COMPET.NCIA[^A-Z0-9]*(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[A-Z.]*[^0-9]*(20[0-9]{2})')::int,
                      array_position(ARRAY['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'],
                        substring(upper(l.ds_historico) from 'COMPET.NCIA[^A-Z0-9]*(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)')), 1) END,
  date_trunc('month', l.dt_emissao)::date)`


// Parcelas com o tipo do título e se é receita (alias p, l, c, g). Sem a conta de ajuste de saldo.
export const parcelas = Prisma.sql`
  pagamentos p
  JOIN lancamentos l ON l.cd_lancamento = p.cd_lancamento
  JOIN contas c ON c.cd_conta = l.cd_conta
  JOIN contas_grupos g ON g.cd_grupo = c.cd_grupo`
export const semAjuste = Prisma.sql`upper(COALESCE(c.ds_conta, '')) NOT LIKE 'AJUSTE DE SALDO%'`

