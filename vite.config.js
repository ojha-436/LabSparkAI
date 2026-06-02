import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend build. Output goes to dist/ which Firebase Hosting serves.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
