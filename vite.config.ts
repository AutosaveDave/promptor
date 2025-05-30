import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/promptor/', // Set base for GitHub Pages
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  assetsInclude: ['**/*.txt'], // Ensure .txt files in src are included in the build output
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
