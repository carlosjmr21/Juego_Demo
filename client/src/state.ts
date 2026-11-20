import {
  FOOD_COUNT,
  FOOD_GROWTH,
  FOOD_RADIUS,
  SEGMENT_SPACING,
  SNAKE_BASE_RADIUS,
  SNAKE_RADIUS_GROWTH,
  SNAKE_SPEED,
  SNAKE_START_LENGTH,
  SNAKE_TURN_RATE,
  WORLD_RADIUS,
} from "../../shared/constants";
import type { Punto } from "../../shared/protocol";
/**
 * Estado local de la Fase 1: el juego vive entero en el cliente.
 * En la Fase 2 esta lógica se moverá al servidor; por eso está en funciones
 * pequeñas y sin dependencias del DOM.
 */

export interface SerpienteLocal {
  /** Posiciones de los segmentos; el índice 0 es la cabeza. */
  segmentos: Punto[];
  /** Ángulo actual de la cabeza (radianes). */
  angulo: number;
  /** Longitud a la que la serpiente está creciendo poco a poco. */
  longitudObjetivo: number;
  skin: number;
}

export interface ComidaLocal {
  x: number;
  y: number;
  color: string;
}

export interface EstadoMundo {
  serpiente: SerpienteLocal;
  comida: ComidaLocal[];
}

/** Devuelve un punto aleatorio dentro del círculo del mapa, con margen. */
function puntoAleatorioEnMapa(margen = 0): Punto {
  const radio = Math.sqrt(Math.random()) * (WORLD_RADIUS - margen);
  const angulo = Math.random() * Math.PI * 2;
  return { x: Math.cos(angulo) * radio, y: Math.sin(angulo) * radio };
}

const COLORES_COMIDA = ["#facc15", "#fb923c", "#4ade80", "#38bdf8", "#f472b6", "#a78bfa"];

function crearComida(): ComidaLocal {
  const punto = puntoAleatorioEnMapa(FOOD_RADIUS);
  const color = COLORES_COMIDA[Math.floor(Math.random() * COLORES_COMIDA.length)] ?? "#facc15";
  return { x: punto.x, y: punto.y, color };
}

/** Crea la serpiente en el centro, con los segmentos extendidos hacia atrás. */
function crearSerpiente(skin: number): SerpienteLocal {
  const segmentos: Punto[] = [];
  // Empieza mirando hacia la derecha (ángulo 0).
  for (let i = 0; i < SNAKE_START_LENGTH; i++) {
    segmentos.push({ x: -i * SEGMENT_SPACING, y: 0 });
  }
  return { segmentos, angulo: 0, longitudObjetivo: SNAKE_START_LENGTH, skin };
}

/** Radio de un segmento según la longitud de la serpiente. */
export function radioSerpiente(serpiente: SerpienteLocal): number {
  const extra = serpiente.segmentos.length - SNAKE_START_LENGTH;
  return SNAKE_BASE_RADIUS * (1 + Math.max(0, extra) * SNAKE_RADIUS_GROWTH);
}

export function crearMundo(): EstadoMundo {
  const comida: ComidaLocal[] = [];
  for (let i = 0; i < FOOD_COUNT; i++) comida.push(crearComida());
  return { serpiente: crearSerpiente(0), comida };
}

/** Normaliza un ángulo al rango [-PI, PI]. */
function normalizarAngulo(angulo: number): number {
  while (angulo > Math.PI) angulo -= Math.PI * 2;
  while (angulo < -Math.PI) angulo += Math.PI * 2;
  return angulo;
}

/** Gira la cabeza hacia el ángulo objetivo, sin superar el giro máximo por tick. */
export function girarHacia(serpiente: SerpienteLocal, anguloObjetivo: number, dt: number): void {
  const diferencia = normalizarAngulo(anguloObjetivo - serpiente.angulo);
  const maximo = SNAKE_TURN_RATE * dt;
  const giro = Math.max(-maximo, Math.min(maximo, diferencia));
  serpiente.angulo = normalizarAngulo(serpiente.angulo + giro);
}

/** Avanza la cabeza y recoloca el cuerpo en cadena. */
export function avanzarSerpiente(serpiente: SerpienteLocal, dt: number): void {
  const cabeza = serpiente.segmentos[0];
  if (!cabeza) return;

  cabeza.x += Math.cos(serpiente.angulo) * SNAKE_SPEED * dt;
  cabeza.y += Math.sin(serpiente.angulo) * SNAKE_SPEED * dt;

  // Cada segmento se coloca a distancia fija del anterior.
  for (let i = 1; i < serpiente.segmentos.length; i++) {
    const previo = serpiente.segmentos[i - 1];
    const actual = serpiente.segmentos[i];
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
  const ultimo = serpiente.segmentos[serpiente.segmentos.length - 1];
  if (ultimo && serpiente.segmentos.length < serpiente.longitudObjetivo) {
    serpiente.segmentos.push({ x: ultimo.x, y: ultimo.y });
  }
}

/** Mantiene la cabeza dentro del mapa (provisional; en la Fase 3 el borde mata). */
export function limitarAlMapa(serpiente: SerpienteLocal): void {
  const cabeza = serpiente.segmentos[0];
  if (!cabeza) return;

  const distancia = Math.hypot(cabeza.x, cabeza.y);
  const limite = WORLD_RADIUS - radioSerpiente(serpiente);
  if (distancia > limite) {
    const factor = limite / distancia;
    cabeza.x *= factor;
    cabeza.y *= factor;
  }
}

/**
 * Revisa si la cabeza comió algo. Devuelve cuánta comida se comió,
 * y repone la comida retirada en otro punto del mapa.
 */
export function comer(estado: EstadoMundo): number {
  const cabeza = estado.serpiente.segmentos[0];
  if (!cabeza) return 0;

  const radio = radioSerpiente(estado.serpiente);
  let comidas = 0;

  for (let i = estado.comida.length - 1; i >= 0; i--) {
    const comida = estado.comida[i];
    if (!comida) continue;

    const distancia = Math.hypot(comida.x - cabeza.x, comida.y - cabeza.y);
    if (distancia < radio + FOOD_RADIUS) {
      estado.comida[i] = crearComida();
      comidas++;
    }
  }

  if (comidas > 0) {
    estado.serpiente.longitudObjetivo += comidas * FOOD_GROWTH;
  }
  return comidas;
}

/** Puntuación provisional: cuánto ha crecido la serpiente. */
export function puntuacion(serpiente: SerpienteLocal): number {
  return Math.max(0, serpiente.segmentos.length - SNAKE_START_LENGTH);
}
