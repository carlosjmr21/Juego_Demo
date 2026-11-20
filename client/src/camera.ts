import { CAMERA_SMOOTHING } from "../../shared/constants";
import type { Punto } from "../../shared/protocol";

/** Cámara que sigue a la serpiente. Guarda el centro de la vista en coordenadas del mundo. */
export interface Camara {
  x: number;
  y: number;
}

export function crearCamara(x: number, y: number): Camara {
  return { x, y };
}

/** Acerca la cámara al objetivo de forma independiente de la tasa de refresco. */
export function actualizarCamara(camara: Camara, objetivo: Punto, dt: number): void {
  const factor = 1 - Math.pow(CAMERA_SMOOTHING, dt);
  camara.x += (objetivo.x - camara.x) * factor;
  camara.y += (objetivo.y - camara.y) * factor;
}

/** Convierte un punto del mundo a coordenadas de pantalla. */
export function mundoAPantalla(camara: Camara, ancho: number, alto: number, punto: Punto): Punto {
  return {
    x: punto.x - camara.x + ancho / 2,
    y: punto.y - camara.y + alto / 2,
  };
}
