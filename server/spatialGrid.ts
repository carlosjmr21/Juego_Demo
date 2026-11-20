// Cuadrícula espacial uniforme para las colisiones.
// Divide el mundo en celdas y solo compara la cabeza con los segmentos de las
// celdas vecinas, en lugar de todos contra todos.

import type { Punto } from "../shared/protocol.js";

/** Un punto con el id de la serpiente a la que pertenece. */
export interface ElementoCuadricula {
  id: string;
  /** Referencia al segmento real (sus coordenadas ya están actualizadas). */
  punto: Punto;
}

export class CuadriculaEspacial {
  private celdas = new Map<string, ElementoCuadricula[]>();

  constructor(private readonly tamCelda: number) {}

  /** Vacía la cuadrícula para reconstruirla en el siguiente tick. */
  limpiar(): void {
    this.celdas.clear();
  }

  private clave(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  insertar(elemento: ElementoCuadricula): void {
    const cx = Math.floor(elemento.punto.x / this.tamCelda);
    const cy = Math.floor(elemento.punto.y / this.tamCelda);
    const clave = this.clave(cx, cy);

    let lista = this.celdas.get(clave);
    if (!lista) {
      lista = [];
      this.celdas.set(clave, lista);
    }
    lista.push(elemento);
  }

  /** Devuelve los elementos de la celda de (x, y) y sus 8 vecinas. */
  consultar(x: number, y: number): ElementoCuadricula[] {
    const cx = Math.floor(x / this.tamCelda);
    const cy = Math.floor(y / this.tamCelda);

    const resultado: ElementoCuadricula[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const lista = this.celdas.get(this.clave(cx + dx, cy + dy));
        if (lista) resultado.push(...lista);
      }
    }
    return resultado;
  }
}
