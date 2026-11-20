# Slither Clone

Clon multijugador de Slither.io para una prueba rápida y corta con amigos. La prioridad es que funcione y se sienta fluido, no que sea perfecto. Mantén el código simple y legible.

**Responde y comenta el código en español.**

## Stack (decidido, no cambiar sin preguntar)

- **Cliente:** Vite + TypeScript + Canvas 2D. Sin frameworks de UI (nada de React, Next.js ni Tailwind).
- **Estilos:** CSS plano en un solo archivo `client/src/style.css`. Los menús son elementos HTML posicionados encima del canvas, no dibujados dentro de él.
- **Servidor:** Node.js + TypeScript + librería `ws`. Sin Express salvo que sea estrictamente necesario; para servir archivos estáticos basta el módulo `http` de Node.
- **Compartido:** tipos, constantes y protocolo en `shared/`, importados por cliente y servidor.
- **Gráficos:** todo procedural con Canvas. Sin imágenes ni assets externos.
- **Deploy:** un solo servicio web en Render (plan gratuito). El mismo servidor Node entrega el build del cliente y maneja los WebSockets en la misma URL.

Si crees que hace falta una dependencia nueva, pregunta antes de instalarla.

## Estructura de carpetas

Todo el proyecto vive en la raíz de este repositorio, con un solo `package.json`.

```
.
├── AGENTS.md
├── package.json          ← un solo package.json en la raíz
├── tsconfig.json
├── vite.config.ts        ← root: client/, build a dist/client
├── shared/
│   ├── constants.ts      ← tamaño del mapa, tick rate, velocidades, radios
│   ├── protocol.ts       ← tipos de todos los mensajes cliente↔servidor
│   └── skins.ts          ← lista de skins (arreglos de colores)
├── server/
│   ├── index.ts          ← servidor http + WebSocket + archivos estáticos
│   ├── game.ts           ← estado del mundo y loop del tick
│   ├── snake.ts          ← lógica de una serpiente
│   ├── spatialGrid.ts    ← cuadrícula espacial para colisiones
│   └── bots.ts           ← bots controlados por el servidor (fase 5)
└── client/
    ├── index.html
    └── src/
        ├── main.ts       ← arranque, conexión, loop de render
        ├── network.ts    ← WebSocket, envío de input, recepción de snapshots
        ├── renderer.ts   ← dibujo de serpientes, comida, fondo, borde
        ├── input.ts      ← mouse y touch → ángulo + acelerar
        ├── ui.ts         ← menú de inicio, ranking, pantalla de muerte
        └── style.css
```

## Arquitectura multijugador (reglas que no se rompen)

1. **El servidor es autoritativo.** Toda la lógica del juego (movimiento, colisiones, comida, muerte, puntuación) vive en el servidor. El cliente nunca decide si chocó, si comió o cuánto mide.
2. **El cliente solo envía input:** el ángulo hacia donde quiere ir y si está acelerando. Máximo unas 20 veces por segundo, y solo cuando cambia.
3. **Tick fijo en el servidor** (constante `TICK_RATE`, por defecto 20 por segundo). Cada tick: aplicar inputs, mover serpientes, detectar colisiones, actualizar comida, enviar snapshots.
4. **Snapshots por jugador:** cada cliente recibe solo lo que está dentro de su área de visión, no el mapa completo (desde la fase 5; antes puede enviarse todo).
5. **Interpolación en el cliente:** el render corre a la tasa de la pantalla (`requestAnimationFrame`) e interpola entre los dos últimos snapshots para que el movimiento se vea suave.
6. **Las skins viajan como índice**, nunca como datos de color. Cada cliente sabe dibujarlas a partir de `shared/skins.ts`.
7. **Validar en el servidor** todo lo que llega del cliente: ángulo numérico válido, nombre recortado a 16 caracteres, índice de skin dentro de rango.

## Protocolo

Mensajes en JSON por ahora, tipados en `shared/protocol.ts` como uniones discriminadas por el campo `t`. No optimizar a binario salvo que se pida.

- Cliente → servidor: `join` (nombre, skin), `input` (ángulo, acelerando).
- Servidor → cliente: `welcome` (id propio, constantes del mapa), `snapshot` (serpientes visibles, comida visible, ranking), `dead` (puntuación final).

## Mecánicas del juego

