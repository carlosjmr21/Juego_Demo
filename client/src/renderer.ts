import { FOOD_RADIUS, HEX_SIZE, WORLD_RADIUS } from "../../shared/constants";
import { obtenerSkin } from "../../shared/skins";
import type { Camara } from "./camera";
import { mundoAPantalla } from "./camera";
import type { ComidaLocal, EstadoMundo, SerpienteLocal } from "./state";
import { radioSerpiente } from "./state";

/** Todo el dibujo del juego en Canvas 2D. Nada de imágenes: solo formas. */

const COLOR_FONDO = "#0b1020";
const COLOR_BORDE = "#8b5cf6";
const COLOR_CUADRICULA = "rgba(148, 163, 184, 0.07)";

export interface Vista {
  ctx: CanvasRenderingContext2D;
  camara: Camara;
  ancho: number;
  alto: number;
}

/** Limpia la pantalla con el color de fondo. */
export function limpiar(ctx: CanvasRenderingContext2D, ancho: number, alto: number): void {
  ctx.fillStyle = COLOR_FONDO;
  ctx.fillRect(0, 0, ancho, alto);
}

/** Dibuja la cuadrícula hexagonal procedural, solo en la zona visible. */
export function dibujarCuadricula(vista: Vista): void {
  const { ctx, camara, ancho, alto } = vista;

  const anchoHex = Math.sqrt(3) * HEX_SIZE;
  const pasoY = HEX_SIZE * 1.5;

  const izquierda = camara.x - ancho / 2 - anchoHex;
  const derecha = camara.x + ancho / 2 + anchoHex;
  const arriba = camara.y - alto / 2 - pasoY;
  const abajo = camara.y + alto / 2 + pasoY;

  ctx.strokeStyle = COLOR_CUADRICULA;
  ctx.lineWidth = 1;
  ctx.beginPath();

  const filaInicial = Math.floor(arriba / pasoY) - 1;
  const filaFinal = Math.ceil(abajo / pasoY) + 1;
  const colInicial = Math.floor(izquierda / anchoHex) - 1;
  const colFinal = Math.ceil(derecha / anchoHex) + 1;

  for (let fila = filaInicial; fila <= filaFinal; fila++) {
    const desplazamiento = fila % 2 === 0 ? 0 : anchoHex / 2;
    for (let col = colInicial; col <= colFinal; col++) {
      const centroMundoX = col * anchoHex + desplazamiento;
      const centroMundoY = fila * pasoY;
      const centro = mundoAPantalla(camara, ancho, alto, { x: centroMundoX, y: centroMundoY });

      for (let lado = 0; lado < 6; lado++) {
        const angulo = (Math.PI / 3) * lado;
        const vx = centro.x + Math.cos(angulo) * HEX_SIZE;
        const vy = centro.y + Math.sin(angulo) * HEX_SIZE;
        if (lado === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    }
  }

  ctx.stroke();
}

/** Dibuja el borde circular del mapa. */
export function dibujarBorde(vista: Vista): void {
  const { ctx, camara, ancho, alto } = vista;
  const centro = mundoAPantalla(camara, ancho, alto, { x: 0, y: 0 });

  ctx.save();
  ctx.strokeStyle = COLOR_BORDE;
  ctx.lineWidth = 6;
  ctx.shadowColor = COLOR_BORDE;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, WORLD_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Dibuja la comida visible (círculos de colores con un halo suave). */
export function dibujarComida(vista: Vista, comida: ComidaLocal[]): void {
  const { ctx, camara, ancho, alto } = vista;
  const margen = FOOD_RADIUS * 4;

  for (const punto of comida) {
    const pantalla = mundoAPantalla(camara, ancho, alto, punto);
    if (
      pantalla.x < -margen ||
      pantalla.y < -margen ||
      pantalla.x > ancho + margen ||
      pantalla.y > alto + margen
    ) {
      continue;
    }

    ctx.save();
    ctx.fillStyle = punto.color;
    ctx.shadowColor = punto.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(pantalla.x, pantalla.y, FOOD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Dibuja una serpiente: cuerpo con degradado por segmento y ojos en la cabeza. */
export function dibujarSerpiente(vista: Vista, serpiente: SerpienteLocal): void {
  const { ctx, camara, ancho, alto } = vista;
  const skin = obtenerSkin(serpiente.skin);
  const radio = radioSerpiente(serpiente);

  // Del final hacia la cabeza para que la cabeza quede encima.
  for (let i = serpiente.segmentos.length - 1; i >= 0; i--) {
    const segmento = serpiente.segmentos[i];
    if (!segmento) continue;

    const pantalla = mundoAPantalla(camara, ancho, alto, segmento);
    const color = skin[i % skin.length] ?? skin[0] ?? "#4ade80";

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(pantalla.x, pantalla.y, radio, 0, Math.PI * 2);
    ctx.fill();

    // Luz radial para dar volumen.
    const brillo = ctx.createRadialGradient(
      pantalla.x - radio * 0.3,
      pantalla.y - radio * 0.3,
      radio * 0.1,
      pantalla.x,
      pantalla.y,
      radio,
    );
    brillo.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    brillo.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = brillo;
    ctx.beginPath();
    ctx.arc(pantalla.x, pantalla.y, radio, 0, Math.PI * 2);
    ctx.fill();
  }

  dibujarOjos(vista, serpiente, radio);
}

/** Dibuja los dos ojos de la cabeza, orientados según la dirección. */
function dibujarOjos(vista: Vista, serpiente: SerpienteLocal, radio: number): void {
  const { ctx, camara, ancho, alto } = vista;
  const cabeza = serpiente.segmentos[0];
  if (!cabeza) return;

  const centro = mundoAPantalla(camara, ancho, alto, cabeza);
  const dirX = Math.cos(serpiente.angulo);
  const dirY = Math.sin(serpiente.angulo);
  const perpX = -dirY;
  const perpY = dirX;

  const adelante = radio * 0.35;
  const separacion = radio * 0.5;
  const radioOjo = radio * 0.4;
  const radioPupila = radio * 0.2;

  for (const signo of [-1, 1]) {
    const ojoX = centro.x + dirX * adelante + perpX * separacion * signo;
    const ojoY = centro.y + dirY * adelante + perpY * separacion * signo;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ojoX, ojoY, radioOjo, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.arc(ojoX + dirX * radioPupila, ojoY + dirY * radioPupila, radioPupila, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Dibuja el mundo completo en el orden correcto (fondo, borde, comida, serpiente). */
export function dibujarMundo(vista: Vista, estado: EstadoMundo): void {
  limpiar(vista.ctx, vista.ancho, vista.alto);
  dibujarCuadricula(vista);
  dibujarBorde(vista);
  dibujarComida(vista, estado.comida);
  dibujarSerpiente(vista, estado.serpiente);
}
