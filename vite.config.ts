import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// GitHub Pages serves project sites from /<repo-name>/, so the build passes the
// base path through VITE_BASE_PATH (see .github/workflows/deploy-pages.yml).
// Defaults to "/" for local dev and custom domains.
const base = process.env.VITE_BASE_PATH || "/";

// https://vitejs.dev/config/
export default defineConfig({
  base,
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
