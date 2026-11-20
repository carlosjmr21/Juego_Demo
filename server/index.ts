import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { createServer, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import { TICK_RATE, WORLD_RADIUS } from "../shared/constants.js";
import type { MensajeServidor } from "../shared/protocol.js";

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
  const id = randomUUID();
  console.log(`[ws] jugador conectado: ${id}`);

  const bienvenida: MensajeServidor = {
    t: "welcome",
    id,
    radioMapa: WORLD_RADIUS,
    tickRate: TICK_RATE,
  };
  ws.send(JSON.stringify(bienvenida));

  ws.on("message", (datos) => {
    // En la Fase 0 solo registramos lo que llega; el juego empieza en la Fase 2.
    console.log(`[ws] mensaje de ${id}: ${datos.toString()}`);
  });

  ws.on("close", () => console.log(`[ws] jugador desconectado: ${id}`));
  ws.on("error", (error) => console.error(`[ws] error con ${id}:`, error));
});

servidor.listen(PUERTO, () => {
  console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
  console.log(`WebSocket disponible en ws://localhost:${PUERTO}/ws`);
});
