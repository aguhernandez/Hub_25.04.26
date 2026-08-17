// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import fs from "fs";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var BROKEN_FILES = ["favicon_fondo_blanco copy copy.png"];
function copyPublicManually() {
  return {
    name: "copy-public-manually",
    apply: "build",
    async writeBundle() {
      const publicDir = path.resolve(__vite_injected_original_dirname, "public");
      const outDir = path.resolve(__vite_injected_original_dirname, "dist");
      const entries = fs.readdirSync(publicDir);
      for (const entry of entries) {
        if (BROKEN_FILES.includes(entry)) continue;
        const src = path.join(publicDir, entry);
        const dest = path.join(outDir, entry);
        try {
          if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest);
          }
        } catch {
        }
      }
    }
  };
}
function isPackageInstalled(pkg) {
  try {
    fs.accessSync(path.resolve(__vite_injected_original_dirname, "node_modules", pkg));
    return true;
  } catch {
    return false;
  }
}
var capacitorAliases = {};
if (!isPackageInstalled("@capacitor/push-notifications")) {
  capacitorAliases["@capacitor/push-notifications"] = path.resolve(__vite_injected_original_dirname, "src/stubs/capacitor-push-notifications.ts");
}
if (!isPackageInstalled("@capacitor/camera")) {
  capacitorAliases["@capacitor/camera"] = path.resolve(__vite_injected_original_dirname, "src/stubs/capacitor-camera.ts");
}
if (!isPackageInstalled("@capacitor/geolocation")) {
  capacitorAliases["@capacitor/geolocation"] = path.resolve(__vite_injected_original_dirname, "src/stubs/capacitor-geolocation.ts");
}
var vite_config_default = defineConfig({
  plugins: [react(), copyPublicManually()],
  publicDir: false,
  resolve: {
    alias: capacitorAliases
  },
  optimizeDeps: {
    exclude: ["lucide-react", "@capacitor/push-notifications", "@capacitor/core", "@capacitor/camera", "@capacitor/geolocation"]
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "supabase": ["@supabase/supabase-js"],
          "icons": ["lucide-react"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IEJST0tFTl9GSUxFUyA9IFsnZmF2aWNvbl9mb25kb19ibGFuY28gY29weSBjb3B5LnBuZyddO1xuXG5mdW5jdGlvbiBjb3B5UHVibGljTWFudWFsbHkoKTogaW1wb3J0KCd2aXRlJykuUGx1Z2luIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY29weS1wdWJsaWMtbWFudWFsbHknLFxuICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgIGFzeW5jIHdyaXRlQnVuZGxlKCkge1xuICAgICAgY29uc3QgcHVibGljRGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYycpO1xuICAgICAgY29uc3Qgb3V0RGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QnKTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhwdWJsaWNEaXIpO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGlmIChCUk9LRU5fRklMRVMuaW5jbHVkZXMoZW50cnkpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3Qgc3JjID0gcGF0aC5qb2luKHB1YmxpY0RpciwgZW50cnkpO1xuICAgICAgICBjb25zdCBkZXN0ID0gcGF0aC5qb2luKG91dERpciwgZW50cnkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChmcy5zdGF0U3luYyhzcmMpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBmcy5jb3B5RmlsZVN5bmMoc3JjLCBkZXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG5mdW5jdGlvbiBpc1BhY2thZ2VJbnN0YWxsZWQocGtnOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgdHJ5IHtcbiAgICBmcy5hY2Nlc3NTeW5jKHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdub2RlX21vZHVsZXMnLCBwa2cpKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmNvbnN0IGNhcGFjaXRvckFsaWFzZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcblxuaWYgKCFpc1BhY2thZ2VJbnN0YWxsZWQoJ0BjYXBhY2l0b3IvcHVzaC1ub3RpZmljYXRpb25zJykpIHtcbiAgY2FwYWNpdG9yQWxpYXNlc1snQGNhcGFjaXRvci9wdXNoLW5vdGlmaWNhdGlvbnMnXSA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvc3R1YnMvY2FwYWNpdG9yLXB1c2gtbm90aWZpY2F0aW9ucy50cycpO1xufVxuaWYgKCFpc1BhY2thZ2VJbnN0YWxsZWQoJ0BjYXBhY2l0b3IvY2FtZXJhJykpIHtcbiAgY2FwYWNpdG9yQWxpYXNlc1snQGNhcGFjaXRvci9jYW1lcmEnXSA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvc3R1YnMvY2FwYWNpdG9yLWNhbWVyYS50cycpO1xufVxuaWYgKCFpc1BhY2thZ2VJbnN0YWxsZWQoJ0BjYXBhY2l0b3IvZ2VvbG9jYXRpb24nKSkge1xuICBjYXBhY2l0b3JBbGlhc2VzWydAY2FwYWNpdG9yL2dlb2xvY2F0aW9uJ10gPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3N0dWJzL2NhcGFjaXRvci1nZW9sb2NhdGlvbi50cycpO1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIGNvcHlQdWJsaWNNYW51YWxseSgpXSxcbiAgcHVibGljRGlyOiBmYWxzZSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiBjYXBhY2l0b3JBbGlhc2VzLFxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ2x1Y2lkZS1yZWFjdCcsICdAY2FwYWNpdG9yL3B1c2gtbm90aWZpY2F0aW9ucycsICdAY2FwYWNpdG9yL2NvcmUnLCAnQGNhcGFjaXRvci9jYW1lcmEnLCAnQGNhcGFjaXRvci9nZW9sb2NhdGlvbiddLFxuICB9LFxuICBidWlsZDoge1xuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAnc3VwYWJhc2UnOiBbJ0BzdXBhYmFzZS9zdXBhYmFzZS1qcyddLFxuICAgICAgICAgICdpY29ucyc6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixPQUFPLFFBQVE7QUFDZixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTSxlQUFlLENBQUMsb0NBQW9DO0FBRTFELFNBQVMscUJBQTRDO0FBQ25ELFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLE1BQU0sY0FBYztBQUNsQixZQUFNLFlBQVksS0FBSyxRQUFRLGtDQUFXLFFBQVE7QUFDbEQsWUFBTSxTQUFTLEtBQUssUUFBUSxrQ0FBVyxNQUFNO0FBQzdDLFlBQU0sVUFBVSxHQUFHLFlBQVksU0FBUztBQUN4QyxpQkFBVyxTQUFTLFNBQVM7QUFDM0IsWUFBSSxhQUFhLFNBQVMsS0FBSyxFQUFHO0FBQ2xDLGNBQU0sTUFBTSxLQUFLLEtBQUssV0FBVyxLQUFLO0FBQ3RDLGNBQU0sT0FBTyxLQUFLLEtBQUssUUFBUSxLQUFLO0FBQ3BDLFlBQUk7QUFDRixjQUFJLEdBQUcsU0FBUyxHQUFHLEVBQUUsT0FBTyxHQUFHO0FBQzdCLGVBQUcsYUFBYSxLQUFLLElBQUk7QUFBQSxVQUMzQjtBQUFBLFFBQ0YsUUFBUTtBQUFBLFFBQUM7QUFBQSxNQUNYO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUVBLFNBQVMsbUJBQW1CLEtBQXNCO0FBQ2hELE1BQUk7QUFDRixPQUFHLFdBQVcsS0FBSyxRQUFRLGtDQUFXLGdCQUFnQixHQUFHLENBQUM7QUFDMUQsV0FBTztBQUFBLEVBQ1QsUUFBUTtBQUNOLFdBQU87QUFBQSxFQUNUO0FBQ0Y7QUFFQSxJQUFNLG1CQUEyQyxDQUFDO0FBRWxELElBQUksQ0FBQyxtQkFBbUIsK0JBQStCLEdBQUc7QUFDeEQsbUJBQWlCLCtCQUErQixJQUFJLEtBQUssUUFBUSxrQ0FBVywyQ0FBMkM7QUFDekg7QUFDQSxJQUFJLENBQUMsbUJBQW1CLG1CQUFtQixHQUFHO0FBQzVDLG1CQUFpQixtQkFBbUIsSUFBSSxLQUFLLFFBQVEsa0NBQVcsK0JBQStCO0FBQ2pHO0FBQ0EsSUFBSSxDQUFDLG1CQUFtQix3QkFBd0IsR0FBRztBQUNqRCxtQkFBaUIsd0JBQXdCLElBQUksS0FBSyxRQUFRLGtDQUFXLG9DQUFvQztBQUMzRztBQUdBLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsbUJBQW1CLENBQUM7QUFBQSxFQUN2QyxXQUFXO0FBQUEsRUFDWCxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsRUFDVDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGdCQUFnQixpQ0FBaUMsbUJBQW1CLHFCQUFxQix3QkFBd0I7QUFBQSxFQUM3SDtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsWUFBWSxDQUFDLHVCQUF1QjtBQUFBLFVBQ3BDLFNBQVMsQ0FBQyxjQUFjO0FBQUEsUUFDMUI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
