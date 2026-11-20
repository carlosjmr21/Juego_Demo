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

/** Retraso con el que el cliente dibuja respecto al servidor, para interpolar (ms). */
export const INTERPOLATION_DELAY_MS = 100;

/** Lado de cada hexágono del fondo (px). */
export const HEX_SIZE = 46;

/** Cuánto tarda la cámara en alcanzar a la cabeza (menor = más pegada). */
export const CAMERA_SMOOTHING = 0.0006;

// --- Fase 3: colisiones, muerte y aceleración ----------------------------

/** Longitud mínima (en segmentos) para poder acelerar. */
export const SNAKE_MIN_BOOST_LENGTH = 12;

/** Longitud que se pierde por segundo mientras se acelera (segmentos/s). */
export const BOOST_LENGTH_COST = 4;

/** Cuánto alimenta una comida normal. */
export const FOOD_VALUE = 1;

/** Cuánto alimenta cada trozo del cuerpo de una serpiente muerta. */
export const DEATH_FOOD_VALUE = 3;

/** Convierte uno de cada N segmentos del cuerpo en comida al morir. */
export const DEATH_SEGMENTS_PER_FOOD = 2;

/** Lado de cada celda de la cuadrícula espacial de colisiones (px). */
export const SPATIAL_CELL_SIZE = 64;

// --- Fase 5: optimización, arena con bots y pulido ------------------------

/** Margen extra alrededor del área de visión que se envía en el snapshot (px). */
export const SNAPSHOT_MARGIN = 300;

/** Serpientes mínimas en el mapa (los bots rellenan hasta llegar a esta cifra). */
export const MIN_SNAKES = 10;

/** Tope de bots a la vez. */
export const MAX_BOTS = 12;

/** Distancia por delante que mira un bot para esquivar (px). */
export const BOT_LOOKAHEAD = 70;

/** Distancia a la que un bot considera que hay peligro (px). */
export const BOT_AVOID_RADIUS = 95;

/** Velocidad del pulso de brillo de la comida. */
export const FOOD_PULSE_SPEED = 3;
