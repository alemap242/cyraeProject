// Builds index.html from src/ (no dependencies — needs Node 18+).
//   node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const THREE_VERSION = '0.170.0';
const parts = ['p1_core.js', 'p2_env.js', 'p3_house.js', 'p4_systems.js', 'p5_ui.js'];

export function build() {
  const code = parts.map(f => readFileSync(join(root, 'src', f), 'utf8')).join('\n');
  const html = readFileSync(join(root, 'src', 'template.html'), 'utf8')
    .replace('__CODE__', () => code)
    .replace('__THREE__', `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js`)
    .replace('__ADDONS__', `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/`);
  writeFileSync(join(root, 'index.html'), html);
  return html.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(`built index.html (${(build() / 1024).toFixed(0)} KB)`);
}
