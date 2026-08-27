import { GoogleGenerativeAI } from '@google/generative-ai';
import { toolDeclarations, toolMap } from './tools-restaurante';
import config from './config.worker.json';

const apiKey = process.env.GEMINI_API_KEY || '';

export async function chatWithLuna(message: string, history: { role: string; content: string }[] = []) {
  if (!apiKey) {
    const fallback = await handleKeywordCommand(message);
    if (fallback) return { text: fallback, tools: [] };
    return { text: '⚠️ Falta GEMINI_API_KEY. Configura .env con GEMINI_API_KEY para IA completa. Prueba: "luna revisa si hay pedidos pendientes" o "luna plato más pedido 20 días" o "luna manda pendientes a cocina"', tools: [] };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: config.modelo.modelo,
    systemInstruction: `Eres Luna-Worker, asistente del restaurante Demo OnlyFood. ${config.personalidad.tone.join(' ')} Usa tools para datos reales.`,
    tools: [{ functionDeclarations: toolDeclarations as any }],
    generationConfig: { temperature: config.modelo.temperature, maxOutputTokens: config.modelo.maxTokens },
  });

  // Gemini exige que history empiece con 'user', filtra saludo inicial de Luna
  let cleanHistory = history.filter((h) => h.content && h.content.trim().length > 0);
  while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') cleanHistory.shift();
  const chat = model.startChat({
    history: cleanHistory.map((h) => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
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

// Fallback simple: ejecuta keyword -> tool sin LLM (para demo sin API key)
export async function handleKeywordCommand(text: string) {
  const t = text.toLowerCase().replace('luna', '').trim();
  if (t.includes('pendientes') && t.includes('cocina')) {
    const r = await (toolMap as any).update_pedidos_bulk({ from: 'nuevo', to: 'en_preparacion' });
    return `Listo, mandé ${r.actualizados} pedidos de nuevo a cocina.`;
  }
  if (t.includes('revisa') && t.includes('pedido') || t.includes('hay pedidos') || t.includes('pendientes')) {
    const pedidos: any[] = await (toolMap as any).get_pedidos({ estado: 'nuevo', limit: 10 });
    const prep: any[] = await (toolMap as any).get_pedidos({ estado: 'en_preparacion', limit: 10 });
    const total = pedidos.length + prep.length;
    if (total === 0) return 'No hay pedidos pendientes. Todo al día.';
    return `Hay ${total} pedidos pendientes: ${pedidos.length} nuevos y ${prep.length} en preparación. ${pedidos.length > 0 ? `Siguiente: #${pedidos[0].numero} Mesa ${pedidos[0].mesa}` : ''}`;
  }
  if (t.includes('plato más pedido') || t.includes('mas pedido') || t.includes('más vendido') || t.includes('mas vendido') || t.includes('productos mas vendidos')) {
    const m = t.match(/(\d+)\s*dias/);
    const days = m ? parseInt(m[1]) : 20;
    const top = await (toolMap as any).get_top_productos({ days, limit: 3 });
    if (!top.length) return `Sin ventas en los últimos ${days} días.`;
    return `Top ${days} días: ${top.map((p: any) => `${p.nombre} (${p.ventas} pedidos, ${p.unidades} uds)`).join(', ')}`;
  }
  if (t.includes('ventas') || t.includes('cuánto vendimos')) {
    const m = t.match(/(\d+)\s*dias/);
    const days = m ? parseInt(m[1]) : 7;
    const v: any = await (toolMap as any).get_ventas({ days });
    return `Últimos ${days} días: ${v.pedidos} pedidos, $${Number(v.ventas).toLocaleString()} en ventas.`;
  }
  if (t.includes('mesas')) {
    const mesas: any[] = await (toolMap as any).get_mesas_estado();
    const ocupadas = mesas.filter((m: any) => m.estado === 'ocupada').length;
    return `Mesas: ${ocupadas}/${mesas.length} ocupadas. ${mesas.map((m: any) => `M${m.numero}:${m.estado}`).join(', ')}`;
  }
  if (t.includes('agrega') && (t.includes('hamburguesa') || t.includes('plato') || t.includes('producto'))) {
    // Extrae nombre entre "agrega" y "ingredientes" o hasta fin
    const nombreMatch = t.match(/agrega\s+([a-záéíóúñ\s]+?)(?:ingredientes|con|$)/);
    let nombre = nombreMatch ? nombreMatch[1].trim() : 'Nuevo producto';
    // Limpia "un nuevo plato," etc
    nombre = nombre.replace(/un nuevo plato,?/, '').replace(/agrega/, '').trim();
    if (nombre.length < 3) nombre = 'Hamburguesa Doble';
    // Capitaliza
    nombre = nombre.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const ingMatch = t.match(/ingredientes\s*\(([^)]+)\)/);
    const ingredientes = ingMatch ? ingMatch[1] : '';
    const r: any = await (toolMap as any).create_producto({ nombre, precio: 28000, descripcion: `Creado por Luna`, categoria: 'Hamburguesas', ingredientes });
    if (r.ok) return `Listo, creé "${r.producto}" a $${r.precio.toLocaleString()} con ingredientes: ${ingredientes || 'no especificados'}. Ya está en /panel/productos.`;
    return r.error || 'No pude crear el producto';
  }
  if (t.includes('precio') || t.includes('cambia')) {
    return 'Para cambiar precio di: "luna cambia hamburguesa clásica a 27000" — necesito GEMINI_API_KEY para eso, o usa el panel de productos.';
  }
  return null;
}
