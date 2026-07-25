import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { ScoutEngine } from './server/engine/ScoutEngine';
import { ScoutEngineV4 } from './server/engine/ScoutEngineV4';
import axios from 'axios';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Use FSRS v4 engine if enabled, otherwise use legacy engine
const useFSRSv4 = process.env.FSRS_V4_MODE === 'true';
const engine = useFSRSv4 ? new ScoutEngineV4() : new ScoutEngine();

/* ── Proxy Image ── */
app.get('/api/proxy-image', async (req: any, res: any) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).send('No URL');
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': (() => { try { return new URL(url).origin; } catch { return 'https://www.google.com'; } })()
      }
    });
    res.set("Content-Type", String(response.headers["content-type"] || "image/png"));
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Access-Control-Allow-Origin", "*");
    res.send(response.data);
  } catch {
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    res.set("Content-Type", "image/png");
    res.send(transparentPng);
  }
});

app.get('/api/health', (_req: any, res: any) => res.json({ 
  status: 'ok', 
  version: useFSRSv4 ? '4.0.0-FSRS-v4-Data-Core' : '11.0-FSRS-Data-Engine',
  engine: useFSRSv4 ? 'FSRS-v4' : 'Legacy',
  timestamp: new Date().toISOString() 
}));

app.post('/api/scrape', async (req: any, res: any) => {
  try {
    const { playerName, team, targetClub } = req.body;
    if (!playerName) return res.status(400).json({ success: false, error: 'Eksik parametre' });

    const engineName = useFSRSv4 ? 'FSRS v4 Data Core' : 'FSRS Data Engine v11';
    console.log(`[${engineName}] Start: ${playerName} | ${team || ''}`);
    
    // Call the engine
    const playerData = await engine.generateReport(playerName, targetClub || team);

    res.json({ success: true, data: playerData });
  } catch (error: any) {
    console.error('Engine Endpoint Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ── Static + SPA ── */
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  app.get(/(.*)/, (_req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  import('vite').then(async ({ createServer }) => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  });
}

app.listen(PORT, () => {
  console.log(`FSRS Data Engine v11 running on port ${PORT}`);
});
