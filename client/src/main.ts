import "./style.css";
import type { MensajeServidor } from "../../shared/protocol";
import type { Camara } from "./camera";
import { actualizarCamara, crearCamara, mundoAPantalla } from "./camera";
import type { Entrada } from "./input";
import { anguloHaciaPuntero, crearEntrada } from "./input";
import type { Vista } from "./renderer";
import { dibujarMundo } from "./renderer";
import type { EstadoMundo } from "./state";
import { avanzarSerpiente, comer, crearMundo, girarHacia, limitarAlMapa, puntuacion } from "./state";

// --- Preparar el canvas ---------------------------------------------------

const canvasEl = document.querySelector<HTMLCanvasElement>("#game");
if (!canvasEl) throw new Error("No se encontró el canvas #game");
const canvas: HTMLCanvasElement = canvasEl;

const contextoObtenido = canvas.getContext("2d");
if (!contextoObtenido) throw new Error("El navegador no soporta Canvas 2D");
const contexto: CanvasRenderingContext2D = contextoObtenido;

let ancho = window.innerWidth;
let alto = window.innerHeight;

/** Ajusta el canvas al tamaño de la ventana teniendo en cuenta la densidad de píxeles. */
function ajustarCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  ancho = window.innerWidth;
  alto = window.innerHeight;
  canvas.width = Math.floor(ancho * dpr);
  canvas.height = Math.floor(alto * dpr);
  canvas.style.width = `${ancho}px`;
  canvas.style.height = `${alto}px`;
}

ajustarCanvas();
window.addEventListener("resize", ajustarCanvas);

// --- Estado del juego -----------------------------------------------------

// La serpiente nace en el centro del mapa (0, 0).
const estado: EstadoMundo = crearMundo();
const camara: Camara = crearCamara(0, 0);
const entrada: Entrada = crearEntrada(canvas, { x: ancho / 2, y: alto / 2 });

/** Avanza un paso de simulación (provisional, todavía en el cliente). */
function actualizar(dt: number): void {
  const cabeza = estado.serpiente.segmentos[0];
  if (!cabeza) return;

  const cabezaPantalla = mundoAPantalla(camara, ancho, alto, cabeza);
  const objetivo = anguloHaciaPuntero(cabezaPantalla, entrada.puntero);

  girarHacia(estado.serpiente, objetivo, dt);
  avanzarSerpiente(estado.serpiente, dt);
  limitarAlMapa(estado.serpiente);
  comer(estado);

  const nuevaCabeza = estado.serpiente.segmentos[0] ?? cabeza;
  actualizarCamara(camara, nuevaCabeza, dt);
}

/** Dibuja el mundo y el marcador de puntuación. */
function dibujar(): void {
  const dpr = window.devicePixelRatio || 1;
  contexto.setTransform(dpr, 0, 0, dpr, 0, 0);

  const vista: Vista = { ctx: contexto, camara, ancho, alto };
  dibujarMundo(vista, estado);

  contexto.fillStyle = "#e2e8f0";
  contexto.font = "600 16px system-ui, sans-serif";
  contexto.textAlign = "left";
  contexto.textBaseline = "top";
  contexto.fillText(`Longitud: ${puntuacion(estado.serpiente)}`, 16, 16);
}

/** Bucle principal: simula y dibuja a la tasa de refresco de la pantalla. */
let ultimoTiempo = performance.now();
function bucle(tiempo: number): void {
  const dt = Math.min((tiempo - ultimoTiempo) / 1000, 0.05);
  ultimoTiempo = tiempo;

  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

requestAnimationFrame(bucle);

// --- Conexión con el servidor (de la Fase 0) ------------------------------

/** URL del WebSocket usando el mismo host del que se cargó la página. */
function urlSocket(): string {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${location.host}/ws`;
}

const socket = new WebSocket(urlSocket());

socket.addEventListener("open", () => console.log("Conectado al servidor"));
socket.addEventListener("close", () => console.warn("Desconectado del servidor"));
socket.addEventListener("error", () => console.error("Error de conexión con el servidor"));

socket.addEventListener("message", (evento) => {
  let mensaje: MensajeServidor;

  try {
    mensaje = JSON.parse(String(evento.data)) as MensajeServidor;
  } catch {
    console.warn("Mensaje inválido del servidor:", evento.data);
    return;
  }

  if (mensaje.t === "welcome") {
    console.log(`Bienvenido. Tu id: ${mensaje.id} (${mensaje.tickRate} ticks/s)`);
  }
});
