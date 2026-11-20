import type { Punto } from "../../shared/protocol";

/** Estado de entrada del jugador: dónde está el puntero en píxeles de pantalla. */
export interface Entrada {
  puntero: Punto;
}

/**
 * Escucha el mouse y el dedo y actualiza la posición del puntero.
 * El ángulo se calcula después, comparando el puntero con la cabeza en pantalla.
 */
export function crearEntrada(canvas: HTMLCanvasElement, centro: Punto): Entrada {
  const entrada: Entrada = { puntero: { x: centro.x, y: centro.y } };

  const moverPuntero = (x: number, y: number): void => {
    entrada.puntero.x = x;
    entrada.puntero.y = y;
  };

  canvas.addEventListener("mousemove", (evento) => {
    moverPuntero(evento.clientX, evento.clientY);
  });

  canvas.addEventListener(
    "touchstart",
    (evento) => {
      const toque = evento.touches[0];
      if (toque) moverPuntero(toque.clientX, toque.clientY);
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (evento) => {
      const toque = evento.touches[0];
      if (toque) moverPuntero(toque.clientX, toque.clientY);
      // Evita que el navegador haga scroll mientras se juega.
      evento.preventDefault();
    },
    { passive: false },
  );

  return entrada;
}

/** Ángulo (radianes) desde la cabeza hacia el puntero en coordenadas de pantalla. */
export function anguloHaciaPuntero(cabezaPantalla: Punto, puntero: Punto): number {
  return Math.atan2(puntero.y - cabezaPantalla.y, puntero.x - cabezaPantalla.x);
}
