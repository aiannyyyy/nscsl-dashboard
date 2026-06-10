import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
    // ADD THIS PROXY CONFIGURATION
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // Change to your backend port
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    }
  },
  
  // Preview server configuration (for production preview)
  preview: {
    host: '0.0.0.0',
    port: 3002
  },
  
  // Build configuration
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})