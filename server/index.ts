import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { MAX_NAME_LENGTH, TICK_RATE, WORLD_RADIUS } from "../shared/constants.js";
import type { MensajeCliente, MensajeServidor } from "../shared/protocol.js";
import { esSkinValida } from "../shared/skins.js";
import { Juego } from "./game.js";
import { aplicarInput } from "./snake.js";

// Render asigna el puerto; en local usamos 3000.
const PUERTO = Number(process.env.PORT ?? 3000);

// dist/server/index.js -> dist/client en producción; server/index.ts -> client en desarrollo.
const DIR_CLIENTE = resolve(fileURLToPath(new URL("../client/", import.meta.url)));

const TIPOS_MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

/** Envía un archivo del build del cliente, o un 404 si no existe. */
async function enviarArchivo(ruta: string, res: ServerResponse): Promise<void> {
  try {
    const info = await stat(ruta);
    if (info.isDirectory()) throw new Error("La ruta es un directorio");

    const contenido = await readFile(ruta);
    res.writeHead(200, {
      "Content-Type": TIPOS_MIME[extname(ruta)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(contenido);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
  }
}

/** Convierte la ruta de la URL en una ruta dentro de DIR_CLIENTE, sin permitir salir de ella. */
function resolverRuta(rutaUrl: string): string {
  const relativa = decodeURIComponent(rutaUrl).replace(/^\/+/, "");
  const candidata = resolve(DIR_CLIENTE, relativa);
  const dentroDelCliente = candidata === DIR_CLIENTE || candidata.startsWith(DIR_CLIENTE + sep);
  return dentroDelCliente ? candidata : resolve(DIR_CLIENTE, "index.html");
}

/** Sirve archivos estáticos y cae en index.html para rutas desconocidas. */
async function servirEstatico(rutaUrl: string, res: ServerResponse): Promise<void> {
  const pedida = rutaUrl === "/" ? resolve(DIR_CLIENTE, "index.html") : resolverRuta(rutaUrl);

  try {
    const info = await stat(pedida);
    if (info.isDirectory()) throw new Error("La ruta es un directorio");
    await enviarArchivo(pedida, res);
  } catch {
    await enviarArchivo(resolve(DIR_CLIENTE, "index.html"), res);
  }
}

const servidor = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }

  void servirEstatico(pathname, res);
});

// --- Juego -----------------------------------------------------------------

const juego = new Juego();

/** Un socket conectado. `id` es null hasta que hace `join`. */
interface Conexion {
  /** Ya hizo join alguna vez (recibe snapshots aunque esté muerto). */
  entrado: boolean;
  /** Serpiente viva; null mientras está muerto o antes de entrar. */
  serpienteId: string | null;
}

const conexiones = new Map<WebSocket, Conexion>();

/** Valida y recorta el nombre del jugador. */
function validarNombre(valor: unknown): string {
  if (typeof valor !== "string") return "Anónimo";
  const limpio = valor.trim().slice(0, MAX_NAME_LENGTH);
  return limpio.length > 0 ? limpio : "Anónimo";
}

/** Busca la conexión de una serpiente concreta. */
function conexionDe(serpienteId: string): WebSocket | null {
  for (const [ws, conexion] of conexiones) {
    if (conexion.serpienteId === serpienteId) return ws;
  }
  return null;
}

// Cada tick se arma un snapshot por cliente, limitado a su área de visión.
juego.iniciar(
  () => {
    for (const [ws, conexion] of conexiones) {
      if (!conexion.entrado || ws.readyState !== WebSocket.OPEN) continue;
      ws.send(JSON.stringify(juego.snapshotPara(conexion.serpienteId)));
    }
  },
  (serpienteId, puntuacion) => {
    // La serpiente murió: el jugador deja de estar vivo y recibe su puntuación.
    const ws = conexionDe(serpienteId);
    if (!ws) return;

    const conexion = conexiones.get(ws);
    if (conexion) conexion.serpienteId = null;

    if (ws.readyState === WebSocket.OPEN) {
      const aviso: MensajeServidor = { t: "dead", puntuacion };
      ws.send(JSON.stringify(aviso));
    }
  },
);

const wss = new WebSocketServer({ noServer: true });

// Solo aceptamos WebSockets en /ws; cualquier otra ruta se rechaza.
servidor.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");

  if (pathname !== "/ws") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws) => {
  const conexion: Conexion = { entrado: false, serpienteId: null };
  conexiones.set(ws, conexion);

  ws.on("message", (datos) => {
    let mensaje: MensajeCliente;

    try {
      mensaje = JSON.parse(datos.toString()) as MensajeCliente;
    } catch {
      console.warn("[ws] mensaje que no es JSON válido");
      return;
    }

    if (mensaje.t === "join") {
      if (conexion.serpienteId) return; // ya tiene una serpiente viva

      const nombre = validarNombre(mensaje.nombre);
      const skin = esSkinValida(mensaje.skin) ? mensaje.skin : 0;
      const id = randomUUID();

      juego.agregarJugador(id, nombre, skin);
      conexion.serpienteId = id;
      conexion.entrado = true;

      const bienvenida: MensajeServidor = {
        t: "welcome",
        id,
        radioMapa: WORLD_RADIUS,
        tickRate: TICK_RATE,
      };
      ws.send(JSON.stringify(bienvenida));

      console.log(`[ws] entró ${nombre} (${id.slice(0, 8)}); en el mapa: ${juego.cantidadSerpientes}`);
      return;
    }

    if (mensaje.t === "input") {
      if (!conexion.serpienteId) return; // todavía no ha entrado o está muerto

      const serpiente = juego.obtener(conexion.serpienteId);
      if (!serpiente) return;

      // Validación: el ángulo tiene que ser un número real.
      if (typeof mensaje.angulo !== "number" || !Number.isFinite(mensaje.angulo)) return;

      aplicarInput(serpiente, mensaje.angulo, mensaje.acelerando === true);
    }
  });

  ws.on("close", () => {
    if (conexion.serpienteId) {
      juego.quitarJugador(conexion.serpienteId);
      console.log(`[ws] salió ${conexion.serpienteId.slice(0, 8)}; en el mapa: ${juego.cantidadSerpientes}`);
    }
    conexiones.delete(ws);
  });

  ws.on("error", (error) => console.error("[ws] error:", error));
});

servidor.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
  console.log(`WebSocket disponible en ws://localhost:${PUERTO}/ws`);
});
