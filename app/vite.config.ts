import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// De RuneScape-API's sturen geen CORS-headers. De dev-server proxyt daarom:
//   /api/hiscore/...     -> https://secure.runescape.com/...
//   /api/runemetrics/... -> https://apps.runescape.com/runemetrics/...
export default defineConfig({
  plugins: [react()],
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
