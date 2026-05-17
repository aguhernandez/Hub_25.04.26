import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

const BROKEN_FILES = ['favicon_fondo_blanco copy copy.png'];

function copyPublicManually(): import('vite').Plugin {
  return {
    name: 'copy-public-manually',
    apply: 'build',
    async writeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const outDir = path.resolve(__dirname, 'dist');
      const entries = fs.readdirSync(publicDir);
      for (const entry of entries) {
        if (BROKEN_FILES.includes(entry)) continue;
        const src = path.join(publicDir, entry);
        const dest = path.join(outDir, entry);
        try {
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        } catch {}
      }
    },
  };
}

function isPackageInstalled(pkg: string): boolean {
  try {
    fs.accessSync(path.resolve(__dirname, 'node_modules', pkg));
    return true;
  } catch {
    return false;
  }
}

const capacitorAliases: Record<string, string> = {};

if (!isPackageInstalled('@capacitor/push-notifications')) {
  capacitorAliases['@capacitor/push-notifications'] = path.resolve(__dirname, 'src/stubs/capacitor-push-notifications.ts');
}
if (!isPackageInstalled('@capacitor/camera')) {
  capacitorAliases['@capacitor/camera'] = path.resolve(__dirname, 'src/stubs/capacitor-camera.ts');
}
if (!isPackageInstalled('@capacitor/geolocation')) {
  capacitorAliases['@capacitor/geolocation'] = path.resolve(__dirname, 'src/stubs/capacitor-geolocation.ts');
}
if (!isPackageInstalled('@capacitor/app')) {
  capacitorAliases['@capacitor/app'] = path.resolve(__dirname, 'src/stubs/capacitor-app.ts');
}
if (!isPackageInstalled('@capacitor/browser')) {
  capacitorAliases['@capacitor/browser'] = path.resolve(__dirname, 'src/stubs/capacitor-browser.ts');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyPublicManually()],
  publicDir: false,
  resolve: {
    alias: capacitorAliases,
  },
  optimizeDeps: {
    exclude: ['lucide-react', '@capacitor/push-notifications', '@capacitor/core', '@capacitor/camera', '@capacitor/geolocation', '@capacitor/browser', '@capacitor/app'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
