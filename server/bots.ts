// Bots sencillos controlados por el servidor. Su única misión es que el mapa
// nunca esté vacío y dar algo de juego. Deciden cada tick: hacia dónde girar y
// si acelerar. No son listos, solo evitan el borde, esquivan cuerpos y buscan
// la comida más cercana.

import { BOT_AVOID_RADIUS, BOT_BORDER_MARGIN, BOT_LOOKAHEAD, WORLD_RADIUS } from "../shared/constants.js";
import type { ComidaVisible } from "../shared/protocol.js";
import { normalizarAngulo } from "../shared/simulation.js";
import type { CuadriculaEspacial } from "./spatialGrid.js";
import type { SerpienteServidor } from "./snake.js";

export interface DecisionBot {
  angulo: number;
  acelerando: boolean;
}

/** Estado que cada bot conserva entre ticks (para no temblar al esquivar). */
interface EstadoBot {
  evasion: number; // -1 gira a la izquierda, 1 a la derecha
  evadiendo: number; // ticks que le quedan esquivando
}

/** Ruido pequeño para que los bots no vayan todos en línea recta. */
function ruido(): number {
  return (Math.random() - 0.5) * 0.3;
}

export class ControladorBots {
  private estados = new Map<string, EstadoBot>();

  olvidar(id: string): void {
    this.estados.delete(id);
  }

  private estado(id: string): EstadoBot {
    let estado = this.estados.get(id);
    if (!estado) {
      estado = { evasion: Math.random() < 0.5 ? -1 : 1, evadiendo: 0 };
      this.estados.set(id, estado);
    }
    return estado;
  }

  /** Decide hacia dónde va un bot en este tick. */
  decidir(bot: SerpienteServidor, comida: ComidaVisible[], cuadricula: CuadriculaEspacial): DecisionBot {
    const estado = this.estado(bot.id);
    const cabeza = bot.segmentos[0];
    if (!cabeza) return { angulo: bot.angulo, acelerando: false };

    // 1. Cerca del borde: vuelve hacia el centro. Muy cerca, sin desvío, para no
    //    quedarse pegado ni llegar a tocarlo.
    const distanciaCentro = Math.hypot(cabeza.x, cabeza.y);
    if (distanciaCentro > WORLD_RADIUS - BOT_BORDER_MARGIN) {
      const haciaCentro = Math.atan2(-cabeza.y, -cabeza.x);
      const muyCerca = distanciaCentro > WORLD_RADIUS - BOT_BORDER_MARGIN / 2;
      return { angulo: muyCerca ? haciaCentro : normalizarAngulo(haciaCentro + ruido()), acelerando: false };
    }

    // 2. Esquivar: mira un punto por delante y sus alrededores.
    if (estado.evadiendo > 0) estado.evadiendo--;
    const dirX = Math.cos(bot.angulo);
    const dirY = Math.sin(bot.angulo);
    const adelanteX = cabeza.x + dirX * BOT_LOOKAHEAD;
    const adelanteY = cabeza.y + dirY * BOT_LOOKAHEAD;

    for (const elemento of cuadricula.consultar(adelanteX, adelanteY)) {
      if (elemento.id === bot.id) continue;

      const distancia = Math.hypot(elemento.punto.x - cabeza.x, elemento.punto.y - cabeza.y);
      if (distancia < BOT_AVOID_RADIUS) {
        // Gira hacia el lado contrario al obstáculo y recuérdalo unos ticks.
        const cruz = dirX * (elemento.punto.y - cabeza.y) - dirY * (elemento.punto.x - cabeza.x);
        estado.evasion = cruz >= 0 ? -1 : 1;
        estado.evadiendo = 8;
        return { angulo: normalizarAngulo(bot.angulo + estado.evasion * 1.3), acelerando: true };
      }
    }

    if (estado.evadiendo > 0) {
      return { angulo: normalizarAngulo(bot.angulo + estado.evasion * 1.0), acelerando: true };
    }

    // 3. Buscar la comida más cercana dentro de un radio razonable.
    let mejor: ComidaVisible | null = null;
    let mejorDistancia = 420;
    for (const trozo of comida) {
      const distancia = Math.hypot(trozo.x - cabeza.x, trozo.y - cabeza.y);
      if (distancia < mejorDistancia) {
        mejorDistancia = distancia;
        mejor = trozo;
      }
    }
    if (mejor) {
      return {
        angulo: Math.atan2(mejor.y - cabeza.y, mejor.x - cabeza.x),
        acelerando: false,
      };
    }

    // 4. Sin nada a la vista: vaga hacia el centro con algo de desvío.
    const haciaCentro = Math.atan2(-cabeza.y, -cabeza.x);
    return { angulo: normalizarAngulo(haciaCentro + ruido() * 3), acelerando: false };
  }
}
