import { NextResponse } from 'next/server'

const API_INTERNA = process.env.LINK_API_INTERNA
const INTERNAL_TOKEN = process.env.TOKEN_API_INT
export async function GET() {
  if (!API_INTERNA) {
    return NextResponse.json(
      { error: 'LINK_API_INTERNA não configurada' },
      { status: 500 }
    )
  }

  const response = await fetch(`${API_INTERNA}/clinux/paineis-config`, {
    cache: 'no-store',
    headers: {
        'Authorization': `Bearer ${INTERNAL_TOKEN}`
      }
  })

  const data = await response.json()

  return NextResponse.json(data, {
    status: response.status,
  })
}

export async function POST(request: Request) {
  if (!API_INTERNA) {
    return NextResponse.json(
      { error: 'LINK_API_INTERNA não configurada' },
      { status: 500 }
    )
  }

  const body = await request.json()

  const response = await fetch(`${API_INTERNA}/clinux/paineis-config`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INTERNAL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  return NextResponse.json(data, {
    status: response.status,
  })
}