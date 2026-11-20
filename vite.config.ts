import { defineConfig } from "vite";

// El cliente vive en client/ y se compila a dist/client.
// En desarrollo, Vite hace proxy de /ws y /health al servidor de Node.
export default defineConfig({
  root: "client",
  build: {
    outDir: "../dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": { target: "http://localhost:3000", ws: true },
      "/health": { target: "http://localhost:3000" },
    },
  },
});
