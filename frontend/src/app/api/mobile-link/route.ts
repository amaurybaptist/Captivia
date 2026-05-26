import { NextResponse } from 'next/server';
import os from 'os';

/** Retourne l’IP locale du serveur et le lien pour ouvrir le site sur le téléphone (même Wi‑Fi). */
export async function GET() {
  const port = process.env.PORT || '3000';
  let ip = 'localhost';

  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      const interfaces = nets[name];
      if (!interfaces) continue;
      for (const net of interfaces) {
        if (net.family === 'IPv4' && !net.internal) {
          ip = net.address;
          break;
        }
      }
      if (ip !== 'localhost') break;
    }
  } catch {
    // keep localhost
  }

  const base = `http://${ip}:${port}`;
  return NextResponse.json({
    ip,
    port,
    url: base,
    urlFr: `${base}/fr`,
  });
}
