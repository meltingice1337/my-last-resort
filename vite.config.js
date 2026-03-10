import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl()],
  base: "/my-last-resort/",
  resolve: {
    alias: {
      crypto: path.resolve(import.meta.dirname, "src/util/crypto-shim.js"),
    },
  },
  server: {
    host: true,
    strictPort: true,
    port: 3000,
    open: true,
  },
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: false,
      },
    },
  },
});
