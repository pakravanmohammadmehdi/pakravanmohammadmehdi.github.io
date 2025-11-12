// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // For user/organization pages (mohapak.github.io) keep this as "/".
  // If you ever move to a project page, change to "/your-repo-name/".
  base: '/',

  plugins: [
    react()
  ],

  publicDir: 'public',

  build: {
    target: 'es2019',
    outDir: 'dist',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    // Trim console/debugger in prod
    terserOptions: undefined, // leave unset if using esbuild
    rollupOptions: {
      output: {
        // Put react and d3 in long-cached chunks
        manualChunks: {
          react: ['react', 'react-dom'],
          d3: ['d3'], // if you later import subpackages, list them here instead
        },
      },
    },
  },

  optimizeDeps: {
    include: ['d3'], // speeds up dev server pre-bundle
  },
})
