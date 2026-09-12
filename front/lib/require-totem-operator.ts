import { NextRequest, NextResponse } from 'next/server'
import { checkTotemAccess } from './totem-access'

export async function requireTotemOperator(request: NextRequest) {
  try {
    if ((await checkTotemAccess(request)).allowed) return null
    return NextResponse.json({ error: 'Libere o totem com cartão e PIN.' }, { status: 401 })
  } catch { return NextResponse.json({ error: 'Acesso ao totem indisponível.' }, { status: 503 }) }
}
