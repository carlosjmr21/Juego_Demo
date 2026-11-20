import "./style.css";
import type { MensajeServidor } from "../../shared/protocol";

const canvasEl = document.querySelector<HTMLCanvasElement>("#game");
if (!canvasEl) throw new Error("No se encontró el canvas #game");
const canvas: HTMLCanvasElement = canvasEl;

const contextoObtenido = canvas.getContext("2d");
if (!contextoObtenido) throw new Error("El navegador no soporta Canvas 2D");
const contexto: CanvasRenderingContext2D = contextoObtenido;

let mensajeEstado = "Conectando al servidor…";

/** Ajusta el tamaño del canvas al de la ventana, teniendo en cuenta la densidad de píxeles. */
function ajustarCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

/** Dibuja el estado actual en pantalla. */
function renderizar(): void {
  const dpr = window.devicePixelRatio || 1;
  const ancho = window.innerWidth;
  const alto = window.innerHeight;

  contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
  contexto.fillStyle = "#0b1020";
  contexto.fillRect(0, 0, ancho, alto);

  contexto.fillStyle = "#94a3b8";
  contexto.font = "16px system-ui, sans-serif";
  contexto.textAlign = "center";
  contexto.textBaseline = "middle";
  contexto.fillText(mensajeEstado, ancho / 2, alto / 2);
}

/** Construye la URL del WebSocket usando el mismo host del que se cargó la página. */
function urlSocket(): string {
  const protocolo = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocolo}//${location.host}/ws`;
}

ajustarCanvas();
renderizar();
window.addEventListener("resize", () => {
  ajustarCanvas();
  renderizar();
});

const socket = new WebSocket(urlSocket());

socket.addEventListener("open", () => {
  console.log("Conectado al servidor");
  mensajeEstado = "Conectado al servidor";
  renderizar();
});

socket.addEventListener("close", () => {
  console.warn("Desconectado del servidor");
  mensajeEstado = "Desconectado del servidor";
  renderizar();
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
    console.log(`Bienvenido. Tu id: ${mensaje.id} (${mensaje.tickRate} ticks/s)`);
    mensajeEstado = `Conectado al servidor · ${mensaje.id.slice(0, 8)}`;
    renderizar();
  }
});
