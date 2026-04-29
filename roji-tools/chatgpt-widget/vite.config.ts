import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: false,
  build: {
    outDir: "../public/assets/chatgpt-widget",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "chatgpt.html"),
      },
      output: {
        entryFileNames: "index.js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
    minify: true,
    sourcemap: false,
  },
});
