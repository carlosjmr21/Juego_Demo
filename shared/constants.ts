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

/** Separación entre los centros de dos segmentos consecutivos (px). */
export const SEGMENT_SPACING = 8;

/** Giro máximo de la cabeza hacia el objetivo (radianes por segundo). */
export const SNAKE_TURN_RATE = 6;

/** Cuántos segmentos gana la serpiente por cada comida. */
export const FOOD_GROWTH = 1;

/** Cuánto crece el radio por cada segmento de más (fracción del radio base). */
export const SNAKE_RADIUS_GROWTH = 0.02;

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

/** Lado de cada hexágono del fondo (px). */
export const HEX_SIZE = 46;

/** Cuánto tarda la cámara en alcanzar a la cabeza (menor = más pegada). */
export const CAMERA_SMOOTHING = 0.0006;
