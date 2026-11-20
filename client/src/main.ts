import "./style.css";
import type { Camara } from "./camera";
import { actualizarCamara, crearCamara, mundoAPantalla } from "./camera";
import type { Entrada } from "./input";
import { anguloHaciaPuntero, crearEntrada } from "./input";
import type { Red, SnapshotInterpolado } from "./network";
import { crearRed, enviarInput, obtenerSnapshot } from "./network";
import type { ComidaDibujo, SerpienteDibujo, Vista } from "./renderer";
import { dibujarMundo } from "./renderer";

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

// --- Conexión y estado local ----------------------------------------------

// Hasta la Fase 4 no hay menú: entramos directamente con un nombre provisional.
const red: Red = crearRed(`Jugador ${Math.floor(Math.random() * 900 + 100)}`, 0);
const camara: Camara = crearCamara(0, 0);
const entrada: Entrada = crearEntrada(canvas, { x: ancho / 2, y: alto / 2 });

/** La primera vez que aparece mi serpiente, la cámara salta directo a ella. */
let camaraCentrada = false;

/** Texto del marcador según el estado de la conexión. */
function textoEstado(snapshot: SnapshotInterpolado | null): string {
  if (red.estado === "conectando") return "Conectando al servidor…";
  if (red.estado === "cerrado") return "Desconectado del servidor";
  if (!snapshot) return "Esperando al servidor…";

  const mia = snapshot.serpientes.find((s) => s.id === red.miId);
  const longitud = mia ? mia.segmentos.length : 0;
  return `Longitud: ${longitud}`;
}

/** Convierte el snapshot interpolado a lo que sabe dibujar el renderizador. */
function aMundo(snapshot: SnapshotInterpolado): { serpientes: SerpienteDibujo[]; comida: ComidaDibujo[] } {
  const serpientes: SerpienteDibujo[] = snapshot.serpientes.map((s) => ({
    segmentos: s.segmentos,
    skin: s.skin,
  }));
  const comida: ComidaDibujo[] = snapshot.comida.map((c) => ({ id: c.id, x: c.x, y: c.y }));
  return { serpientes, comida };
}

/** Bucle principal: interpola lo recibido, envía input y dibuja. */
let ultimoTiempo = performance.now();
function bucle(tiempo: number): void {
  const dt = Math.min((tiempo - ultimoTiempo) / 1000, 0.05);
  ultimoTiempo = tiempo;

  const snapshot = obtenerSnapshot(red, tiempo);

  if (snapshot) {
    const mia = snapshot.serpientes.find((s) => s.id === red.miId);
    const cabeza = mia?.segmentos[0];

    if (cabeza) {
      if (!camaraCentrada) {
        camara.x = cabeza.x;
        camara.y = cabeza.y;
        camaraCentrada = true;
      }
      actualizarCamara(camara, cabeza, dt);

      // El ángulo se calcula desde la cabeza (en pantalla) hacia el puntero.
      const cabezaPantalla = mundoAPantalla(camara, ancho, alto, cabeza);
      const angulo = anguloHaciaPuntero(cabezaPantalla, entrada.puntero);
      enviarInput(red, angulo, false);
    }

    const dpr = window.devicePixelRatio || 1;
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vista: Vista = { ctx: contexto, camara, ancho, alto };
    dibujarMundo(vista, aMundo(snapshot));

    contexto.fillStyle = "#e2e8f0";
    contexto.font = "600 16px system-ui, sans-serif";
    contexto.textAlign = "left";
    contexto.textBaseline = "top";
    contexto.fillText(textoEstado(snapshot), 16, 16);
  } else {
    const dpr = window.devicePixelRatio || 1;
    contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
    contexto.fillStyle = "#0b1020";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.fillStyle = "#94a3b8";
    contexto.font = "16px system-ui, sans-serif";
    contexto.textAlign = "center";
    contexto.textBaseline = "middle";
    contexto.fillText(textoEstado(null), ancho / 2, alto / 2);
  }

  requestAnimationFrame(bucle);
}

requestAnimationFrame(bucle);
