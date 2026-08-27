import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolDeclarations, toolMap } from './tools-restaurante';
import config from './config.worker.json';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function chatWithLuna(message: string, history: { role: string; content: string }[] = []) {
  if (!apiKey) {
    // Fallback sin API key: responde con datos reales de DB sin LLM
    return { text: '⚠️ Falta GEMINI_API_KEY. Configura .env con GEMINI_API_KEY para IA completa. Mientras, puedo ejecutar tools básicos.', tools: [] };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: config.modelo.modelo,
    systemInstruction: `Eres Luna-Worker, asistente del restaurante Demo OnlyFood. ${config.personalidad.tone.join(' ')} Usa tools para datos reales.`,
    tools: [{ functionDeclarations: toolDeclarations as any }],
    generationConfig: { temperature: config.modelo.temperature, maxOutputTokens: config.modelo.maxTokens },
  });

  const chat = model.startChat({
    history: history.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
  });

  let result = await chat.sendMessage(message);
  let response = result.response;
  let calls = response.functionCalls();

  // Loop de tool calling
  let iterations = 0;
  while (calls && calls.length > 0 && iterations < 5) {
    const parts: any[] = [];
    for (const call of calls) {
      const fn = (toolMap as any)[call.name];
      let toolResult: any = { error: `Tool ${call.name} no encontrada` };
      if (fn) {
        try {
          toolResult = await fn(call.args as any);
        } catch (e: any) {
          toolResult = { error: e.message };
        }
      }
      parts.push({ functionResponse: { name: call.name, response: { result: toolResult } } });
    }
    result = await chat.sendMessage(parts as any);
    response = result.response;
    calls = response.functionCalls();
    iterations++;
  }

  return { text: response.text(), tools: [] };
}

// Fallback simple: ejecuta keyword -> tool sin LLM
export async function handleKeywordCommand(text: string) {
  const t = text.toLowerCase();
  if (t.includes('pendientes') && t.includes('cocina')) {
    const r = await (toolMap as any).update_pedidos_bulk({ from: 'nuevo', to: 'en_preparacion' });
    return `Listo, mandé ${r.actualizados} pedidos de nuevo a cocina.`;
  }
  if (t.includes('plato más pedido') || t.includes('mas pedido')) {
    const m = t.match(/(\d+)\s*dias/);
    const days = m ? parseInt(m[1]) : 20;
    const top = await (toolMap as any).get_top_productos({ days, limit: 3 });
    if (!top.length) return `Sin ventas en los últimos ${days} días.`;
    return `Top ${days} días: ${top.map((p: any) => `${p.nombre} (${p.ventas} pedidos)`).join(', ')}`;
  }
  return null;
}
