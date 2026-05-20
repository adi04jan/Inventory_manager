import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://182.70.254.11:1880',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
