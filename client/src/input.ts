import type { Punto } from "../../shared/protocol";

/** Estado de entrada del jugador. */
export interface Entrada {
  /** Posición del puntero en píxeles de pantalla. */
  puntero: Punto;
  /** ¿Está acelerando? (botón del mouse, tecla espacio o dos dedos en móvil) */
  acelerando: boolean;
}

/**
 * Escucha el mouse, el teclado y el dedo y actualiza el puntero y la aceleración.
 * El ángulo se calcula después, comparando el puntero con la cabeza en pantalla.
 */
export function crearEntrada(canvas: HTMLCanvasElement, centro: Punto): Entrada {
  const entrada: Entrada = { puntero: { x: centro.x, y: centro.y }, acelerando: false };

  const moverPuntero = (x: number, y: number): void => {
    entrada.puntero.x = x;
    entrada.puntero.y = y;
  };

  canvas.addEventListener("mousemove", (evento) => {
    moverPuntero(evento.clientX, evento.clientY);
  });

  // Botón izquierdo del mouse = acelerar.
  canvas.addEventListener("mousedown", () => {
    entrada.acelerando = true;
  });
  window.addEventListener("mouseup", () => {
    entrada.acelerando = false;
  });
  window.addEventListener("blur", () => {
    entrada.acelerando = false;
  });

  // Barra espaciadora = acelerar.
  window.addEventListener("keydown", (evento) => {
    if (evento.code === "Space") {
      entrada.acelerando = true;
      evento.preventDefault();
    }
  });
  window.addEventListener("keyup", (evento) => {
    if (evento.code === "Space") entrada.acelerando = false;
  });

  canvas.addEventListener(
    "touchstart",
    (evento) => {
      const toque = evento.touches[0];
      if (toque) moverPuntero(toque.clientX, toque.clientY);
      // Dos dedos = acelerar.
      entrada.acelerando = evento.touches.length >= 2;
    },
    { passive: false },
  );

  canvas.addEventListener(
    "touchmove",
    (evento) => {
      const toque = evento.touches[0];
      if (toque) moverPuntero(toque.clientX, toque.clientY);
      entrada.acelerando = evento.touches.length >= 2;
      // Evita que el navegador haga scroll mientras se juega.
      evento.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener("touchend", (evento) => {
    entrada.acelerando = evento.touches.length >= 2;
  });

  return entrada;
}

/** Ángulo (radianes) desde la cabeza hacia el puntero en coordenadas de pantalla. */
export function anguloHaciaPuntero(cabezaPantalla: Punto, puntero: Punto): number {
  return Math.atan2(puntero.y - cabezaPantalla.y, puntero.x - cabezaPantalla.x);
}
