// Bots sencillos controlados por el servidor. Su misión es que el mapa nunca
// esté vacío y dar algo de juego.
//
// Cómo deciden (cada tick):
//   1. Calculan un "rumbo deseado": volver al centro si están cerca del borde,
//      ir a por su comida objetivo (que recuerdan, para no oscilar) o vagar.
//   2. Con ese rumbo como referencia, prueban unos cuantos giros ("bigotes")
//      hasta dar con una dirección despejada: sin cuerpos cerca y sin borde.
//
// Al recordar el objetivo y elegir siempre el giro más pequeño posible, no se
// quedan dando vueltas ni se enroscan.

import {
  BOT_AVOID_RADIUS,
  BOT_BORDER_MARGIN,
  BOT_EDGE_MARGIN,
  BOT_FOOD_AHEAD_BONUS,
  BOT_FOOD_MIN_ALIGNMENT,
  BOT_FOOD_RANGE,
  BOT_LOOKAHEAD,
  BOT_WHISKER_STEPS,
  WORLD_RADIUS,
} from "../shared/constants.js";
import type { ComidaVisible, Punto } from "../shared/protocol.js";
import { normalizarAngulo } from "../shared/simulation.js";
import type { CuadriculaEspacial } from "./spatialGrid.js";
import type { SerpienteServidor } from "./snake.js";

export interface DecisionBot {
  angulo: number;
  acelerando: boolean;
}

/** Estado que cada bot conserva entre ticks. */
interface EstadoBot {
  /** Comida que persigue; se mantiene hasta comérsela o perderla de vista. */
  objetivoId: number | null;
  /** Rumbo de paseo, que cambia despacio. */
  anguloVagar: number;
  /** Lado preferido para esquivar (1 o -1); evita que todos giren igual. */
  lado: number;
}

export class ControladorBots {
  private estados = new Map<string, EstadoBot>();

  olvidar(id: string): void {
    this.estados.delete(id);
  }

  private estado(id: string, anguloInicial: number): EstadoBot {
    let estado = this.estados.get(id);
    if (!estado) {
      estado = {
        objetivoId: null,
        anguloVagar: anguloInicial,
        lado: Math.random() < 0.5 ? 1 : -1,
      };
      this.estados.set(id, estado);
    }
    return estado;
  }

  /** ¿Hay sitio por delante en esa dirección (sin cuerpos cerca ni borde)? */
  private estaDespejado(
    bot: SerpienteServidor,
    angulo: number,
    cuadricula: CuadriculaEspacial,
  ): boolean {
    const cabeza = bot.segmentos[0];
    if (!cabeza) return false;

    const dirX = Math.cos(angulo);
    const dirY = Math.sin(angulo);

    for (const distancia of [BOT_LOOKAHEAD, BOT_LOOKAHEAD * 2]) {
      const x = cabeza.x + dirX * distancia;
      const y = cabeza.y + dirY * distancia;

      // No salir del mapa (solo cerca del borde real; unos pocos px de margen).
      if (Math.hypot(x, y) > WORLD_RADIUS - BOT_EDGE_MARGIN) return false;

      // No acercarse a otra serpiente.
      for (const elemento of cuadricula.consultar(x, y)) {
        if (elemento.id === bot.id) continue;
        const d = Math.hypot(elemento.punto.x - x, elemento.punto.y - y);
        if (d < BOT_AVOID_RADIUS * 0.7) return false;
      }
    }
    return true;
  }

