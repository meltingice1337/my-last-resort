import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    basicSsl(),
    nodePolyfills({
      globals: {
        Buffer: true,
      },
      protocolImports: true,
    }),
  ],
  base: "/my-last-resort/",
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      // Ensure buffer imports resolve correctly
      buffer: "buffer",
    },
  },
  optimizeDeps: {
    include: ["brotli"],
  },
  server: {
    host: true,
    strictPort: true,
    port: 3000,
    open: true,
  },
  build: {
    minify: "terser", // or 'esbuild' for faster builds
    terserOptions: {
      compress: {
        drop_console: false, // Set to true to remove console logs in production
      },
    },
  },
});
