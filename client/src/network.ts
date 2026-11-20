// Conexión con el servidor: envía el input y guarda los snapshots que llegan.
// El cliente no simula nada; solo interpola lo último recibido.

import { INTERPOLATION_DELAY_MS, TICK_MS } from "../../shared/constants";
import type {
  ComidaVisible,
  EntradaRanking,
  MensajeCliente,
  MensajeServidor,
  Punto,
  SerpienteVisible,
} from "../../shared/protocol";

export type EstadoConexion = "conectando" | "listo" | "cerrado";

interface SnapshotGuardado {
  /** Momento (performance.now) en que se recibió. */
  recibido: number;
  serpientes: SerpienteVisible[];
  comida: ComidaVisible[];
  ranking: EntradaRanking[];
}

export interface SnapshotInterpolado {
  serpientes: SerpienteVisible[];
  comida: ComidaVisible[];
  ranking: EntradaRanking[];
}

export interface Red {
  estado: EstadoConexion;
  miId: string | null;
  tickRate: number;
  radioMapa: number;
  /** Snapshots recientes, de más viejo a más nuevo. */
  buffer: SnapshotGuardado[];
  ultimoAngulo: number;
  ultimoAcelerando: boolean;
  ultimoEnvio: number;
  socket: WebSocket;
}

/** Diferencia más corta entre dos ángulos, en valor absoluto. */
function diferenciaAngular(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

function enviar(red: Red, mensaje: MensajeCliente): void {
  if (red.socket.readyState === WebSocket.OPEN) red.socket.send(JSON.stringify(mensaje));
}

/** Abre la conexión y hace `join` en cuanto se abre. */
export function crearRed(nombre: string, skin: number): Red {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocolo}//${location.host}/ws`);

  const red: Red = {
    estado: "conectando",
    miId: null,
    tickRate: 0,
    radioMapa: 0,
    buffer: [],
    ultimoAngulo: Number.NaN,
    ultimoAcelerando: false,
    ultimoEnvio: 0,
    socket,
  };

  socket.addEventListener("open", () => {
    enviar(red, { t: "join", nombre, skin });
  });

  socket.addEventListener("close", () => {
    red.estado = "cerrado";
  });

  socket.addEventListener("error", () => {
    console.error("Error de conexión con el servidor");
  });

  socket.addEventListener("message", (evento) => {
    let mensaje: MensajeServidor;

    try {
      mensaje = JSON.parse(String(evento.data)) as MensajeServidor;
    } catch {
      console.warn("Mensaje inválido del servidor:", evento.data);
      return;
    }

    if (mensaje.t === "welcome") {
      red.miId = mensaje.id;
      red.tickRate = mensaje.tickRate;
      red.radioMapa = mensaje.radioMapa;
      red.estado = "listo";
      console.log(`Conectado al servidor. Tu id: ${mensaje.id} (${mensaje.tickRate} ticks/s)`);
      return;
    }

    if (mensaje.t === "snapshot") {
      const ahora = performance.now();
      red.buffer.push({
        recibido: ahora,
        serpientes: mensaje.serpientes,
        comida: mensaje.comida,
        ranking: mensaje.ranking,
      });

      // Conserva solo lo reciente: un segundo de snapshots y como mucho 30.
      while (red.buffer.length > 1 && red.buffer[0]!.recibido < ahora - 1000) red.buffer.shift();
      while (red.buffer.length > 30) red.buffer.shift();
    }
  });

  return red;
}

/** Envía el input solo si cambió y como mucho una vez por tick. */
export function enviarInput(red: Red, angulo: number, acelerando: boolean): void {
  if (red.estado !== "listo") return;

  const cambio =
    !Number.isFinite(red.ultimoAngulo) ||
    diferenciaAngular(angulo, red.ultimoAngulo) > 0.02 ||
    acelerando !== red.ultimoAcelerando;
  if (!cambio) return;

  const ahora = performance.now();
  if (ahora - red.ultimoEnvio < TICK_MS) return;

  red.ultimoEnvio = ahora;
  red.ultimoAngulo = angulo;
  red.ultimoAcelerando = acelerando;
  enviar(red, { t: "input", angulo, acelerando });
}

/** Interpola los segmentos de una serpiente entre dos snapshots. */
function interpolarSerpiente(anterior: SerpienteVisible, siguiente: SerpienteVisible, t: number): SerpienteVisible {
  const comunes = Math.min(anterior.segmentos.length, siguiente.segmentos.length);
  const segmentos: Punto[] = [];

  for (let i = 0; i < comunes; i++) {
    const a = anterior.segmentos[i];
    const b = siguiente.segmentos[i];
    if (!a || !b) continue;
    segmentos.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  // Si la serpiente creció, los segmentos nuevos se añaden tal cual.
  for (let i = comunes; i < siguiente.segmentos.length; i++) {
    const b = siguiente.segmentos[i];
    if (b) segmentos.push(b);
  }

  return { ...siguiente, segmentos };
}

/**
 * Devuelve el estado a dibujar para el momento actual, interpolando entre los
 * dos snapshots que rodean `ahora - INTERPOLATION_DELAY_MS`.
 */
export function obtenerSnapshot(red: Red, ahora: number): SnapshotInterpolado | null {
  const buffer = red.buffer;
  const ultimo = buffer[buffer.length - 1];
  if (!ultimo) return null;

  const objetivo = ahora - INTERPOLATION_DELAY_MS;

  let anterior: SnapshotGuardado | null = null;
  let siguiente: SnapshotGuardado | null = null;

  for (const guardado of buffer) {
    if (guardado.recibido <= objetivo) anterior = guardado;
    else {
      siguiente = guardado;
      break;
    }
  }

  // Sin datos suficientes todavía: dibujamos el último estado tal cual.
  if (!anterior || !siguiente) {
    return { serpientes: ultimo.serpientes, comida: ultimo.comida, ranking: ultimo.ranking };
  }

  const tramo = siguiente.recibido - anterior.recibido;
  const t = tramo > 0 ? Math.min(1, Math.max(0, (objetivo - anterior.recibido) / tramo)) : 1;

  const previas = new Map(anterior.serpientes.map((s) => [s.id, s]));
  const serpientes = siguiente.serpientes.map((s) => {
    const previa = previas.get(s.id);
    return previa ? interpolarSerpiente(previa, s, t) : s;
  });

  return { serpientes, comida: siguiente.comida, ranking: siguiente.ranking };
}

/** Longitud (en segmentos) de una serpiente del snapshot. */
export function longitudDe(serpiente: SerpienteVisible): number {
  return serpiente.segmentos.length;
}
