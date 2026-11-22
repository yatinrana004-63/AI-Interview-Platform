import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, ".", "");
  return {
    plugins: [react()],
    server: {
      proxy: { "/api": API_PROXY_TARGET || "http://localhost:3000" },
    },
  };
});
