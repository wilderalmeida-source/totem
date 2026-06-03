import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const audioPath = searchParams.get('path'); // ex: /audios/chamada-123.mp3

  if (!audioPath) return new NextResponse('Missing path', { status: 400 });

  const NODE_SERVER = process.env.LINK_API_INTERNA;
  const INTERNAL_TOKEN = process.env.TOKEN_API_INT; // O token que o Node exige
  console.log(`${NODE_SERVER}${audioPath}`)

  try {
    // O servidor Next.js faz a chamada para o Node com o TOKEN escondido
    const res = await fetch(`${NODE_SERVER}${audioPath}`, {
      headers: {
        'Authorization': `Bearer ${INTERNAL_TOKEN}`
      }
    });

    if (!res.ok) throw new Error('Falha ao buscar áudio no Node');

    const audioBuffer = await res.arrayBuffer();
    
    // Retorna o áudio para o navegador como se o Next.js fosse o dono do arquivo
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (_err) {
    return new NextResponse(`Erro no proxy de áudio${_err}`, { status: 500 });
  }
}