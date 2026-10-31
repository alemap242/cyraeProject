// Local preview server with auto-rebuild + auto-reload (no dependencies — needs Node 18+).
//   node dev.mjs        → open http://localhost:5173
import { createServer } from 'node:http';
import { readFileSync, existsSync, watch, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';
import { build } from './build.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
let version = Date.now();
const clients = new Set();

function rebuild() {
  try { build(); version = Date.now(); console.log(`[${new Date().toLocaleTimeString()}] rebuilt — reloading browser`); for (const res of clients) res.write(`data: ${version}\n\n`); }
  catch (e) { console.error('build failed:', e.message); }
}
rebuild();
let timer;
watch(join(root, 'src'), () => { clearTimeout(timer); timer = setTimeout(rebuild, 150); });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const reloadSnippet = `<script>new EventSource('/__reload').onmessage = () => location.reload();</script>`;

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
  }
  let file = normalize(join(root, url === '/' ? 'index.html' : url));
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  let body = readFileSync(file);
  if (file.endsWith('index.html')) body = body.toString().replace('</body>', reloadSnippet + '</body>');
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
}).listen(PORT, () => {
  console.log(`\n  Breathing Building Skin — preview running`);
  console.log(`  → http://localhost:${PORT}`);
  for (const ifs of Object.values(networkInterfaces())) for (const i of ifs || []) if (i.family === 'IPv4' && !i.internal) console.log(`  → http://${i.address}:${PORT}  (same Wi-Fi)`);
  console.log(`\n  Edit anything in src/ — the page rebuilds and reloads itself.\n`);
});
