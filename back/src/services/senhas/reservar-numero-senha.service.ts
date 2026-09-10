import { flowAudit, auditOperation } from '../../lib/flow-audit'
import { prisma } from '../../../config/prismaDB'
import { PrismaLog } from '../../../config/prismalog'

export async function reservarNumeroSenha(hoje: Date): Promise<number> {
  const periodo = { gte: hoje, lt: new Date(hoje.getTime() + 86400000) }
  // Apenas leituras no banco clinico, inclusive para a transicao no meio do dia.
  const total = await auditOperation('clinico.contagem', () => prisma.atendimentos_senhas.count({ where: { dt_entrada: periodo } }))
  const maior = await auditOperation('clinico.maior_numero', () => prisma.atendimentos_senhas.aggregate({
    where: { dt_entrada: periodo, OR: [{ ds_opcao: { not: 'C' } }, { ds_opcao: null }] },
    _max: { nr_senha: true },
  }))
  const piso = Math.max(total, maior._max.nr_senha ?? 0)
  // A reserva e confirmada nos logs antes da gravacao clinica. Nunca devolver o numero.
  const rows = await auditOperation('logs.reserva_numero', () => PrismaLog.$queryRaw<{ number: number }[]>`
    INSERT INTO "TotemSenhaCounter" ("date", "number")
    VALUES (${hoje.toISOString().slice(0, 10)}::date, ${piso + 1})
    ON CONFLICT ("date") DO UPDATE
    SET "number" = GREATEST("TotemSenhaCounter"."number", ${piso}) + 1
    RETURNING "number"
  `)
  if (!Number.isSafeInteger(rows[0]?.number) || rows[0].number <= 0) {
    throw new Error('Falha ao reservar numero da senha')
  }
  flowAudit('numero_reservado', 'logs.contador', { number: rows[0].number, date: hoje.toISOString().slice(0, 10), code: 'NUMBER_RESERVED' })
  return rows[0].number
}
