// Cifras ajustables del juego. Todo lo que se pueda calibrar vive aquí.

/** Ticks del servidor por segundo. */
export const TICK_RATE = 20;

/** Duración de un tick en milisegundos. */
export const TICK_MS = 1000 / TICK_RATE;

/** Radio del mapa circular (px). */
export const WORLD_RADIUS = 2400;

/** Longitud máxima del nombre de un jugador. */
export const MAX_NAME_LENGTH = 16;

/** Longitud (en segmentos) con la que nace una serpiente. */
export const SNAKE_START_LENGTH = 10;

/** Radio base del primer segmento (px). */
export const SNAKE_BASE_RADIUS = 9;

/** Velocidad normal de la serpiente (px por segundo). */
export const SNAKE_SPEED = 150;

/** Velocidad al acelerar (px por segundo). */
export const SNAKE_BOOST_SPEED = 260;

/** Cantidad de comida que se mantiene en el mapa. */
export const FOOD_COUNT = 600;

/** Radio de cada punto de comida (px). */
export const FOOD_RADIUS = 5;

/** Radio del área de visión de cada jugador (px). */
export const VIEW_RADIUS = 900;
