// Luna-Worker - Psique profesional adaptada de Luna 2.0
// Reusa lógica de psique.js pero con rasgos de trabajador
export * from './psique-original.js';

// Sobrescribe factorEstado para rasgos profesionales si se importa directo
// En config.worker.json los rasgos son: eficiencia, rigor, proactividad, confiabilidad, comunicacion, adaptabilidad, autonomia, precision
// El decaimiento y saturación se mantienen igual que Luna original
