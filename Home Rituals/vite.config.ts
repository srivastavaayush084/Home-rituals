import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'router'
            if (id.includes('swiper')) return 'swiper'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('react-icons') || id.includes('lucide-react')) return 'icons'
            if (id.includes('react-dom') || id.includes('react')) return 'react'
            return 'vendor'
          }
        },
      },
    },
  },
})
