import os from "os";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const getLocalIp = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net?.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
};

const localIpPlugin = () => ({
  name: "local-ip-endpoint",
  configureServer(server) {
    server.middlewares.use("/__local-ip", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ip: getLocalIp() }));
    });
  }
});

export default defineConfig({
  plugins: [react(), localIpPlugin()],
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:4000"
    }
  }
});
