// Una serpiente en el servidor. El servidor es la autoridad: aquí vive su
// estado real y aquí se aplican los inputs que llegan del cliente.

import type { Punto, SerpienteVisible } from "../shared/protocol.js";
import type { CuerpoSerpiente } from "../shared/simulation.js";
import { crearSegmentosIniciales } from "../shared/simulation.js";

export interface SerpienteServidor extends CuerpoSerpiente {
  id: string;
  nombre: string;
  skin: number;
  /** Ángulo pedido por el cliente; se aplica en el siguiente tick. */
  anguloObjetivo: number;
  /** Reservado para la Fase 3 (acelerar que consume longitud). */
  acelerando: boolean;
  /** ¿La controla el servidor (bot) en vez de un jugador? */
  esBot: boolean;
}

export function crearSerpiente(
  id: string,
  nombre: string,
  skin: number,
  origen: Punto,
  angulo: number,
  esBot = false,
): SerpienteServidor {
  const segmentos = crearSegmentosIniciales(origen, angulo);
  return {
    id,
    nombre,
    skin,
    angulo,
    anguloObjetivo: angulo,
    acelerando: false,
    esBot,
    longitudObjetivo: segmentos.length,
    segmentos,
  };
}

/** Guarda el input validado que envió el cliente. */
export function aplicarInput(serpiente: SerpienteServidor, angulo: number, acelerando: boolean): void {
  serpiente.anguloObjetivo = angulo;
  serpiente.acelerando = acelerando;
}

/** Convierte la serpiente a la forma que viaja en el snapshot.
 *  Redondea las coordenadas para que el JSON pese menos. */
export function aVisible(serpiente: SerpienteServidor): SerpienteVisible {
  return {
    id: serpiente.id,
    nombre: serpiente.nombre,
    skin: serpiente.skin,
    acelerando: serpiente.acelerando,
    segmentos: serpiente.segmentos.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
  };
}
