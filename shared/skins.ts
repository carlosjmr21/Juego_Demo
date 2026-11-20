// Skins disponibles. Viajan por índice: el cliente nunca recibe colores del servidor.

export type Skin = readonly string[];

export const SKINS: readonly Skin[] = [
  ["#4ade80", "#22c55e", "#15803d"],
  ["#60a5fa", "#3b82f6", "#1d4ed8"],
  ["#f472b6", "#ec4899", "#be185d"],
  ["#fbbf24", "#f59e0b", "#b45309"],
  ["#a78bfa", "#8b5cf6", "#6d28d9"],
  ["#f87171", "#ef4444", "#b91c1c"],
  ["#2dd4bf", "#14b8a6", "#0f766e"],
  ["#e5e7eb", "#9ca3af", "#4b5563"],
];

/** Comprueba que el índice de skin que llegó del cliente es válido. */
export function esSkinValida(indice: number): boolean {
  return Number.isInteger(indice) && indice >= 0 && indice < SKINS.length;
}

/** Devuelve la skin pedida o la primera si el índice no es válido. */
export function obtenerSkin(indice: number): Skin {
  return SKINS[esSkinValida(indice) ? indice : 0] as Skin;
}
