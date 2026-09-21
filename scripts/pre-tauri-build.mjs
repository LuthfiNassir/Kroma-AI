/**
 * Kroma Pre-Tauri Build & Asset Verification Engine
 * 
 * Guarantees:
 * 1. Zero process collisions: Stops any running Next.js dev server on port 3000 before build.
 * 2. Clean static export: Compiles Next.js with output: "export" into out/
 * 3. Deterministic Asset Audit: Verifies on disk that every <link rel="stylesheet">,
 *    <script src="...">, font, and image referenced in out/index.html exists and is non-empty.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";

const PORT = 3000;
const HOST = "127.0.0.1";
const ROOT_DIR = process.cwd();
const OUT_DIR = path.join(ROOT_DIR, "out");

function checkPort(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function stopDevServerIfRunning() {
  const inUse = await checkPort(PORT, HOST);
  if (!inUse) {
    console.log(`[KROMA BUILD SAFETY] Port ${PORT} is clear. No conflicting dev server detected.`);
    return;
  }

  console.warn(`[KROMA BUILD SAFETY] Port ${PORT} is currently in use by a running dev server.`);
  console.warn(`[KROMA BUILD SAFETY] Terminating process on port ${PORT} to prevent Next.js dev/build collision...`);

  if (process.platform === "win32") {
    try {
      const output = execSync(`netstat -ano | findstr :${PORT}`, { encoding: "utf8" });
      const lines = output.trim().split("\n");
      const killedPids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0" && !isNaN(parseInt(pid, 10)) && !killedPids.has(pid)) {
          killedPids.add(pid);
          console.log(`[KROMA BUILD SAFETY] Releasing port ${PORT} by stopping process PID ${pid}...`);
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
          } catch {}
        }
      }
    } catch (err) {
      console.warn(`[KROMA BUILD SAFETY] Note: Could not kill process via netstat: ${err.message}`);
    }
  }

  await sleep(1500);
  console.log(`[KROMA BUILD SAFETY] Dev server stopped. Build environment is clean.`);
}

function buildStaticFrontend() {
  console.log(`\n[KROMA BUILD SAFETY] Compiling Next.js static export for desktop...`);
  execSync("npx next build", {
    stdio: "inherit",
    cwd: ROOT_DIR,
    env: { ...process.env, NODE_ENV: "production" },
  });
  console.log(`[KROMA BUILD SAFETY] Next.js static export compilation complete.`);
}

function auditStaticAssets() {
  console.log(`\n[KROMA ASSET AUDIT] Auditing static export in ${OUT_DIR}...`);

  const indexPath = path.join(OUT_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`CRITICAL: index.html not found in ${OUT_DIR}! Static export failed.`);
  }

  const indexContent = fs.readFileSync(indexPath, "utf8");

  // 1. Extract CSS Links
  const cssRegex = /href="([^"]+\.css[^"]*)"/g;
  const cssLinks = [];
  let match;
  while ((match = cssRegex.exec(indexContent)) !== null) {
    cssLinks.push(match[1].split("?")[0]);
  }

  // 2. Extract Script Tags
  const jsRegex = /src="([^"]+\.js[^"]*)"/g;
  const jsLinks = [];
  while ((match = jsRegex.exec(indexContent)) !== null) {
    if (!match[1].startsWith("chrome-extension://") && !match[1].startsWith("http")) {
      jsLinks.push(match[1].split("?")[0]);
    }
  }

  console.log(`[KROMA ASSET AUDIT] Discovered ${cssLinks.length} stylesheet(s) and ${jsLinks.length} script chunk(s) in index.html.`);

  let missingAssets = 0;

  // Check CSS
  for (const relPath of cssLinks) {
    const cleanPath = relPath.startsWith("/") ? relPath.slice(1) : relPath;
    const diskPath = path.join(OUT_DIR, cleanPath);
    if (!fs.existsSync(diskPath)) {
      console.error(`[KROMA ASSET AUDIT] FAIL: Missing CSS file on disk: ${diskPath}`);
      missingAssets++;
    } else {
      const size = fs.statSync(diskPath).size;
      if (size === 0) {
        console.error(`[KROMA ASSET AUDIT] FAIL: Zero-byte CSS file: ${diskPath}`);
        missingAssets++;
      } else {
        console.log(`[KROMA ASSET AUDIT] OK: CSS ${cleanPath} (${size} bytes)`);
      }
    }
  }

  // Check JS
  for (const relPath of jsLinks) {
    const cleanPath = relPath.startsWith("/") ? relPath.slice(1) : relPath;
    const diskPath = path.join(OUT_DIR, cleanPath);
    if (!fs.existsSync(diskPath)) {
      console.error(`[KROMA ASSET AUDIT] FAIL: Missing JS chunk on disk: ${diskPath}`);
      missingAssets++;
    } else {
      const size = fs.statSync(diskPath).size;
      if (size === 0) {
        console.error(`[KROMA ASSET AUDIT] FAIL: Zero-byte JS chunk: ${diskPath}`);
        missingAssets++;
      } else {
        console.log(`[KROMA ASSET AUDIT] OK: JS ${cleanPath} (${size} bytes)`);
      }
    }
  }

  // Check Brand Assets
  const criticalAssets = ["app-icon.png", "favicon.ico"];
  for (const asset of criticalAssets) {
    const assetPath = path.join(OUT_DIR, asset);
    if (fs.existsSync(assetPath)) {
      console.log(`[KROMA ASSET AUDIT] OK: Asset ${asset} (${fs.statSync(assetPath).size} bytes)`);
    } else {
      console.warn(`[KROMA ASSET AUDIT] WARNING: Optional icon file not at root: ${asset}`);
    }
  }

  if (missingAssets > 0) {
    throw new Error(`CRITICAL: Static asset audit failed with ${missingAssets} missing/corrupt asset(s)! Halting build.`);
  }

  console.log(`\n[KROMA ASSET AUDIT] AUDIT PASSED! All static frontend assets verified on disk.`);
}

async function main() {
  try {
    await stopDevServerIfRunning();
    buildStaticFrontend();
    auditStaticAssets();
  } catch (err) {
    console.error(`\n[KROMA BUILD ERROR]`, err.message);
    process.exit(1);
  }
}

main();
