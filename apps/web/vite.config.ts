import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// API base for the dev proxy (the Fastify server, default :3001).
const API_TARGET = process.env.VITE_API_TARGET || "http://localhost:3001";

// The Latin font subset is only requested once slide text renders, which is the last
// step before the largest paint. Preloading it (29 KB) takes it off that critical path.
const preloadLatinFont = (): Plugin => ({
  name: "preload-latin-font",
  transformIndexHtml: {
    order: "post",
    handler(_html, ctx) {
      const font = Object.keys(ctx.bundle ?? {}).find(f => /noto-serif-ethiopic-latin-wght-normal-.*\.woff2$/.test(f));
      if (!font) console.warn("preload-latin-font: Latin font file not found, skipping the preload");
      return font ? [{ tag: "link", attrs: { rel: "preload", href: `/${font}`, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head" }] : [];
    },
  },
});

export default defineConfig({
  plugins: [react(), preloadLatinFont()],
  resolve: {
    // shared components must use the app's single React instance
    dedupe: ["react", "react-dom"],
    alias: {
      "@kidase/shared": fileURLToPath(new URL("../../packages/shared/src", import.meta.url)),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
    },
  },
});
