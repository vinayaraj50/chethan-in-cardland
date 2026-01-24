import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/chethan-in-cardland/',
  server: {
    port: 6161,
    strictPort: true,
    // NOTE: COOP/COEP headers removed for Firebase Auth compatibility.
    // signInWithPopup requires cross-origin popup access to accounts.google.com
    proxy: {
      '/firebase-proxy': {
        target: 'https://firebasestorage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firebase-proxy/, '')
      }
    }
  },
})
