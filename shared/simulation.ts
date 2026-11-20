// Física de las serpientes, compartida entre servidor y cliente.
// El servidor es la autoridad y la ejecuta en cada tick; el cliente no la usa
// para decidir nada (solo para leer radios y ángulos al dibujar).
// Todo son funciones puras sobre datos serializables.

import {
  SEGMENT_SPACING,
  SNAKE_BASE_RADIUS,
  SNAKE_RADIUS_GROWTH,
  SNAKE_SPEED,
  SNAKE_START_LENGTH,
  SNAKE_TURN_RATE,
  WORLD_RADIUS,
} from "./constants.js";
import type { Punto } from "./protocol.js";

/** Cuerpo de una serpiente: lo mínimo para moverla y dibujarla. */
export interface CuerpoSerpiente {
  /** Posiciones de los segmentos; el índice 0 es la cabeza. */
  segmentos: Punto[];
  /** Ángulo actual de la cabeza (radianes). */
  angulo: number;
  /** Longitud a la que la serpiente va creciendo poco a poco. */
  longitudObjetivo: number;
}

/** Coloca los segmentos iniciales extendidos hacia atrás desde el origen. */
export function crearSegmentosIniciales(origen: Punto, angulo = 0): Punto[] {
  const dx = Math.cos(angulo);
  const dy = Math.sin(angulo);
  const segmentos: Punto[] = [];
  for (let i = 0; i < SNAKE_START_LENGTH; i++) {
    segmentos.push({ x: origen.x - dx * i * SEGMENT_SPACING, y: origen.y - dy * i * SEGMENT_SPACING });
  }
  return segmentos;
}

/** Radio de cada segmento según cuántos segmentos tiene la serpiente. */
export function radioPorLongitud(cantidadSegmentos: number): number {
  const extra = cantidadSegmentos - SNAKE_START_LENGTH;
  return SNAKE_BASE_RADIUS * (1 + Math.max(0, extra) * SNAKE_RADIUS_GROWTH);
}

/** Radio de cada segmento según cuánto ha crecido la serpiente. */
export function radioSerpiente(cuerpo: CuerpoSerpiente): number {
  return radioPorLongitud(cuerpo.segmentos.length);
}

/** Normaliza un ángulo al rango [-PI, PI]. */
export function normalizarAngulo(angulo: number): number {
  while (angulo > Math.PI) angulo -= Math.PI * 2;
  while (angulo < -Math.PI) angulo += Math.PI * 2;
  return angulo;
}

/** Gira la cabeza hacia el ángulo objetivo sin superar el giro máximo por tick. */
export function girarHacia(cuerpo: CuerpoSerpiente, anguloObjetivo: number, dt: number): void {
  const diferencia = normalizarAngulo(anguloObjetivo - cuerpo.angulo);
  const maximo = SNAKE_TURN_RATE * dt;
  const giro = Math.max(-maximo, Math.min(maximo, diferencia));
  cuerpo.angulo = normalizarAngulo(cuerpo.angulo + giro);
}

/** Avanza la cabeza y recoloca el cuerpo en cadena. */
export function avanzarSerpiente(cuerpo: CuerpoSerpiente, dt: number): void {
  const cabeza = cuerpo.segmentos[0];
  if (!cabeza) return;

  cabeza.x += Math.cos(cuerpo.angulo) * SNAKE_SPEED * dt;
  cabeza.y += Math.sin(cuerpo.angulo) * SNAKE_SPEED * dt;

  // Cada segmento se coloca a distancia fija del anterior.
  for (let i = 1; i < cuerpo.segmentos.length; i++) {
    const previo = cuerpo.segmentos[i - 1];
    const actual = cuerpo.segmentos[i];
    if (!previo || !actual) continue;

    let dx = actual.x - previo.x;
    let dy = actual.y - previo.y;
    const distancia = Math.hypot(dx, dy) || 1;
    dx /= distancia;
    dy /= distancia;
    actual.x = previo.x + dx * SEGMENT_SPACING;
    actual.y = previo.y + dy * SEGMENT_SPACING;
  }

  // Crece poco a poco hasta la longitud objetivo (un segmento por tick como mucho).
  const ultimo = cuerpo.segmentos[cuerpo.segmentos.length - 1];
  if (ultimo && cuerpo.segmentos.length < cuerpo.longitudObjetivo) {
    cuerpo.segmentos.push({ x: ultimo.x, y: ultimo.y });
  }
}

/** Mantiene la cabeza dentro del mapa (provisional; en la Fase 3 el borde mata). */
export function limitarAlMapa(cuerpo: CuerpoSerpiente): void {
  const cabeza = cuerpo.segmentos[0];
  if (!cabeza) return;

  const distancia = Math.hypot(cabeza.x, cabeza.y);
  const limite = WORLD_RADIUS - radioSerpiente(cuerpo);
  if (distancia > limite) {
    const factor = limite / distancia;
    cabeza.x *= factor;
    cabeza.y *= factor;
  }
}

/** Punto aleatorio dentro del círculo del mapa, dejando el margen indicado. */
export function puntoAleatorioEnMapa(margen = 0): Punto {
  const radio = Math.sqrt(Math.random()) * Math.max(0, WORLD_RADIUS - margen);
  const angulo = Math.random() * Math.PI * 2;
  return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio };
}
