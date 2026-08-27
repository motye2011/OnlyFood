import { NextRequest, NextResponse } from 'next/server';
import { chatWithLuna, handleKeywordCommand } from '@/lib/luna/modelo-gemini';

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message) return NextResponse.json({ error: 'Falta message' }, { status: 400 });

    // 1. Intenta comando rápido sin LLM (para "luna manda a cocina")
    const keywordRes = await handleKeywordCommand(message);
    if (keywordRes) {
      return NextResponse.json({ text: keywordRes, via: 'keyword' });
    }

    // 2. LLM + tools
    const res = await chatWithLuna(message, history);
    return NextResponse.json({ text: res.text, via: 'gemini' });
  } catch (e: any) {
    console.error('luna chat error', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
