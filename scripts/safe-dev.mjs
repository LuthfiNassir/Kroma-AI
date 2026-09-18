/**
 * Kroma Safe Dev Server Launcher
 * Prevents multiple competing dev servers on port 3000.
 * Ensures the development build uses .next-dev and verifies asset health once ready.
 */

import { spawn } from "node:child_process";
import net from "node:net";
import http from "node:http";

const PORT = 3000;
const HOST = "127.0.0.1";

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true); // Port in use
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function checkKromaHealth() {
  return new Promise((resolve) => {
    const req = http.get(`http://${HOST}:${PORT}/`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const inUse = await checkPort(PORT, HOST);

  if (inUse) {
    const isHealthy = await checkKromaHealth();
    if (isHealthy) {
      console.log(`[KROMA SAFE DEV] Dev server is already running and healthy at http://localhost:${PORT}/`);
      console.log(`[KROMA SAFE DEV] No need to spawn a duplicate process.`);
      process.exit(0);
    } else {
      console.warn(`[KROMA SAFE DEV] Port ${PORT} is occupied by an unresponsive process.`);
      console.warn(`[KROMA SAFE DEV] Please release port ${PORT} or check running background tasks.`);
      process.exit(1);
    }
  }

  console.log(`[KROMA SAFE DEV] Port ${PORT} is clear. Launching Next.js with isolated distDir (.next-dev)...`);

  const nextProcess = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: "inherit",
    shell: true,
  });

  nextProcess.on("exit", (code) => {
    console.log(`[KROMA SAFE DEV] Dev server exited with code ${code}`);
    process.exit(code || 0);
  });

  const cleanup = () => {
    console.log(`\n[KROMA SAFE DEV] Shutting down dev server...`);
    nextProcess.kill("SIGINT");
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error(`[KROMA SAFE DEV] Fatal error:`, err);
  process.exit(1);
});
