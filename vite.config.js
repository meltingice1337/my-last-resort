import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import basicSsl from '@vitejs/plugin-basic-ssl';
export default defineConfig({
    plugins: [react(), basicSsl(), nodePolyfills(
        {
            globals: {
                Buffer: true,
            },
            protocolImports: true,

        }
    )
    ],
    define: {
        global: 'globalThis',
    },
    resolve: {
        alias: {
            // Ensure buffer imports resolve correctly
            buffer: 'buffer',
        },
    },
    optimizeDeps: {
        include: ['brotli']
    },
    server: {
        host: true,
        strictPort: true,
        port: 3000,
        open: true
    },
    build: {
        minify: 'terser', // or 'esbuild' for faster builds
        terserOptions: {
            compress: {
                drop_console: false, // Set to true to remove console logs in production
            },
        },
    },
})