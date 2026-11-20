// Protocolo de mensajes cliente ↔ servidor.
// Son uniones discriminadas por el campo `t`. JSON por ahora.

export interface Punto {
  x: number;
  y: number;
}

export interface SerpienteVisible {
  id: string;
  nombre: string;
  skin: number;
  segmentos: Punto[];
  /** ¿Está acelerando? El cliente lo usa para el brillo. */
  acelerando: boolean;
}

export interface ComidaVisible {
  id: number;
  x: number;
  y: number;
  /** Cuánto alimenta esta comida (las de restos valen más). */
  valor: number;
}

export interface EntradaRanking {
  id: string;
  nombre: string;
  longitud: number;
}

/** Mensajes que el cliente envía al servidor. */
export type MensajeCliente =
  | { t: "join"; nombre: string; skin: number }
  | { t: "input"; angulo: number; acelerando: boolean };

/** Mensajes que el servidor envía al cliente. */
export type MensajeServidor =
  | { t: "welcome"; id: string; radioMapa: number; tickRate: number }
  | {
      t: "snapshot";
      serpientes: SerpienteVisible[];
      comida: ComidaVisible[];
      ranking: EntradaRanking[];
    }
  | { t: "dead"; puntuacion: number };
