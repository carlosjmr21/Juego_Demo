// Interfaz del juego: menú de inicio, selector de skin, ranking y pantalla de muerte.
// Son elementos HTML posicionados encima del canvas; aquí solo se muestran,
// se ocultan y se rellenan.

import type { EntradaRanking } from "../../shared/protocol";
import { SKINS } from "../../shared/skins";

export interface Opciones {
  nombre: string;
  skin: number;
}

type AlJugar = (opciones: Opciones) => void;

export interface Ui {
  alJugar: (cb: AlJugar) => void;
  alReintentar: (cb: () => void) => void;
  alMenu: (cb: () => void) => void;
  mostrarMenu: () => void;
  ocultarMenu: () => void;
  mostrarMuerte: (puntuacion: number) => void;
  ocultarMuerte: () => void;
  mostrarRanking: () => void;
  ocultarRanking: () => void;
  actualizarRanking: (lista: EntradaRanking[], miId: string | null) => void;
  opciones: () => Opciones;
}

/** Busca un elemento por id y falla claro si falta. */
function exigir<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en index.html`);
  return el as T;
}

/** Nombre por defecto para que se pueda jugar sin escribir nada. */
function nombrePorDefecto(): string {
  return `Jugador ${Math.floor(Math.random() * 900 + 100)}`;
}

export function crearUi(): Ui {
  const menu = exigir("menu");
  const muerte = exigir("muerte");
  const ranking = exigir("ranking");
  const listaRanking = exigir<HTMLOListElement>("lista-ranking");
  const entradaNombre = exigir<HTMLInputElement>("entrada-nombre");
  const contenedorSkins = exigir("skins");
  const botonJugar = exigir<HTMLButtonElement>("boton-jugar");
  const botonReintentar = exigir<HTMLButtonElement>("boton-reintentar");
  const botonMenu = exigir<HTMLButtonElement>("boton-menu");
  const puntuacionFinal = exigir("puntuacion-final");

  entradaNombre.value = nombrePorDefecto();

  // Selector de skins: un botón por skin, con sus colores.
  let skinElegida = 0;
  const botonesSkin: HTMLButtonElement[] = [];

  SKINS.forEach((skin, indice) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "skin";
    boton.title = `Skin ${indice + 1}`;
    boton.style.background = `linear-gradient(135deg, ${skin.join(", ")})`;

    boton.addEventListener("click", () => {
      skinElegida = indice;
      botonesSkin.forEach((b, i) => b.classList.toggle("elegida", i === indice));
    });

    botonesSkin.push(boton);
    contenedorSkins.append(boton);
  });
  botonesSkin[0]?.classList.add("elegida");

  /** Nombre limpio: recortado a 16 y con valor por defecto si queda vacío. */
  function leerNombre(): string {
    const limpio = entradaNombre.value.trim().slice(0, 16);
    return limpio.length > 0 ? limpio : nombrePorDefecto();
  }

  let alJugarCb: AlJugar | null = null;

  botonJugar.addEventListener("click", () => {
    alJugarCb?.({ nombre: leerNombre(), skin: skinElegida });
  });

  entradaNombre.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") alJugarCb?.({ nombre: leerNombre(), skin: skinElegida });
  });

  return {
    alJugar(cb) {
      alJugarCb = cb;
    },
    alReintentar(cb) {
      botonReintentar.addEventListener("click", cb);
    },
    alMenu(cb) {
      botonMenu.addEventListener("click", cb);
    },
    mostrarMenu() {
      menu.classList.remove("oculto");
    },
    ocultarMenu() {
      menu.classList.add("oculto");
    },
    mostrarMuerte(puntuacion) {
      puntuacionFinal.textContent = String(puntuacion);
      muerte.classList.remove("oculto");
    },
    ocultarMuerte() {
      muerte.classList.add("oculto");
    },
    mostrarRanking() {
      ranking.classList.remove("oculto");
    },
    ocultarRanking() {
      ranking.classList.add("oculto");
    },
    actualizarRanking(lista, miId) {
      listaRanking.replaceChildren(
        ...lista.map((fila, indice) => {
          const li = document.createElement("li");
          li.classList.toggle("yo", fila.id === miId);
          li.textContent = `${fila.nombre} · ${fila.longitud}`;
          // El número de posición se ve por el orden de la lista.
          li.dataset.posicion = String(indice + 1);
          return li;
        }),
      );
    },
    opciones() {
      return { nombre: leerNombre(), skin: skinElegida };
    },
  };
}
