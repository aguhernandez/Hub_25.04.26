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
var vite_config_default = defineConfig({
  plugins: [react(), copyPublicManually()],
  publicDir: false,
  optimizeDeps: {
    exclude: ["lucide-react"]
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IEJST0tFTl9GSUxFUyA9IFsnZmF2aWNvbl9mb25kb19ibGFuY28gY29weSBjb3B5LnBuZyddO1xuXG5mdW5jdGlvbiBjb3B5UHVibGljTWFudWFsbHkoKTogaW1wb3J0KCd2aXRlJykuUGx1Z2luIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAnY29weS1wdWJsaWMtbWFudWFsbHknLFxuICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgIGFzeW5jIHdyaXRlQnVuZGxlKCkge1xuICAgICAgY29uc3QgcHVibGljRGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3B1YmxpYycpO1xuICAgICAgY29uc3Qgb3V0RGlyID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QnKTtcbiAgICAgIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhwdWJsaWNEaXIpO1xuICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XG4gICAgICAgIGlmIChCUk9LRU5fRklMRVMuaW5jbHVkZXMoZW50cnkpKSBjb250aW51ZTtcbiAgICAgICAgY29uc3Qgc3JjID0gcGF0aC5qb2luKHB1YmxpY0RpciwgZW50cnkpO1xuICAgICAgICBjb25zdCBkZXN0ID0gcGF0aC5qb2luKG91dERpciwgZW50cnkpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGlmIChmcy5zdGF0U3luYyhzcmMpLmlzRmlsZSgpKSB7XG4gICAgICAgICAgICBmcy5jb3B5RmlsZVN5bmMoc3JjLCBkZXN0KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2gge31cbiAgICAgIH1cbiAgICB9LFxuICB9O1xufVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCksIGNvcHlQdWJsaWNNYW51YWxseSgpXSxcbiAgcHVibGljRGlyOiBmYWxzZSxcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgJ3JlYWN0LXZlbmRvcic6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICAgICAgJ3N1cGFiYXNlJzogWydAc3VwYWJhc2Uvc3VwYWJhc2UtanMnXSxcbiAgICAgICAgICAnaWNvbnMnOiBbJ2x1Y2lkZS1yZWFjdCddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixTQUFTLG9CQUFvQjtBQUN0UCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBSGpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU0sZUFBZSxDQUFDLG9DQUFvQztBQUUxRCxTQUFTLHFCQUE0QztBQUNuRCxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsSUFDUCxNQUFNLGNBQWM7QUFDbEIsWUFBTSxZQUFZLEtBQUssUUFBUSxrQ0FBVyxRQUFRO0FBQ2xELFlBQU0sU0FBUyxLQUFLLFFBQVEsa0NBQVcsTUFBTTtBQUM3QyxZQUFNLFVBQVUsR0FBRyxZQUFZLFNBQVM7QUFDeEMsaUJBQVcsU0FBUyxTQUFTO0FBQzNCLFlBQUksYUFBYSxTQUFTLEtBQUssRUFBRztBQUNsQyxjQUFNLE1BQU0sS0FBSyxLQUFLLFdBQVcsS0FBSztBQUN0QyxjQUFNLE9BQU8sS0FBSyxLQUFLLFFBQVEsS0FBSztBQUNwQyxZQUFJO0FBQ0YsY0FBSSxHQUFHLFNBQVMsR0FBRyxFQUFFLE9BQU8sR0FBRztBQUM3QixlQUFHLGFBQWEsS0FBSyxJQUFJO0FBQUEsVUFDM0I7QUFBQSxRQUNGLFFBQVE7QUFBQSxRQUFDO0FBQUEsTUFDWDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFHQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLG1CQUFtQixDQUFDO0FBQUEsRUFDdkMsV0FBVztBQUFBLEVBQ1gsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGNBQWM7QUFBQSxFQUMxQjtBQUFBLEVBQ0EsT0FBTztBQUFBLElBQ0wsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBLFVBQ1osZ0JBQWdCLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDckMsWUFBWSxDQUFDLHVCQUF1QjtBQUFBLFVBQ3BDLFNBQVMsQ0FBQyxjQUFjO0FBQUEsUUFDMUI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsdUJBQXVCO0FBQUEsRUFDekI7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
