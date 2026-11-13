import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/workflow': {
        target: 'http://localhost:8002',
        changeOrigin: true
      },
      '/api/llm': {
        target: 'http://localhost:8001',
        changeOrigin: true
      },
      '/api/image': {
        target: 'http://localhost:8001',
        changeOrigin: true
      },
      '/api/config': {
        target: 'http://localhost:8001',
        changeOrigin: true
      },
      '/generated_images': {
        target: 'http://localhost:8001',
        changeOrigin: true
      }
    }
  }
});
