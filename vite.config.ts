import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// В проде (GitHub Pages) сайт живёт по адресу /ai-ustaz2/ — базовый путь
// нужен, иначе ассеты грузятся с корня и получается белый экран.
// В dev остаётся «/», чтобы локально ничего не менялось.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/ai-ustaz2/' : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}))
