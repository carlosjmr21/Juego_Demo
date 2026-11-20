// Estado del mundo y bucle de tick. Todo lo que decide el juego vive aquí:
// mover serpientes, comer, y armar el snapshot que se envía a los clientes.

import { FOOD_COUNT, FOOD_GROWTH, FOOD_RADIUS, TICK_MS } from "../shared/constants.js";
import type { ComidaVisible, EntradaRanking, MensajeServidor } from "../shared/protocol.js";
import {
  avanzarSerpiente,
  girarHacia,
  limitarAlMapa,
  puntoAleatorioEnMapa,
  radioSerpiente,
} from "../shared/simulation.js";
import type { SerpienteServidor } from "./snake.js";
import { aVisible, crearSerpiente } from "./snake.js";

/** Segundos que representa un tick. */
const DT = TICK_MS / 1000;

/** Cuántos jugadores entran en el ranking. */
const MAX_RANKING = 10;

/** Recibe el snapshot de cada tick para repartirlo entre los clientes. */
export type Difusor = (snapshot: MensajeServidor) => void;

export class Juego {
  private serpientes = new Map<string, SerpienteServidor>();
  private comida: ComidaVisible[] = [];
  private siguienteComidaId = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private difundir: Difusor | null = null;

  constructor() {
    for (let i = 0; i < FOOD_COUNT; i++) this.comida.push(this.nuevaComida());
  }

  private nuevaComida(): ComidaVisible {
    const punto = puntoAleatorioEnMapa(FOOD_RADIUS);
    return { id: this.siguienteComidaId++, x: punto.x, y: punto.y };
  }

  /** Añade un jugador y devuelve su serpiente. */
  agregarJugador(id: string, nombre: string, skin: number): SerpienteServidor {
    const origen = puntoAleatorioEnMapa(200);
    const angulo = Math.random() * Math.PI * 2;
    const serpiente = crearSerpiente(id, nombre, skin, origen, angulo);
    this.serpientes.set(id, serpiente);
    return serpiente;
  }

  quitarJugador(id: string): void {
    this.serpientes.delete(id);
  }

  obtener(id: string): SerpienteServidor | undefined {
    return this.serpientes.get(id);
  }

  get cantidadSerpientes(): number {
    return this.serpientes.size;
  }

  /** Arranca el tick fijo. `difundir` se llama una vez por tick con el snapshot. */
  iniciar(difundir: Difusor): void {
    this.difundir = difundir;
    if (this.temporizador) return;
    this.temporizador = setInterval(() => this.tick(), TICK_MS);
  }

  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  /** Un paso de simulación: aplica inputs, mueve, come y difunde el estado. */
  private tick(): void {
    for (const serpiente of this.serpientes.values()) {
      girarHacia(serpiente, serpiente.anguloObjetivo, DT);
      avanzarSerpiente(serpiente, DT);
      limitarAlMapa(serpiente);
      this.comer(serpiente);
    }
    this.difundir?.(this.snapshot());
  }

  /** Comprueba si la cabeza tocó comida y, por cada una, repone otra. */
  private comer(serpiente: SerpienteServidor): void {
    const cabeza = serpiente.segmentos[0];
    if (!cabeza) return;

    const radio = radioSerpiente(serpiente);
    let comidas = 0;

    for (let i = 0; i < this.comida.length; i++) {
      const trozo = this.comida[i];
      if (!trozo) continue;

      const distancia = Math.hypot(trozo.x - cabeza.x, trozo.y - cabeza.y);
      if (distancia < radio + FOOD_RADIUS) {
        this.comida[i] = this.nuevaComida();
        comidas++;
      }
    }

    if (comidas > 0) serpiente.longitudObjetivo += comidas * FOOD_GROWTH;
  }

  /** Los jugadores más largos, de mayor a menor. */
  private ranking(): EntradaRanking[] {
    return [...this.serpientes.values()]
      .map((s) => ({ id: s.id, nombre: s.nombre, longitud: s.segmentos.length }))
      .sort((a, b) => b.longitud - a.longitud)
      .slice(0, MAX_RANKING);
  }

  /**
   * Snapshot del estado. Por ahora va el mapa entero; en la Fase 5 se
   * limitará al área de visión de cada jugador.
   */
  private snapshot(): MensajeServidor {
    return {
      t: "snapshot",
      serpientes: [...this.serpientes.values()].map(aVisible),
      comida: this.comida,
      ranking: this.ranking(),
    };
  }
}
