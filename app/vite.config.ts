import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createPluginInbox } from "./src/server/pluginInbox.ts";

// Ontvangstpunt voor de in-game plugin "Ons Pap sync" (../plugin/ons-pap-sync), alleen in de dev-server:
//   POST /api/plugin/sync   schrijft .plugin/latest.json en voegt events toe aan .plugin/events.jsonl
//   GET  /api/plugin/latest geeft latest.json terug, of 404
function pluginInbox(): Plugin {
  return {
    name: "ons-pap-plugin-inbox",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(createPluginInbox({ dir: resolve(server.config.root, ".plugin") }));
    },
  };
}

// De RuneScape-API's sturen geen CORS-headers. De dev-server proxyt daarom:
//   /api/hiscore/...     -> https://secure.runescape.com/...
//   /api/runemetrics/... -> https://apps.runescape.com/runemetrics/...
export default defineConfig({
  plugins: [react(), pluginInbox()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/hiscore": {
        target: "https://secure.runescape.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/hiscore/, ""),
      },
      "/api/runemetrics": {
        target: "https://apps.runescape.com",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/runemetrics/, "/runemetrics"),
      },
    },
  },
});
