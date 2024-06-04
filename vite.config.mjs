import { defineConfig } from "vite";
import path from "path";
import reactRefresh from "@vitejs/plugin-react-refresh";

export default defineConfig({
  root: path.resolve(__dirname, "e2e"),
  plugins: [reactRefresh()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      node_modules: path.resolve(__dirname, "node_modules"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "e2e/index.html"),
    },
  },
  server: {
    fs: {
      allow: [".."], // Allow serving files from one level up to access node_modules
    },
  },
});
