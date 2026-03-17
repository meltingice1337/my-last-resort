import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import tailwindcss from "@tailwindcss/vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

export default defineConfig({
  plugins: [tailwindcss(), react(), basicSsl(), wasm(), topLevelAwait()],
  base: "/my-last-resort/",
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
  optimizeDeps: {
    exclude: ["vault-wasm"],
  },
});
