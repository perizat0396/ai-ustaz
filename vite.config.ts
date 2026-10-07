import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Основной сайт открывается с корня домена https://ai-ustaz.vku.edu.kz/,
// поэтому базовый путь по умолчанию — «/». Копия на GitHub Pages живёт
// в подпапке (/ai-ustaz/) — её сборка в CI передаёт путь через BASE_PATH.
export default defineConfig(() => ({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    open: true,
  },
}))