- La serpiente es una cadena de segmentos (círculos). El servidor guarda las posiciones; el radio crece un poco con la longitud.
- Comer comida aumenta la longitud. La comida se regenera para mantener una cantidad constante en el mapa.
- **Colisión:** si la cabeza de A toca cualquier segmento del cuerpo de B, A muere. Chocar cabeza contra cabeza mata a ambas.
- Al morir, el cuerpo se convierte en comida brillante y más valiosa a lo largo de donde estaba.
- **Acelerar** aumenta la velocidad y consume longitud (soltando comida pequeña detrás). No se puede acelerar por debajo de una longitud mínima.
- El mapa es un círculo; tocar el borde mata.
- Las colisiones se calculan con la cuadrícula espacial de `server/spatialGrid.ts`, nunca comparando todos contra todos.

## Estilo visual

- Fondo oscuro con cuadrícula hexagonal procedural; borde del mapa en violeta.
- Cada segmento con degradado radial para dar volumen. Las skins con varios colores se alternan por segmento.
- Ojos en la cabeza orientados según la dirección.
- Brillo (`shadowBlur`) en el cuerpo al acelerar.
- Comida: círculos de colores con un leve pulso de brillo.
- Dibujar solo lo que está en pantalla.

## Scripts

- `npm run dev`: levanta Vite (cliente) y el servidor con recarga (`tsx watch`) a la vez. Vite hace proxy de la ruta `/ws` al servidor local.
- `npm run build`: compila el cliente a `dist/client` y el servidor a `dist/server`.
- `npm start`: corre el servidor compilado, que sirve `dist/client` y el WebSocket en `/ws`.

## Deploy en Render

- Tipo: Web Service, conectado al repositorio de GitHub.
- Build command: `npm install && npm run build`
- Start command: `npm start`
- El servidor escucha en `process.env.PORT` (Render lo asigna); en local usa 3000.
- El cliente se conecta al mismo dominio del que cargó la página, usando `wss://` si la página es `https://` y `ws://` si es `http://`. Nunca escribir URLs fijas.
- Exponer una ruta `/health` que responda 200.
- Recordar que el plan gratuito se duerme tras 15 minutos sin uso y el estado se pierde al reiniciar; es aceptable para esta prueba.

## Plan de desarrollo

Trabajar **una fase a la vez**. No adelantar trabajo de fases futuras. Al terminar cada fase, explicar cómo probarla y esperar confirmación antes de seguir.

### Fase 0: Preparar el proyecto
Estructura de carpetas, `package.json`, TypeScript, Vite, scripts y un servidor que sirve una página y acepta una conexión WebSocket.
**Listo cuando:** desplegado en Render, abrir la URL muestra en la consola del navegador que se conectó al servidor.

### Fase 1: Una serpiente en local
Solo cliente: serpiente que sigue al mouse, comida, crecimiento, cámara que sigue a la cabeza, fondo hexagonal, borde del mapa y dibujo de skins.
**Listo cuando:** se puede jugar solo, recorrer el mapa y crecer.

### Fase 2: Llevar la lógica al servidor
Mover movimiento y comida al servidor. El cliente envía input y recibe snapshots. Implementar interpolación. Pedir revisión del plan antes de escribir código en esta fase.
**Listo cuando:** con dos pestañas abiertas, ambas serpientes se mueven con fluidez en las dos.

### Fase 3: Jugabilidad real
Colisiones con cuadrícula espacial, muerte que convierte el cuerpo en comida, aceleración que consume longitud, muerte en el borde y reaparición.
**Listo cuando:** se puede matar a la serpiente de otra pestaña cruzándose delante de ella y comer sus restos.

### Fase 4: Interfaz
Pantalla de inicio con nombre y selector de skin, ranking de los diez más largos, pantalla de muerte con puntuación y botón de reintentar, nombres sobre cada serpiente. Debe funcionar también en móvil (touch).
**Listo cuando:** alguien que nunca lo ha visto puede entrar, jugar y volver a empezar sin explicaciones.

### Fase 5: Optimización y pulido
Snapshots limitados al área de visión, render solo de lo visible, bots sencillos para mantener el mapa con al menos 10 serpientes, brillo al acelerar y pulso de la comida.
**Listo cuando:** corre fluido con varios jugadores y bots a la vez.

### Fase 6: La prueba
Deploy final en Render, revisar logs y corregir errores encontrados en la prueba real.

## Forma de trabajar

- Antes de cambios grandes, proponer un plan breve y esperar aprobación.
- Mantener los archivos pequeños y con una sola responsabilidad.
- Todas las cifras ajustables (velocidades, radios, tick rate, cantidad de comida) van en `shared/constants.ts`, no repartidas por el código.
- Tipado estricto en TypeScript (`strict: true`), sin `any` salvo justificación.
- Después de cada cambio, verificar que `npm run build` compila sin errores.
- Sugerir un mensaje de commit al terminar cada fase.
- Si un error solo se ve en el navegador, pedir que se pegue la salida de la consola.
