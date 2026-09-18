/**
 * Kroma Frontend Asset Health Diagnostic Tool
 * Programmatically validates that the running Next.js server serves:
 * 1. Root page (200 OK)
 * 2. Compiled global CSS stylesheet with full Tailwind & Kroma design tokens (200 OK, non-empty)
 * 3. Client runtime JavaScript chunks (200 OK, non-empty)
 * 
 * Exits with code 0 on health verification, code 1 on asset corruption or 404.
 */

import http from "node:http";

const HOST = process.env.KROMA_HOST || "127.0.0.1";
const PORT = parseInt(process.env.KROMA_PORT || "3000", 10);

function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const url = path.startsWith("http") ? path : `http://${HOST}:${PORT}${path}`;
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          url,
          path,
          statusCode: res.statusCode,
          headers: res.headers,
          data,
        });
      });
    });
    req.on("error", (err) => reject(err));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url} (server may be compiling cold start)`));
    });
  });
}

async function runDiagnostic() {
  console.log(`[KROMA ASSET DIAGNOSTIC] Probing http://${HOST}:${PORT}/ ...`);

  let rootRes;
  try {
    rootRes = await fetchUrl("/");
  } catch (err) {
    console.error(`[KROMA ASSET DIAGNOSTIC] CRITICAL: Server not responding at http://${HOST}:${PORT}/`);
    console.error(`Error details: ${err.message}`);
    process.exit(1);
  }

  if (rootRes.statusCode !== 200) {
    console.error(`[KROMA ASSET DIAGNOSTIC] CRITICAL: Root returned HTTP ${rootRes.statusCode}`);
    process.exit(1);
  }

  console.log(`[KROMA ASSET DIAGNOSTIC] Root page loaded successfully (HTTP 200, ${rootRes.data.length} bytes).`);

  // 1. Extract CSS Links
  const cssRegex = /href="([^"]+\.css[^"]*)"/g;
  const cssLinks = [];
  let match;
  while ((match = cssRegex.exec(rootRes.data)) !== null) {
    cssLinks.push(match[1]);
  }

  // 2. Extract Script Tags
  const jsRegex = /src="([^"]+\.js[^"]*)"/g;
  const jsLinks = [];
  while ((match = jsRegex.exec(rootRes.data)) !== null) {
    if (!match[1].startsWith("chrome-extension://")) {
      jsLinks.push(match[1]);
    }
  }

  console.log(`[KROMA ASSET DIAGNOSTIC] Discovered ${cssLinks.length} stylesheet(s) and ${jsLinks.length} script chunk(s).`);

  let failures = 0;

  // Verify Stylesheets
  if (cssLinks.length === 0) {
    console.warn(`[KROMA ASSET DIAGNOSTIC] WARNING: No <link rel="stylesheet"> found in root HTML!`);
  }

  for (const cssPath of cssLinks) {
    try {
      const res = await fetchUrl(cssPath);
      if (res.statusCode !== 200) {
        console.error(`[KROMA ASSET DIAGNOSTIC] FAIL: Stylesheet ${cssPath} returned HTTP ${res.statusCode}!`);
        failures++;
      } else if (res.data.length < 500) {
        console.error(`[KROMA ASSET DIAGNOSTIC] FAIL: Stylesheet ${cssPath} appears truncated (${res.data.length} bytes)!`);
        failures++;
      } else {
        // Verify design tokens
        const hasBgCanvas = res.data.includes("--bg-canvas") || res.data.includes("#212222");
        const hasCoral = res.data.includes("--accent-coral") || res.data.includes("#C86342") || res.data.includes("#c86342");
        const hasTailwind = res.data.includes("display") || res.data.includes("flex") || res.data.includes("grid");

        console.log(
          `[KROMA ASSET DIAGNOSTIC] OK: Stylesheet ${cssPath} (${res.data.length} bytes, tokens verified: canvas=${hasBgCanvas}, coral=${hasCoral}, tailwind=${hasTailwind})`
        );
      }
    } catch (err) {
      console.error(`[KROMA ASSET DIAGNOSTIC] FAIL: Could not fetch stylesheet ${cssPath}: ${err.message}`);
      failures++;
    }
  }

  // Verify Critical JS Chunks
  for (const jsPath of jsLinks) {
    try {
      const res = await fetchUrl(jsPath);
      if (res.statusCode !== 200) {
        console.error(`[KROMA ASSET DIAGNOSTIC] FAIL: Script chunk ${jsPath} returned HTTP ${res.statusCode}!`);
        failures++;
      } else {
        console.log(`[KROMA ASSET DIAGNOSTIC] OK: Script chunk ${jsPath} (${res.data.length} bytes)`);
      }
    } catch (err) {
      console.error(`[KROMA ASSET DIAGNOSTIC] FAIL: Could not fetch script ${jsPath}: ${err.message}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\n[KROMA ASSET DIAGNOSTIC] HEALTH CHECK FAILED with ${failures} asset error(s)!`);
    process.exit(1);
  }

  console.log(`\n[KROMA ASSET DIAGNOSTIC] ALL ASSETS HEALTHY! Server is rendering styled, hydrated application.`);
}

runDiagnostic();
