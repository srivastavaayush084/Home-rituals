import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

function caseInsensitiveAssetsPlugin(): Plugin {
  return {
    name: 'case-insensitive-assets',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const pairs = [
        ['Animation.mp4', 'animation.mp4'],
        ['Animation1.mp4', 'animation1.mp4'],
        ['ritual-edit.mp4', 'ritual-edit.mp4'],
      ];
      pairs.forEach(([src, dest]) => {
        const srcPath = path.join(distDir, src);
        const destPath = path.join(distDir, dest);
        if (fs.existsSync(srcPath)) {
          try {
            fs.copyFileSync(srcPath, destPath);
          } catch {}
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), caseInsensitiveAssetsPlugin()],
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
