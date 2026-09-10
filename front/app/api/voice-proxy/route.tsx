import { auditServer } from '@/lib/flow-audit-server';
﻿import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const start = Date.now();
  const audioPath = new URL(request.url).searchParams.get('path');

  // Os geradores retornam MP3 diretamente em /audios/, sem subdiretórios.
  if (!audioPath || !/^\/audios\/[a-zA-Z0-9_-]+\.mp3$/.test(audioPath)) {
    return new NextResponse('Caminho de áudio inválido.', { status: 400 });
  }

  const apiBase = process.env.LINK_API_INTERNA;
  const apiToken = process.env.TOKEN_API_INT;
  if (!apiBase || !apiToken) {
    return new NextResponse('Serviço de áudio não configurado.', { status: 503 });
  }

  try {
    // O navegador acessa o Next; somente o Next acessa o container do backend.
    const target = new URL(audioPath, apiBase);
    if (!['http:', 'https:'].includes(target.protocol)) {
      return new NextResponse('Serviço de áudio não configurado.', { status: 503 });
    }

    const res = await fetch(target, {
      headers: { Authorization: `Bearer ${apiToken}` },
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    // Não seguir redirecionamentos que possam contornar a restrição de rota.
    if (!res.ok) {
      await res.body?.cancel();
      return new NextResponse('Áudio indisponível.', {
        status: res.status === 404 ? 404 : 502,
      });
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    auditServer(request, 'audio_proxy_falhou', 'audio.proxy', { code: 'AUDIO_PROXY_FAILED', durationMs: Date.now() - start });
    return new NextResponse('Falha ao buscar áudio.', { status: 502 });
  }
}
