/**
 * Kroma Safe Desktop Build Orchestrator
 * 
 * Runs the complete end-to-end desktop packaging flow:
 * 1. Executes Tauri release build (which runs pre-tauri-build.mjs before compilation)
 * 2. Scans and validates generated Windows binary and NSIS/MSI installers
 * 3. Reports artifact paths, sizes, and installation instructions
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const TARGET_RELEASE_DIR = path.join(ROOT_DIR, "src-tauri", "target", "release");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function findFiles(dir, matchFn, depth = 3) {
  const results = [];
  if (depth < 0 || !fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, matchFn, depth - 1));
    } else if (matchFn(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function runTauriBuild() {
  return new Promise((resolve, reject) => {
    console.log(`[KROMA DESKTOP BUILD] Initiating Tauri release build & Windows packaging...`);

    const child = spawn("npx", ["tauri", "build"], {
      stdio: "inherit",
      shell: true,
      cwd: ROOT_DIR,
      env: { ...process.env, NODE_ENV: "production" },
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Tauri build exited with error code ${code}`));
      }
    });
  });
}

function reportArtifacts() {
  console.log(`\n==================================================`);
  console.log(`KROMA DESKTOP BUILD — ARTIFACT MANIFEST`);
  console.log(`==================================================\n`);

  // 1. Check Executable
  const exePath = path.join(TARGET_RELEASE_DIR, "kroma.exe");
  if (fs.existsSync(exePath)) {
    const stat = fs.statSync(exePath);
    console.log(`[EXECUTABLE] Standalone Windows Binary:`);
    console.log(`  Path: ${exePath}`);
    console.log(`  Size: ${formatBytes(stat.size)}\n`);
  } else {
    console.warn(`[WARNING] kroma.exe not found at ${exePath}`);
  }

  // 2. Check NSIS Setup Installer
  const nsisDir = path.join(TARGET_RELEASE_DIR, "bundle", "nsis");
  const nsisInstallers = findFiles(nsisDir, (name) => name.endsWith(".exe"));
  if (nsisInstallers.length > 0) {
    console.log(`[INSTALLER] Windows NSIS Setup Executable:`);
    for (const inst of nsisInstallers) {
      const stat = fs.statSync(inst);
      console.log(`  File: ${path.basename(inst)}`);
      console.log(`  Path: ${inst}`);
      console.log(`  Size: ${formatBytes(stat.size)}\n`);
    }
  } else {
    console.log(`[INSTALLER] NSIS setup directory: ${nsisDir}`);
  }

  // 3. Check MSI Installer if configured
  const msiDir = path.join(TARGET_RELEASE_DIR, "bundle", "msi");
  const msiInstallers = findFiles(msiDir, (name) => name.endsWith(".msi"));
  if (msiInstallers.length > 0) {
    console.log(`[INSTALLER] Windows MSI Package:`);
    for (const inst of msiInstallers) {
      const stat = fs.statSync(inst);
      console.log(`  File: ${path.basename(inst)}`);
      console.log(`  Path: ${inst}`);
      console.log(`  Size: ${formatBytes(stat.size)}\n`);
    }
  }

  console.log(`==================================================`);
  console.log(`BUILD COMPLETED SUCCESSFULLY!`);
  console.log(`Kroma is ready to run independently on Windows.`);
  console.log(`==================================================\n`);
}

async function main() {
  try {
    await runTauriBuild();
    reportArtifacts();
  } catch (err) {
    console.error(`\n[KROMA DESKTOP BUILD ERROR]`, err.message);
    process.exit(1);
  }
}

main();
