// Estado del mundo y bucle de tick. Todo lo que decide el juego vive aquí:
// mover serpientes, comer, resolver colisiones y armar el snapshot.

import {
  BOOST_LENGTH_COST,
  DEATH_FOOD_VALUE,
  DEATH_SEGMENTS_PER_FOOD,
  FOOD_COUNT,
  FOOD_RADIUS,
  FOOD_VALUE,
  SNAKE_BOOST_SPEED,
  SNAKE_MIN_BOOST_LENGTH,
  SNAKE_SPEED,
  SNAKE_START_LENGTH,
  SPATIAL_CELL_SIZE,
  TICK_MS,
} from "../shared/constants.js";
import type { ComidaVisible, EntradaRanking, MensajeServidor, Punto } from "../shared/protocol.js";
import {
  avanzarSerpiente,
  fueraDelMapa,
  girarHacia,
  puntoAleatorioEnMapa,
  radioSerpiente,
} from "../shared/simulation.js";
import type { SerpienteServidor } from "./snake.js";
import { aVisible, crearSerpiente } from "./snake.js";
import { CuadriculaEspacial } from "./spatialGrid.js";

/** Segundos que representa un tick. */
const DT = TICK_MS / 1000;

/** Cuántos jugadores entran en el ranking. */
const MAX_RANKING = 10;

/** Recibe el snapshot de cada tick para repartirlo entre los clientes. */
export type Difusor = (snapshot: MensajeServidor) => void;

/** Avisa de que un jugador murió, con su puntuación final. */
export type AvisoMuerte = (id: string, puntuacion: number) => void;

export class Juego {
  private serpientes = new Map<string, SerpienteServidor>();
  private comida: ComidaVisible[] = [];
  private siguienteComidaId = 0;
  private temporizador: ReturnType<typeof setInterval> | null = null;
  private difundir: Difusor | null = null;
  private alMorir: AvisoMuerte | null = null;
  private cuadricula = new CuadriculaEspacial(SPATIAL_CELL_SIZE);

  constructor() {
    for (let i = 0; i < FOOD_COUNT; i++) this.comida.push(this.nuevaComidaEnCirculo(FOOD_VALUE));
  }

  /** Comida nueva en un punto aleatorio del mapa. */
  private nuevaComidaEnCirculo(valor: number): ComidaVisible {
    const punto = puntoAleatorioEnMapa(FOOD_RADIUS);
    return { id: this.siguienteComidaId++, x: punto.x, y: punto.y, valor };
  }

  /** Comida nueva en una posición concreta (restos de una serpiente). */
  private nuevaComidaEn(punto: Punto, valor: number): ComidaVisible {
    return { id: this.siguienteComidaId++, x: punto.x, y: punto.y, valor };
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
  iniciar(difundir: Difusor, alMorir: AvisoMuerte): void {
    this.difundir = difundir;
    this.alMorir = alMorir;
    if (this.temporizador) return;
    this.temporizador = setInterval(() => this.tick(), TICK_MS);
  }

  detener(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = null;
  }

  /** Un paso de simulación completo. */
  private tick(): void {
    this.moverTodo();
    this.comerTodo();
    this.detectarMuertes();
    this.difundir?.(this.snapshot());
  }

  /** Gira cada serpiente hacia su input, la avanza y aplica el coste de acelerar. */
  private moverTodo(): void {
    for (const serpiente of this.serpientes.values()) {
      girarHacia(serpiente, serpiente.anguloObjetivo, DT);

      const acelera = serpiente.acelerando && serpiente.segmentos.length > SNAKE_MIN_BOOST_LENGTH;
      const velocidad = acelera ? SNAKE_BOOST_SPEED : SNAKE_SPEED;

      if (acelera) {
        // Acelerar consume longitud; no se puede bajar del mínimo.
        serpiente.longitudObjetivo = Math.max(
          SNAKE_MIN_BOOST_LENGTH,
          serpiente.longitudObjetivo - BOOST_LENGTH_COST * DT,
        );
      }

      // Los segmentos recortados caen como comida detrás.
      const restos = avanzarSerpiente(serpiente, DT, velocidad);
      for (const punto of restos) this.comida.push(this.nuevaComidaEn(punto, FOOD_VALUE));
    }
  }

  /** Comprueba si alguna cabeza tocó comida y repone la que se retiró. */
  private comerTodo(): void {
    for (const serpiente of this.serpientes.values()) {
      const cabeza = serpiente.segmentos[0];
      if (!cabeza) continue;

      const radio = radioSerpiente(serpiente);
      let crecimiento = 0;
      const repuestas: ComidaVisible[] = [];

      // Recorremos de atrás hacia delante porque podemos quitar elementos.
      for (let i = this.comida.length - 1; i >= 0; i--) {
        const trozo = this.comida[i];
        if (!trozo) continue;

        const distancia = Math.hypot(trozo.x - cabeza.x, trozo.y - cabeza.y);
        if (distancia >= radio + FOOD_RADIUS) continue;

        crecimiento += trozo.valor;
        this.comida.splice(i, 1);
        // Siempre se repone una comida normal: el mapa nunca se vacía.
        repuestas.push(this.nuevaComidaEnCirculo(FOOD_VALUE));
      }

      for (const trozo of repuestas) this.comida.push(trozo);
      if (crecimiento > 0) serpiente.longitudObjetivo += crecimiento;
    }
  }

  /** Mata a las serpientes que chocaron contra otra o contra el borde. */
  private detectarMuertes(): void {
    this.cuadricula.limpiar();
    for (const serpiente of this.serpientes.values()) {
      for (const segmento of serpiente.segmentos) {
        this.cuadricula.insertar({ id: serpiente.id, punto: segmento });
      }
    }

    const muertas: SerpienteServidor[] = [];

    for (const serpiente of this.serpientes.values()) {
      const cabeza = serpiente.segmentos[0];
      if (!cabeza) continue;

      if (fueraDelMapa(serpiente)) {
        muertas.push(serpiente);
        continue;
      }

      const radio = radioSerpiente(serpiente);
      for (const elemento of this.cuadricula.consultar(cabeza.x, cabeza.y)) {
        if (elemento.id === serpiente.id) continue; // su propio cuerpo no la mata

        const otra = this.serpientes.get(elemento.id);
        if (!otra) continue;

        const distancia = Math.hypot(elemento.punto.x - cabeza.x, elemento.punto.y - cabeza.y);
        if (distancia < radio + radioSerpiente(otra)) {
          muertas.push(serpiente);
          break;
        }
      }
    }

    for (const serpiente of muertas) this.matar(serpiente);
  }

  /** Convierte el cuerpo en comida, retira la serpiente y avisa al jugador. */
  private matar(serpiente: SerpienteServidor): void {
    if (!this.serpientes.has(serpiente.id)) return; // ya estaba muerta en este tick

    this.serpientes.delete(serpiente.id);

    const paso = Math.max(1, DEATH_SEGMENTS_PER_FOOD);
    for (let i = 0; i < serpiente.segmentos.length; i += paso) {
      const segmento = serpiente.segmentos[i];
      if (segmento) this.comida.push(this.nuevaComidaEn(segmento, DEATH_FOOD_VALUE));
    }

    const puntuacion = Math.max(0, serpiente.segmentos.length - SNAKE_START_LENGTH);
    this.alMorir?.(serpiente.id, puntuacion);
    console.log(`[juego] murió ${serpiente.nombre} (${serpiente.id.slice(0, 8)}) con ${puntuacion}`);
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
