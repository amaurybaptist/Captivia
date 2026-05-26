#!/usr/bin/env node
/**
 * Ouvre l'app déployée sur Vercel dans le navigateur.
 * Configure VERCEL_APP_URL dans .env à la racine (ex: https://captivia-xxx.vercel.app)
 * Usage: npm run vercel:open
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function loadEnv() {
  const files = ['.env', '.env.local', 'frontend/.env.local', 'frontend/.env'];
  for (const f of files) {
    const p = path.join(root, f);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8');
      for (const line of content.split('\n')) {
        const m = line.match(/^\s*VERCEL_APP_URL\s*=\s*(.+?)\s*$/);
        if (m) return m[1].replace(/^["']|["']$/g, '').trim();
      }
    }
  }
  return null;
}

const url = process.env.VERCEL_APP_URL || loadEnv();
if (!url) {
  console.log('VERCEL_APP_URL non configuré.');
  console.log('Ajoutez VERCEL_APP_URL=https://votre-app.vercel.app dans .env à la racine.');
  console.log('Vous pouvez récupérer l\'URL sur https://vercel.com/dashboard');
  process.exit(1);
}

const open = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
execSync(`${open} "${url}"`, { stdio: 'inherit' });
console.log('Ouvert:', url);