  /** Comida a la que apuntar: mantiene la anterior si sigue sirviendo. */
  private elegirComida(
    estado: EstadoBot,
    comida: ComidaVisible[],
    cabeza: Punto,
    angulo: number,
  ): ComidaVisible | null {
    if (estado.objetivoId !== null) {
      const actual = comida.find((c) => c.id === estado.objetivoId);
      if (actual && this.adelanteYEnRango(actual, cabeza, angulo)) {
        return actual;
      }
      estado.objetivoId = null;
    }

    // Solo comida que tiene delante: así nunca da media vuelta (ni se enrosca).
    const dirX = Math.cos(angulo);
    const dirY = Math.sin(angulo);
    let mejor: ComidaVisible | null = null;
    let mejorPuntaje = Infinity;

    for (const trozo of comida) {
      const dx = trozo.x - cabeza.x;
      const dy = trozo.y - cabeza.y;
      const distancia = Math.hypot(dx, dy);
      if (distancia > BOT_FOOD_RANGE || distancia < 1) continue;

      const alineacion = (dx * dirX + dy * dirY) / distancia; // -1..1
      if (alineacion < BOT_FOOD_MIN_ALIGNMENT) continue;

      const puntaje = distancia - BOT_FOOD_AHEAD_BONUS * alineacion;
      if (puntaje < mejorPuntaje) {
        mejorPuntaje = puntaje;
        mejor = trozo;
      }
    }

    estado.objetivoId = mejor ? mejor.id : null;
    return mejor;
  }

  /** ¿La comida está dentro del radio y en el cono frontal del bot? */
  private adelanteYEnRango(comida: ComidaVisible, cabeza: Punto, angulo: number): boolean {
    const dx = comida.x - cabeza.x;
    const dy = comida.y - cabeza.y;
    const distancia = Math.hypot(dx, dy);
    if (distancia > BOT_FOOD_RANGE || distancia < 1) return false;
    const alineacion = (dx * Math.cos(angulo) + dy * Math.sin(angulo)) / distancia;
    return alineacion >= BOT_FOOD_MIN_ALIGNMENT;
  }

  /** Rumbo ideal antes de tener en cuenta obstáculos. */
  private rumboDeseado(
    estado: EstadoBot,
    bot: SerpienteServidor,
    comida: ComidaVisible[],
  ): number {
    const cabeza = bot.segmentos[0];
    if (!cabeza) return bot.angulo;

    // Cerca del borde: al centro, sin dudar.
    if (Math.hypot(cabeza.x, cabeza.y) > WORLD_RADIUS - BOT_BORDER_MARGIN) {
      return Math.atan2(-cabeza.y, -cabeza.x);
    }

    const objetivo = this.elegirComida(estado, comida, cabeza, bot.angulo);
    if (objetivo) return Math.atan2(objetivo.y - cabeza.y, objetivo.x - cabeza.x);

    // Sin nada a la vista: pasea, pero tirando poco a poco hacia el centro
    // (donde hay más comida), cambiando de rumbo despacio.
    const haciaCentro = Math.atan2(-cabeza.y, -cabeza.x);
    const correccion = normalizarAngulo(haciaCentro - estado.anguloVagar) * 0.03;
    estado.anguloVagar = normalizarAngulo(estado.anguloVagar + correccion + (Math.random() - 0.5) * 0.06);
    return estado.anguloVagar;
  }

  /** Decide hacia dónde va un bot en este tick. */
  decidir(bot: SerpienteServidor, comida: ComidaVisible[], cuadricula: CuadriculaEspacial): DecisionBot {
    const cabeza = bot.segmentos[0];
    if (!cabeza) return { angulo: bot.angulo, acelerando: false };

    const estado = this.estado(bot.id, bot.angulo);
    const deseado = this.rumboDeseado(estado, bot, comida);

    // Si el rumbo deseado está libre, va directo (a por la comida o al centro).
    if (this.estaDespejado(bot, deseado, cuadricula)) {
      return { angulo: deseado, acelerando: false };
    }

    // Si está tapado, prueba giros a los lados, empezando por el lado propio,
    // y se queda con el que menos le obliga a cambiar de rumbo.
    let mejor: number | null = null;
    let mejorGiro = Infinity;

    for (const paso of BOT_WHISKER_STEPS) {
      for (const signo of [estado.lado, -estado.lado]) {
        const angulo = normalizarAngulo(deseado + signo * paso);
        if (!this.estaDespejado(bot, angulo, cuadricula)) continue;

        const giro = Math.abs(normalizarAngulo(angulo - bot.angulo));
        if (giro < mejorGiro) {
          mejorGiro = giro;
          mejor = angulo;
        }
      }
    }

    if (mejor !== null) return { angulo: mejor, acelerando: false };

    // Atrapado del todo: media vuelta.
    return { angulo: normalizarAngulo(bot.angulo + Math.PI), acelerando: false };
  }
}
