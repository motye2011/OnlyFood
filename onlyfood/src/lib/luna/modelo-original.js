import { readFileSync } from "node:fs";
import { cpus } from "node:os";

const CONFIG = JSON.parse(readFileSync("config.json", "utf-8"));
const M = CONFIG.modelo || {};

const BASE_URL = (M.baseURL || "http://localhost:11434").replace(/\/+$/, "");
const MODELO_NOMBRE = M.modelo || "qwen3:8b";
const TIMEOUT_MS = M.timeoutMs ?? 240_000;
const REINTENTOS = M.reintentos ?? [3_000, 6_000];
const KEEP_ALIVE = M.keepAlive ?? "30m";
const TEMPERATURA_DEF = M.temperature ?? 1.0;
const MAX_TOKENS_DEF = M.maxTokens ?? 1500;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export class ErrorModelo extends Error {
  constructor(mensaje, { tipo = "desconocido", status, causa } = {}) {
    super(mensaje);
    this.name = "ErrorModelo";
    this.tipo = tipo;
    this.status = status;
    this.causa = causa;
  }
}

function esReintentable(err) {
  if (err?.tipo === "timeout") return true;
  if (err?.tipo === "conexion") return true;
  if (err?.tipo === "http" && err?.status >= 500) return true;
  return false;
}

async function intentar(mensajes, opciones) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), TIMEOUT_MS);

  const cuerpo = {
    model: MODELO_NOMBRE,
    messages: mensajes,
    stream: !!opciones.stream,
    options: {
      temperature: opciones.temperature ?? TEMPERATURA_DEF,
      num_predict: opciones.maxTokens ?? MAX_TOKENS_DEF,
      num_ctx: M.numCtx ?? 8192,
      num_threads: M.numThreads ?? cpus().length,
    },
    keep_alive: KEEP_ALIVE,
  };
  if (M.think === false) cuerpo.think = false;
  if (opciones.formatoJson) cuerpo.format = "json";

  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      signal: controlador.signal,
    });

    if (!res.ok) {
      throw new ErrorModelo(`Ollama respondió con estado ${res.status}.`, {
        tipo: "http",
        status: res.status,
      });
    }

    if (opciones.stream) {
      let contenido = "";
      for await (const fragmento of leerStream(res)) {
        contenido += fragmento;
        opciones.onToken?.(fragmento);
      }
      if (!contenido) {
        throw new ErrorModelo("Ollama devolvió una respuesta vacía o inválida.", { tipo: "vacio" });
      }
      return { contenido };
    }

    const datos = await res.json();
    const contenido = datos?.message?.content;
    if (typeof contenido !== "string") {
      throw new ErrorModelo("Ollama devolvió una respuesta vacía o inválida.", { tipo: "vacio" });
    }
    return { contenido, ...datos };
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new ErrorModelo(`El modelo tardó más de ${TIMEOUT_MS / 1000}s en responder.`, { tipo: "timeout" });
    }
    if (err?.name === "ErrorModelo") throw err;
    throw new ErrorModelo(
      `No pude conectar con Ollama (${BASE_URL}). ¿Está Ollama abierto en tu PC antes de usar a ${CONFIG.nombre}?`,
      { tipo: "conexion", causa: err }
    );
  } finally {
    clearTimeout(timer);
  }
}

async function* leerStream(res) {
  if (!res.body) return;
  const lector = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      let salto;
      while ((salto = buffer.indexOf("\n")) !== -1) {
        const linea = buffer.slice(0, salto).trim();
        buffer = buffer.slice(salto + 1);
        if (!linea) continue;
        try {
          const dato = JSON.parse(linea);
          if (dato?.message?.content) yield dato.message.content;
        } catch {
          /* fragmento parcial, se ignora */
        }
      }
    }
  } catch (err) {
    if (err?.name === "AbortError" || err?.name === "TypeError") throw err;
  }
}

export async function llamarModelo(mensajes, opciones = {}) {
  const reintentos = [...REINTENTOS, null];
  for (let i = 0; i < reintentos.length; i++) {
    try {
      return await intentar(mensajes, opciones);
    } catch (err) {
      const espera = reintentos[i];
      if (espera == null || !esReintentable(err)) throw err;
      await esperar(espera);
    }
  }
}

export function describirErrorModelo(err) {
  if (err instanceof ErrorModelo) {
    if (err.tipo === "conexion") return err.message;
    if (err.tipo === "timeout") return err.message;
    if (err.tipo === "http") {
      if (err.status === 404) {
        return `Ollama no encontró el modelo "${MODELO_NOMBRE}". Descárgalo con: ollama pull ${MODELO_NOMBRE}`;
      }
      return `Ollama respondió con error ${err.status}. Inténtalo de nuevo.`;
    }
    if (err.tipo === "vacio") return err.message;
    return err.message;
  }
  return err?.message || "Error desconocido del modelo.";
}

export async function verificarModelo() {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), 6_000);
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: controlador.signal });
    if (!res.ok) return { ok: false, motivo: `Ollama respondió ${res.status}.` };
    const datos = await res.json();
    const tiene = (datos.models || []).some((m) => m.name.startsWith(MODELO_NOMBRE));
    return tiene
      ? { ok: true, name: MODELO_NOMBRE }
      : { ok: false, motivo: `Ollama está corriendo pero no tienes el modelo ${MODELO_NOMBRE} descargado.` };
  } catch {
    return { ok: false, motivo: `Ollama no está corriendo (${BASE_URL}). Ábrelo antes de usar a ${CONFIG.nombre}.` };
  } finally {
    clearTimeout(timer);
  }
}