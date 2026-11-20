import "./style.css";
import type { Camara } from "./camera";
import { actualizarCamara, crearCamara, mundoAPantalla } from "./camera";
import type { Entrada } from "./input";
import { anguloHaciaPuntero, crearEntrada } from "./input";
import type { Red, SnapshotInterpolado } from "./network";
import { crearRed, entrar, enviarInput, obtenerSnapshot, reaparecer } from "./network";
import type { ComidaDibujo, SerpienteDibujo, Vista } from "./renderer";
import { dibujarMundo } from "./renderer";
import { crearUi } from "./ui";

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

// --- Estado local ---------------------------------------------------------

const camara: Camara = crearCamara(0, 0);
const entrada: Entrada = crearEntrada(canvas, { x: ancho / 2, y: alto / 2 });
const ui = crearUi();

/** Conexión con el servidor; se crea al pulsar Jugar la primera vez. */
let red: Red | null = null;
/** Último id propio visto, para reencuadrar la cámara al entrar o reaparecer. */
let ultimoMiId: string | null = null;
/** La cámara salta directo a mi serpiente la primera vez que aparece. */
let camaraCentrada = false;
/** Si ya se está mostrando la pantalla de muerte. */
let muerteMostrada = false;
/** Momento del último refresco del ranking (para no tocar el DOM cada frame). */
let ultimoRankingMs = 0;

// --- Interfaz: Jugar, Reintentar y volver al menú -------------------------

ui.alJugar(({ nombre, skin }) => {
  if (!red) red = crearRed(nombre, skin);
  else entrar(red, nombre, skin);

  ui.ocultarMenu();
  ui.ocultarMuerte();
  ui.mostrarRanking();
  camaraCentrada = false;
  muerteMostrada = false;
});

ui.alReintentar(() => {
  if (!red) return;
  reaparecer(red);
  ui.ocultarMuerte();
  ui.mostrarRanking();
  camaraCentrada = false;
  muerteMostrada = false;
});

ui.alMenu(() => {
  ui.ocultarMuerte();
  ui.ocultarRanking();
  ui.mostrarMenu();
});

// --- Dibujo ---------------------------------------------------------------

/** Convierte el snapshot interpolado a lo que sabe dibujar el renderizador. */
function aMundo(snapshot: SnapshotInterpolado, miId: string | null): { serpientes: SerpienteDibujo[]; comida: ComidaDibujo[] } {
  const serpientes: SerpienteDibujo[] = snapshot.serpientes.map((s) => ({
    id: s.id,
    nombre: s.nombre,
    segmentos: s.segmentos,
    skin: s.skin,
    esMia: s.id === miId,
    acelerando: s.acelerando,
  }));
  const comida: ComidaDibujo[] = snapshot.comida.map((c) => ({ id: c.id, x: c.x, y: c.y, valor: c.valor }));
  return { serpientes, comida };
}

/** Prepara el canvas y devuelve la vista lista para dibujar. */
function prepararVista(tiempoMs: number): Vista {
  const dpr = window.devicePixelRatio || 1;
  contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx: contexto, camara, ancho, alto, tiempo: tiempoMs / 1000 };
}

/** Texto del marcador mientras se juega. */
function textoLongitud(snapshot: SnapshotInterpolado | null): string {
  if (!red) return "";
  if (red.estado === "conectando") return "Conectando al servidor…";
  if (red.estado === "cerrado") return "Desconectado del servidor";
  if (!snapshot) return "Esperando al servidor…";

  const mia = snapshot.serpientes.find((s) => s.id === red?.miId);
  return `Longitud: ${mia ? mia.segmentos.length : 0}`;
}

// --- Bucle principal ------------------------------------------------------

let ultimoTiempo = performance.now();
function bucle(tiempo: number): void {
  const dt = Math.min((tiempo - ultimoTiempo) / 1000, 0.05);
  ultimoTiempo = tiempo;

  const vista = prepararVista(tiempo);
  const snapshot = red ? obtenerSnapshot(red, tiempo) : null;

  if (red && snapshot) {
    const mia = snapshot.serpientes.find((s) => s.id === red?.miId);
    const cabeza = mia?.segmentos[0];

    // Al entrar o reaparecer (id nuevo), la cámara salta a mi serpiente.
    if (red.miId !== ultimoMiId) {
      ultimoMiId = red.miId;
      camaraCentrada = false;
    }

    if (cabeza) {
      if (!camaraCentrada) {
        camara.x = cabeza.x;
        camara.y = cabeza.y;
        camaraCentrada = true;
      }
      actualizarCamara(camara, cabeza, dt);

      const cabezaPantalla = mundoAPantalla(camara, ancho, alto, cabeza);
      const angulo = anguloHaciaPuntero(cabezaPantalla, entrada.puntero);
      enviarInput(red, angulo, entrada.acelerando);
    }

    dibujarMundo(vista, aMundo(snapshot, red.miId));

    // Ranking: se refresca sin abusar del DOM.
    if (tiempo - ultimoRankingMs > 200) {
      ultimoRankingMs = tiempo;
      ui.actualizarRanking(snapshot.ranking, red.miId);
    }

    // Pantalla de muerte: se muestra una vez por muerte.
    if (red.estado === "muerto" && !muerteMostrada) {
      ui.mostrarMuerte(red.puntuacionFinal);
      muerteMostrada = true;
    }
    if (red.estado !== "muerto") muerteMostrada = false;

    // HUD de longitud (solo si no estamos en la pantalla de muerte).
    if (red.estado !== "muerto") {
      contexto.fillStyle = "#e2e8f0";
      contexto.font = "600 16px system-ui, sans-serif";
      contexto.textAlign = "left";
      contexto.textBaseline = "top";
      contexto.fillText(textoLongitud(snapshot), 16, 16);
    }
  } else {
    // Menú, espera o desconexión: fondo con el mapa vacío.
    dibujarMundo(vista, { serpientes: [], comida: [] });
  }

  requestAnimationFrame(bucle);
}

requestAnimationFrame(bucle);
