import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      '/functions/v1': {
        target: process.env.VITE_SUPABASE_URL || 'https://ehvcrdooykxmcpcopuxz.supabase.co',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - split large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
          ],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-form': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'vendor-charts': ['recharts'],
          'vendor-animation': ['framer-motion'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Increase chunk size warning limit slightly
    chunkSizeWarningLimit: 600,
  },
}));
