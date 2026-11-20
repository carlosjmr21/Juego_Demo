# Juego_clone

Clon multijugador de [Slither.io](https://slither.io) hecho en el navegador, como proyecto de práctica para jugar una partida rápida con amigos.

El objetivo es que funcione y se sienta fluido, no que sea perfecto: el código se mantiene simple y legible, con el servidor como única autoridad del juego.

## Características planeadas

- Serpientes que siguen el mouse (o el dedo, en móvil) y crecen al comer.
- Multijugador en tiempo real por WebSocket: varias personas en el mismo mapa.
- Colisiones, muerte que deja el cuerpo como comida y aceleración que consume longitud.
- Ranking de los jugadores más largos, selector de skins y pantalla de muerte.
- Bots para que el mapa nunca esté vacío.
- Todo el arte es procedural con Canvas: sin imágenes ni assets externos.

## Stack

| Parte | Tecnología |
| --- | --- |
| Cliente | Vite + TypeScript + Canvas 2D |
| Servidor | Node.js + TypeScript + `ws` |
| Compartido | Tipos, constantes y skins en `shared/` |
| Estilos | CSS plano, sin frameworks de UI |
| Deploy | Render (Web Service, plan gratuito) |

## Requisitos

- Node.js LTS (22 o superior)
- npm

## Puesta en marcha

```bash
npm install
npm run dev     # cliente con recarga + servidor en modo watch
```

Abre la dirección que muestra Vite (normalmente `http://localhost:5173`).

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Levanta Vite y el servidor con recarga; Vite hace proxy de `/ws`. |
| `npm run build` | Compila el cliente en `dist/client` y el servidor en `dist/server`. |
| `npm start` | Sirve el build compilado y el WebSocket en `/ws` (puerto 3000 en local). |

## Estructura

```
.
├── CLAUDE.md          ← reglas y plan del proyecto
├── shared/            ← tipos, constantes y skins compartidos
├── server/            ← servidor http, WebSocket, lógica del juego
├── client/            ← Vite, Canvas y UI
└── docs/              ← material de referencia
```

## Cómo funciona (resumen)

1. El cliente envía solo su input: ángulo y si acelera.
2. El servidor corre un tick fijo (`TICK_RATE`, 20 por segundo) donde mueve, colisiona y actualiza la comida.
3. Cada cliente recibe snapshots de lo que está en su área de visión y el render interpola entre los dos últimos para verse suave.

## Estado del proyecto

Proyecto en construcción, organizado en fases:

- [x] Fase 0 — Estructura del proyecto, servidor y conexión WebSocket
- [x] Fase 1 — Una serpiente jugable en local
- [x] Fase 2 — Lógica de movimiento y comida en el servidor
- [x] Fase 3 — Colisiones, muerte y aceleración
- [ ] Fase 4 — Interfaz: menú, ranking y skins
- [ ] Fase 5 — Optimización, área de visión y bots
- [ ] Fase 6 — Deploy final y pruebas

## Deploy

El servidor Node entrega el build del cliente y atiende los WebSockets en la misma URL. En Render:

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- Escucha en `process.env.PORT` y expone `/health`.

## Licencia

Proyecto de uso educativo, sin licencia definida por ahora.
