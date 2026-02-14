import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tests': {
        target: 'https://threerd-back.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://threerd-back.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/github/repos': {
        target: 'https://threerd-back.onrender.com',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: 'https://threerd-back.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
