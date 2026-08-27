const EMPTY_RELACION = () => ({
  conocidosDesde: null,
  conflictos: 0,
  reconciliaciones: 0,
  hitos: [],
});

export function crearTrazos(config) {
  const trazos = {};
  for (const [nombre, base] of Object.entries(config.rasgosIniciales || {})) {
    trazos[nombre] = { base, valor: base, causas: [] };
  }
  return trazos;
}

export function psiqueVacia(config) {
  return {
    trazos: crearTrazos(config),
    eventos: [],
    vinculos: {},
    relacion: EMPTY_RELACION(),
    patrones: [],
    ultimoDecaimiento: new Date().toISOString(),
  };
}

export function aplicarDecaimiento(memoria, config) {
  const ps = memoria;
  const tasa = config.psique?.decaimiento ?? 0.03;
  const ahora = Date.now();
  const antes = ps.ultimoDecaimiento ? new Date(ps.ultimoDecaimiento).getTime() : ahora;
  const dias = Math.max(0, (ahora - antes) / 86_400_000);
  if (dias <= 1) return 0;
  let cambios = 0;
  for (const trazo of Object.values(ps.trazos)) {
    const nuevo = trazo.valor + (trazo.base - trazo.valor) * Math.min(1, tasa * dias);
    const redondeado = Math.round(nuevo);
    if (redondeado !== trazo.valor) {
      trazo.valor = redondeado;
      cambios++;
    }
  }
  ps.ultimoDecaimiento = new Date().toISOString();
  return cambios;
}

function fijar(valor) {
  return Math.max(0, Math.min(100, Math.round(valor)));
}

function saturacion(valor) {
  return Math.max(0.3, 1 - Math.abs(valor - 50) / 60);
}

function factorEstado(trazos, rasgo) {
  const confianza = trazos.confianza?.valor ?? 50;
  const dependencia = trazos.dependenciaEmocional?.valor ?? 30;
  let f = 1;
  if (["celos", "inseguridad", "desconfianza", "posesividad"].includes(rasgo)) {
    if (confianza < 45) f *= 1.3;
    if (confianza > 80) f *= 0.75;
  }
  if (rasgo === "celos" && dependencia > 55) f *= 1.2;
  if (rasgo === "confianza" && trazos.desconfianza?.valor > 40) f *= 0.8;
  return f;
}

function habituacion(memoria, tipo, base, nMax = 6) {
  const recientes = memoria.eventos
    .filter((e) => e.tipo === tipo)
    .slice(-nMax).length;
  return base / (base + recientes);
}

function rasgoConocido(memoria, nombre) {
  return Boolean(memoria.trazos && memoria.trazos[nombre]);
}

const ENTIDADES_GENERICAS = new Set([
  "usuario", "el usuario", "yo", "mi", "mí", "él", "ella", "nosotros", "nosotras",
  "la relación", "la gente", "todo", "algo", "nada", "esto", "eso", "aquello",
  "el chico", "la chica", "mi amigo", "mi amiga", "casa", "vida",
]);

function entidadUtil(entidad) {
  if (!entidad) return false;
  const e = String(entidad).trim().toLowerCase();
  if (!e || e.length > 40) return false;
  return !ENTIDADES_GENERICAS.has(e);
}

