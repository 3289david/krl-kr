// Loads .env.local into process.env before starting Next.js standalone server
const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && val && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

// Sync static assets into standalone dir on every start so chunk hashes always match
const { execSync } = require('child_process');
const standaloneNext = path.join(__dirname, '.next', 'standalone', '.next');
const staticSrc = path.join(__dirname, '.next', 'static');
const staticDest = path.join(standaloneNext, 'static');
const buildIdSrc = path.join(__dirname, '.next', 'BUILD_ID');
const buildIdDest = path.join(standaloneNext, 'BUILD_ID');
// Clean up any leftover temp dirs from previous interrupted swaps
const standaloneNextDir = standaloneNext;
if (fs.existsSync(standaloneNextDir)) {
  for (const entry of fs.readdirSync(standaloneNextDir)) {
    if (entry.startsWith('static_tmp_')) {
      execSync(`rm -rf "${path.join(standaloneNextDir, entry)}"`);
    }
  }
}
if (fs.existsSync(staticSrc)) {
  try {
    fs.rmSync(staticDest, { recursive: true, force: true });
    execSync(`cp -r "${staticSrc}" "${staticDest}"`);
  } catch (e) {
    console.warn('[start-server] Static sync failed, starting with existing files:', e.message);
  }
}
if (fs.existsSync(buildIdSrc)) {
  fs.copyFileSync(buildIdSrc, buildIdDest);
}

require('./.next/standalone/server.js');