export function aplicarAsimilacion(memoria, config, asimilacion, contexto) {
  if (!asimilacion) return { episodioId: null, deltas: [] };
  const ps = config.psique ?? {};
  const maxDelta = ps.maxDelta ?? 6;
  const sens = ps.sensibilidad ?? 1;
  const reparacion = ps.reparacion ?? 1.4;
  const limiteCausas = ps.limiteCausasPorRasgo ?? 12;

  const intensidad = Math.max(1, Math.min(10, Number(asimilacion.intensidad) || 5));
  const sentido = asimilacion.sentido === "positivo" ? 1 : asimilacion.sentido === "negativo" ? -1 : 0;
  const episodioId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const deltas = [];
  for (const cambio of asimilacion.cambioRasgos || []) {
    const nombre = cambio?.rasgo;
    const direccion = cambio?.direccion; // sube | baja | mantiene
    if (!nombre || !rasgoConocido(memoria, nombre) || direccion === "mantiene") continue;

    const trazo = memoria.trazos[nombre];
    const signo = direccion === "sube" ? 1 : -1;

    let delta = maxDelta * (intensidad / 10) * sens * saturacion(trazo.valor);
    delta *= factorEstado(memoria.trazos, nombre);
    delta *= habituacion(memoria, asimilacion.tipo || "evento", ps.habituacionBase ?? 4);

    const esRasgoNegativo = ["resentimiento", "celos", "desconfianza", "inseguridad", "agresividadVerbal", "posesividad"].includes(nombre);
    if (sentido > 0 && direccion === "baja" && esRasgoNegativo) delta *= reparacion;

    delta = Math.max(1, Math.round(delta));
    const nuevoValor = fijar(trazo.valor + signo * delta);
    const realDelta = nuevoValor - trazo.valor;
    if (realDelta === 0) continue;

    trazo.valor = nuevoValor;
    trazo.causas.push({
      episodioId,
      fecha: contexto.fecha,
      delta: realDelta,
      motivo: cambio.motivo || "",
    });
    deltas.push({ rasgo: nombre, delta: realDelta, motivo: cambio.motivo || "" });
  }

  const tipoEv = asimilacion.tipo || (sentido > 0 ? "positivo" : sentido < 0 ? "negativo" : "neutro");

  if (deltas.length > 0 || asimilacion.episodio) {
    memoria.eventos.push({
      id: episodioId,
      fecha: contexto.fecha,
      tipo: tipoEv,
      contexto: contexto.resumen,
      interpretacion: asimilacion.interpretacion || "",
      emociones: asimilacion.emociones || [],
      deltas,
      entidad: asimilacion.entidad || null,
    });
  }

  const entidad = asimilacion.entidad;
  if (entidadUtil(entidad)) {
    const clave = String(entidad).trim().toLowerCase();
    const v = memoria.vinculos[clave] || { valencia: 0, intensidad: 0, episodios: [] };
    if (sentido !== 0) {
      v.valencia = Math.max(-1, Math.min(1, v.valencia + 0.2 * sentido));
      v.intensidad = Math.max(v.intensidad, intensidad / 10);
    }
    if (!v.episodios.includes(episodioId)) v.episodios.push(episodioId);
    memoria.vinculos[clave] = v;
  }

  actualizarRelacion(memoria, tipoEv, contexto);
  recortarCausasYPocisiones(memoria, limiteCausas);
  return { episodioId, deltas };
}

function actualizarRelacion(memoria, tipo, contexto) {
  const rel = memoria.relacion || EMPTY_RELACION();
  if (!rel.conocidosDesde) rel.conocidosDesde = contexto.fecha;
  if (tipo === "conflicto") rel.conflictos++;
  if (tipo === "reconciliacion") { rel.reconciliaciones++; rel.conflictos = Math.max(0, rel.conflictos - 1); }
  memoria.relacion = rel;
}

function recortarCausasYPocisiones(memoria, limite) {
  for (const trazo of Object.values(memoria.trazos)) {
    if (trazo.causas.length > limite) trazo.causas = trazo.causas.slice(-limite);
  }
  const maxEv = 300;
  if (memoria.eventos.length > maxEv) {
    memoria.eventos = memoria.eventos.slice(-maxEv);
  }
}

export function generarPatrones(memoria, config) {
  const umbral = config.psique?.umbralCambio ?? 3;
  const eventos = memoria.eventos || [];
  if (eventos.length < umbral) return false;

  const porTipo = new Map();
  const porEntidad = new Map();
  const tiposRelacion = new Map();

  for (const e of eventos) {
    const t = e.tipo || "evento";
    porTipo.set(t, (porTipo.get(t) || 0) + 1);
    if (e.entidad) {
      const clave = String(e.entidad).trim().toLowerCase();
      porEntidad.set(clave, (porEntidad.get(clave) || 0) + 1);
    }
    if (["conflicto", "reconciliacion", "discusion", "celos"].includes(t)) {
      tiposRelacion.set(t, (tiposRelacion.get(t) || 0) + 1);
    }
  }

  const linea = (nombre, patron, evidencia) => ({ patron, evidencia });

  const nuevos = [];
  for (const [tipo, n] of porTipo) {
    if (n >= umbral && (tipo === "conflicto" || tipo === "reconciliacion" || tipo === "celos" || tipo === "rechazo" || tipo === "positivo" || tipo === "negativo")) {
      const rasgos = tipo === "conflicto" ? ["desconfianza"] : tipo === "celos" ? ["celos"] : tipo === "rechazo" ? ["inseguridad", "confianza"] : tipo === "reconciliacion" ? ["confianza", "afecto"] : ["afecto"];
      nuevos.push(linea(`reaccion a "${tipo}"`, `Cuando el usuario se comporta de forma "${tipo}", mi ${rasgos.join(" y ")} se desplaza.`, tipo));
    }
  }
  for (const [entidad, n] of porEntidad) {
    if (n >= umbral) {
      nuevos.push(linea(`rutina con "${entidad}"`, `"${entidad}" aparece mucho en nuestras vivencias; genero asociación emocional con ello.`, entidad));
    }
  }
  for (const [tipo, n] of tiposRelacion) {
    if (n >= umbral) {
      nuevos.push(linea(`patron_relacion_${tipo}`, `Nuestra relación vive varios episodios "${tipo}"; eso moldea cómo te percibo.`, tipo));
    }
  }

  if (nuevos.length) {
    memoria.patrones = [...(memoria.patrones || []).filter((p) => !p.obsoleto), ...nuevos];
    memoria.patrones = memoria.patrones.slice(-12);
    return true;
  }
  return false;
}

export function resumenRasgos(memoria) {
  const lineas = [];
  for (const [nombre, trazo] of Object.entries(memoria.trazos || {})) {
    if (trazo.valor === trazo.base && trazo.causas.length === 0) continue;
    const desvio = trazo.valor - trazo.base;
    const sentido = desvio > 0 ? "arriba" : desvio < 0 ? "abajo" : "estable";
    let linea = `- ${nombre}: ${trazo.valor} (base ${trazo.base}, tendencia ${sentido})`;
    const causa = trazo.causas[trazo.causas.length - 1];
    if (causa?.motivo) linea += ` — últ. causa: ${causa.motivo}`;
    lineas.push(linea);
  }
  return lineas.length ? lineas.join("\n") : "(sin cambios significativos todavía)";
}

export function explicarRasgo(memoria, nombre) {
  const trazo = memoria.trazos?.[nombre];
  if (!trazo) return `No conozco un rasgo llamado "${nombre}".`;
  const causas = trazo.causas.map((c) => `  • [${new Date(c.fecha).toLocaleDateString()}] (${c.delta > 0 ? "+" : ""}${c.delta}) ${c.motivo || ""}`).join("\n");
  return [
    `${nombre}: ${trazo.valor} (base ${trazo.base})`,
    causas || "  (tiene su valor de base, sin causas registradas)",
  ].join("\n");
}

export function listarEventos(memoria, limite = 10) {
  return (memoria.eventos || []).slice(-limite).map((e) => {
    const deltas = (e.deltas || []).map((d) => `${d.rasgo}${d.delta > 0 ? "+" : ""}${d.delta}`).join(", ");
    return `[${new Date(e.fecha).toLocaleDateString()}] ${e.tipo}: ${e.interpretacion || ""} ${deltas ? ` (${deltas})` : ""}`;
  }).join("\n");
}

export function resumenVinculos(memoria) {
  const v = memoria.vinculos || {};
  const entradas = Object.entries(v).filter(([, dato]) => dato.intensidad > 0);
  if (!entradas.length) return "(sin asociaciones emocionales marcadas todavía)";
  return entradas
    .map(([nombre, dato]) => {
      const etiqueta = dato.valencia > 0.2 ? "afecto positivo" : dato.valencia < -0.2 ? "asociación negativa" : "neutral";
      return `- ${nombre}: ${etiqueta} (${Math.round(dato.valencia * 100)}%)`;
    })
    .join("\n");
}

export function resumenPatrones(memoria) {
  const patrones = memoria.patrones || [];
  if (!patrones.length) return "(sin patrones detectados todavía)";
  return patrones
    .map((p) => `- ${p.patron}`)
    .join("\n");
}

export function explicarCausa(memoria, rasgo) {
  const trazo = memoria.trazos?.[rasgo];
  if (!trazo) return `No conozco un rasgo llamado "${rasgo}".`;
  const causas = trazo.causas.map((c) => `  • [${new Date(c.fecha).toLocaleDateString()}] (${c.delta > 0 ? "+" : ""}${c.delta}) ${c.motivo || ""}`).join("\n");
  return [
    `${rasgo}: ${trazo.valor} (base ${trazo.base})`,
    causas || "  (tiene su valor de base, sin causas registradas)",
  ].join("\n");
}