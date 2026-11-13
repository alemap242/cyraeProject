import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ============================================================
   BREATHING BUILDING SKIN — BAHAMIAN HOUSE  (WebXR / Three.js)
   ============================================================ */

const G = 0.9;    // ground-floor level
const U = 4.3;    // upper-floor level
const CORE = { x0: 3, x1: 9, z0: -4.5, z1: 4.5, top: 8.2, cx: 6, cz: 0 };
const ROOF_R = 3.9, DRUM_H = 1.3, CONCH_H = 2.7;

const S = {
  roof: { p: 0, target: 0, paused: false },
  wall: { p: 0, target: 0 }, wallStill: true, wallT: 2.0,
  weather: 'breeze', time: 'dusk',
  xray: false, labels: true,
  fansOpen: true, allDoors: false,
};

/* ---------- renderer / scene / rig ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.7;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType('local-floor');
renderer.xr.setFoveation(0.6);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 4000);
const rig = new THREE.Group();
rig.add(camera);
scene.add(rig);
camera.position.set(0, 1.65, 0);
rig.position.set(26, 0, 6);   // start on the street looking at the house

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ---------- registries ---------- */
const walkables = [];      // meshes you can stand on
const colliders = [];      // {minX,maxX,minY,maxY,minZ,maxZ,on}
const blockers = [];       // meshes that stop the teleport arc
const interactives = [];   // meshes with userData.onSelect
const updaters = [];       // fn(dt, t)
const staticRoot = new THREE.Group(); scene.add(staticRoot);   // merged at the end
const dynRoot = new THREE.Group(); scene.add(dynRoot);
const labelsRoot = new THREE.Group(); scene.add(labelsRoot);

function addCollider(minX, maxX, minY, maxY, minZ, maxZ) {
  const c = { minX, maxX, minY, maxY, minZ, maxZ, on: true }; colliders.push(c); return c;
}

/* ---------- seeded random ---------- */
let _seed = 1234567;
function rnd() { _seed |= 0; _seed = _seed + 0x6D2B79F5 | 0; let t = Math.imul(_seed ^ _seed >>> 15, 1 | _seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const rr = (a, b) => a + (b - a) * rnd();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- canvas textures ---------- */
function canvasTex(w, h, draw, { rep = [1, 1], color = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h, c);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g, w, h, n, cols, smin = 0.5, smax = 1.8, amin = 0.05, amax = 0.25) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = rr(amin, amax); g.fillStyle = cols[(rnd() * cols.length) | 0];
    const s = rr(smin, smax); g.fillRect(rnd() * w, rnd() * h, s, s);
  }
  g.globalAlpha = 1;
}
function blotch(g, w, h, n, col, rmin, rmax, a) {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = rr(rmin, rmax);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    // wrap
    for (const [dx, dy] of [[w, 0], [-w, 0], [0, h], [0, -h]]) { g.save(); g.translate(dx, dy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
  }
}

const T = {};
T.stucco = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e9dbc0'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, 40, 'rgba(190,160,120,A)', 30, 120, 0.12);
  blotch(g, w, h, 30, 'rgba(255,248,230,A)', 30, 100, 0.18);
  speckle(g, w, h, 9000, ['#c9b48f', '#fff6e2', '#bfa77f']);
}, { rep: [0.5, 0.5] });

T.stone = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#a99677'; g.fillRect(0, 0, w, h);
  let y = 0;
  while (y < h) {
    const rh = Math.min(h - y, Math.round(rr(30, 70)));
    let x = -rr(0, 60);
    while (x < w) {
      const sw = rr(60, 170);
      const l = rr(70, 86), s = rr(18, 38), hu = rr(34, 46);
      g.fillStyle = `hsl(${hu},${s}%,${l}%)`;
      const pad = 3;
      g.fillRect(x + pad, y + pad, sw - pad * 2, rh - pad * 2);
      g.fillStyle = 'rgba(255,250,235,0.25)'; g.fillRect(x + pad, y + pad, sw - pad * 2, 4);
      g.fillStyle = 'rgba(90,70,40,0.18)'; g.fillRect(x + pad, y + rh - pad - 5, sw - pad * 2, 5);
      // weathering
      for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '150,120,80' : '255,245,225'},0.12)`; g.beginPath(); g.ellipse(x + rr(0, sw), y + rr(0, rh), rr(4, 20), rr(3, 10), 0, 0, 7); g.fill(); }
      x += sw;
    }
    y += rh;
  }
  speckle(g, w, h, 7000, ['#7a6648', '#fff4dc', '#c6b08a']);
}, { rep: [0.5, 0.5] });

T.terracotta = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#7d3a20'; g.fillRect(0, 0, w, h);
  const cols = 8, rows = 6, cw = w / cols, rh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const base = [rr(160, 200), rr(70, 105), rr(40, 60)];
    const x = c * cw, y = r * rh;
    const gr = g.createLinearGradient(x, 0, x + cw, 0);
    gr.addColorStop(0, `rgb(${base[0] * 0.55},${base[1] * 0.5},${base[2] * 0.5})`);
    gr.addColorStop(0.45, `rgb(${base[0]},${base[1]},${base[2]})`);
    gr.addColorStop(0.6, `rgb(${Math.min(255, base[0] * 1.12)},${base[1] * 1.1},${base[2] * 1.05})`);
    gr.addColorStop(1, `rgb(${base[0] * 0.5},${base[1] * 0.45},${base[2] * 0.45})`);
    g.fillStyle = gr; g.fillRect(x, y, cw, rh);
    g.fillStyle = 'rgba(40,15,5,0.45)'; g.fillRect(x, y + rh - 6, cw, 6);
    g.fillStyle = 'rgba(255,220,180,0.10)'; g.fillRect(x, y, cw, 5);
  }
  speckle(g, w, h, 5000, ['#3a1a0c', '#e9b38a', '#5b5040'], 0.5, 2, 0.05, 0.3);
}, { rep: [0.7, 0.7] });

function woodTex(base, dark, light, plank = 0, rep = [1, 1]) {
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      g.strokeStyle = rnd() < 0.5 ? dark : light; g.globalAlpha = rr(0.08, 0.35); g.lineWidth = rr(0.5, 2.5);
      const x = rnd() * w; g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * rr(1, 5), y);
      g.stroke();
    }
    g.globalAlpha = 1;
    if (plank) {
      const n = plank;
      for (let i = 0; i < n; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,230,190'},${rr(0.02, 0.1)})`; g.fillRect(i * w / n, 0, w / n, h);
        g.fillStyle = 'rgba(30,15,5,0.55)'; g.fillRect(i * w / n, 0, 2, h);
        const cut = rr(0, h); g.fillRect(i * w / n, cut, w / n, 2);
      }
    }
  }, { rep });
}
T.woodDark = woodTex('#4b2c1b', '#25140b', '#6e4329');
T.woodFloor = woodTex('#a8763f', '#6a4422', '#c99a60', 6, [0.6, 0.6]);
T.woodWarm = woodTex('#a06a3c', '#5e3a1e', '#c38b56');
T.shingle = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#8f6240'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 60; i++) { g.strokeStyle = rnd() < 0.5 ? '#6a4329' : '#b8875c'; g.globalAlpha = rr(0.15, 0.4); g.lineWidth = rr(0.5, 1.5); const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + rr(-4, 4), w * 0.6, y + rr(-4, 4), w, y + rr(-3, 3)); g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(90,70,50,0.55)'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
});

T.paver = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8e7a64'; g.fillRect(0, 0, w, h);
  const bw = 64, bh = 32;
  for (let y = 0; y < h; y += bh) for (let x = -((y / bh) % 2) * bw / 2; x < w; x += bw) {
    g.fillStyle = `hsl(${rr(20, 35)},${rr(18, 32)}%,${rr(62, 76)}%)`; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    g.fillStyle = 'rgba(255,240,220,0.18)'; g.fillRect(x + 2, y + 2, bw - 4, 3);
  }
  speckle(g, w, h, 6000, ['#5a4632', '#f2e2cc']);
}, { rep: [0.5, 0.5] });

T.flag = canvasTex(512, 512, (g, w, h) => {
  const pts = []; for (let i = 0; i < 26; i++) pts.push([rnd() * w, rnd() * h, `hsl(${rr(28, 42)},${rr(20, 40)}%,${rr(60, 78)}%)`]);
  const img = g.createImageData(w, h);
  const cache = pts.map(p => { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = p[2]; c.fillRect(0, 0, 1, 1); return c.getImageData(0, 0, 1, 1).data; });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let d1 = 1e9, d2 = 1e9, bi = 0;
    for (let i = 0; i < pts.length; i++) {
      let dx = Math.abs(x - pts[i][0]); dx = Math.min(dx, w - dx); let dy = Math.abs(y - pts[i][1]); dy = Math.min(dy, h - dy);
      const d = dx * dx + dy * dy; if (d < d1) { d2 = d1; d1 = d; bi = i; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1); const k = (y * w + x) * 4; const c = cache[bi];
    const m = edge < 3 ? 0.55 : 1;
    img.data[k] = c[0] * m; img.data[k + 1] = c[1] * m; img.data[k + 2] = c[2] * m; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  speckle(g, w, h, 6000, ['#5a4632', '#fff4e0']);
}, { rep: [0.4, 0.4] });

T.grass = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6b7f45'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, 60, 'rgba(150,140,80,A)', 20, 90, 0.25);
  blotch(g, w, h, 40, 'rgba(60,90,40,A)', 20, 90, 0.3);
  speckle(g, w, h, 30000, ['#4e6332', '#8fa35a', '#a89b62', '#3e5228'], 1, 3, 0.1, 0.4);
}, { rep: [12, 12] });
T.sand = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e8d6b0'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, 40, 'rgba(255,245,220,A)', 20, 90, 0.3);
  speckle(g, w, h, 30000, ['#cbb58b', '#fff7e6', '#b39b72'], 0.5, 1.5, 0.1, 0.4);
}, { rep: [20, 20] });
T.mulch = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5b4232'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 8000, ['#3a2a1e', '#7a5a40', '#8a8070'], 1, 4, 0.2, 0.7);
}, { rep: [2, 2] });
T.asphalt = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#5b5955'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 12000, ['#3a3936', '#7a7873', '#4a4845'], 0.5, 2, 0.2, 0.6);
}, { rep: [10, 1] });
T.concrete = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#bdb6aa'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 8000, ['#9a9388', '#d8d2c6'], 0.5, 2, 0.1, 0.4);
  g.fillStyle = 'rgba(80,75,70,0.4)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
}, { rep: [0.6, 0.6] });

T.sponge = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e6c25c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1600; i++) {
    const x = rnd() * w, y = rnd() * h, r = rr(2, 11);
    g.fillStyle = `rgba(150,105,25,${rr(0.4, 0.8)})`; g.beginPath(); g.ellipse(x, y, r, r * rr(0.6, 1), rnd() * 3, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,240,170,0.5)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); g.fill();
  }
});

T.seafan = canvasTex(256, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#f3e6cc'; g.lineCap = 'round';
  function br(x, y, ang, len, wd, d) {
    if (d > 7 || len < 4) return;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo((x + x2) / 2 + rr(-6, 6), (y + y2) / 2, x2, y2); g.stroke();
    const n = d < 2 ? 3 : 2;
    for (let i = 0; i < n; i++) br(x2, y2, ang + rr(-0.55, 0.55) + (i - (n - 1) / 2) * 0.35, len * rr(0.68, 0.85), wd * 0.72, d + 1);
  }
  br(w / 2, h - 6, -Math.PI / 2, 110, 12, 0);
  // palm leaf silhouettes at the top corners
  g.fillStyle = '#f3e6cc';
  for (const [x, y, a] of [[30, 40, 0.6], [w - 30, 60, 2.5]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(i * 9, (i % 2 ? 1 : -1) * 10, 16, 3, (i % 2 ? 1 : -1) * 0.8, 0, 7); g.fill(); }
    g.restore();
  }
  // lattice border
  g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
}, { rep: [1, 1] });

T.leaf = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#3f7a32'); gr.addColorStop(1, '#22501f');
  g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 6);
  g.bezierCurveTo(w * 0.98, h * 0.25, w * 0.9, h * 0.8, w / 2, h - 4);
  g.bezierCurveTo(w * 0.1, h * 0.8, w * 0.02, h * 0.25, w / 2, 6); g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (let i = 1; i < 7; i++) { const y = h * i / 8; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.04, y + 10); g.lineTo(w * 0.32, y); g.stroke(); g.beginPath(); g.moveTo(w * 0.96, y + 10); g.lineTo(w * 0.68, y); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#a3c47a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 8); g.lineTo(w / 2, h - 6); g.stroke();
}, {});
T.frond = canvasTex(128, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#5f6b2c'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  for (let y = 10; y < h; y += 9) {
    const L = (w / 2 - 4) * Math.sin(Math.PI * (y / h) * 0.95 + 0.1);
    g.strokeStyle = `hsl(${rr(80, 100)},${rr(35, 50)}%,${rr(28, 40)}%)`; g.lineWidth = 3;
    g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 - L * 0.6, y + 6, w / 2 - L, y + 22); g.stroke();
    g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + L * 0.6, y + 6, w / 2 + L, y + 22); g.stroke();
  }
}, {});

T.garage = canvasTex(512, 256, (g, w, h) => {
  g.drawImage(T.woodDark.image, 0, 0, w, h);
  g.fillStyle = 'rgba(40,20,10,0.25)'; g.fillRect(0, 0, w, h);
  for (let i = 1; i < 12; i++) { g.fillStyle = 'rgba(15,8,3,0.6)'; g.fillRect(i * w / 12, 0, 2, h); }
  g.fillStyle = 'rgba(15,8,3,0.7)'; g.fillRect(0, h * 0.28, w, 4); g.fillRect(w / 2 - 2, 0, 4, h);
  for (let i = 0; i < 4; i++) {
    const cx = w * (0.125 + i * 0.25), r = w * 0.09;
    g.fillStyle = '#2c3a40'; g.beginPath(); g.moveTo(cx - r, h * 0.26); g.arc(cx, h * 0.26, r, Math.PI, 0); g.closePath(); g.fill();
    const gr = g.createLinearGradient(cx - r, 0, cx + r, h * 0.2); gr.addColorStop(0, 'rgba(200,220,230,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = '#1b0f07'; g.lineWidth = 5; g.stroke();
  }
  g.fillStyle = '#111'; g.fillRect(w / 2 - 22, h * 0.55, 8, 26); g.fillRect(w / 2 + 14, h * 0.55, 8, 26);
}, { rep: [1, 1] });

T.door = canvasTex(256, 512, (g, w, h) => {
  g.drawImage(T.woodDark.image, 0, 0, w, h);
  g.fillStyle = 'rgba(20,10,4,0.3)'; g.fillRect(0, 0, w, h);
  const panels = [[0.12, 0.2, 0.76, 0.22], [0.12, 0.48, 0.76, 0.18], [0.12, 0.72, 0.76, 0.2]];
  for (const [x, y, pw, ph] of panels) {
    g.strokeStyle = 'rgba(10,5,2,0.8)'; g.lineWidth = 6; g.strokeRect(x * w, y * h, pw * w, ph * h);
    g.strokeStyle = 'rgba(160,110,70,0.35)'; g.lineWidth = 2; g.strokeRect(x * w + 8, y * h + 8, pw * w - 16, ph * h - 16);
    // carved rosette
    g.beginPath(); g.arc((x + pw / 2) * w, (y + ph / 2) * h, 18, 0, 7); g.stroke();
  }
  g.fillStyle = '#c9a25a'; g.beginPath(); g.arc(w * 0.85, h * 0.55, 7, 0, 7); g.fill();
});

T.plaque = canvasTex(512, 160, (g, w, h) => {
  g.fillStyle = '#f4efe3'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) {
    const x = i * w / 4;
    g.strokeStyle = '#1f3c7a'; g.lineWidth = 8; g.strokeRect(x + 6, 6, w / 4 - 12, h - 12);
    g.strokeStyle = '#c2862b'; g.lineWidth = 3; g.strokeRect(x + 16, 16, w / 4 - 32, h - 32);
    g.fillStyle = '#132c63'; g.font = 'bold 96px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('6435'[i], x + w / 8, h / 2 + 4);
  }
});

T.rug = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8c3b2c'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#e7d3a8'; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40);
  g.strokeStyle = '#1f3e5e'; g.lineWidth = 10; g.strokeRect(46, 46, w - 92, h - 92);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    const x = 90 + i * 83, y = 90 + j * 83;
    g.fillStyle = (i + j) % 2 ? '#e7d3a8' : '#1f3e5e';
    g.beginPath(); g.moveTo(x, y - 30); g.lineTo(x + 30, y); g.lineTo(x, y + 30); g.lineTo(x - 30, y); g.fill();
    g.fillStyle = '#c87b3a'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
  }
  speckle(g, w, h, 8000, ['#000', '#fff'], 1, 2, 0.03, 0.1);
});
T.rug2 = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#efe5cf'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#3b3027'; g.lineWidth = 4;
  for (let i = -8; i < 16; i++) { g.beginPath(); g.moveTo(i * 48, 0); g.lineTo(i * 48 + 256, h / 2); g.lineTo(i * 48, h); g.stroke(); }
  speckle(g, w, h, 8000, ['#000', '#c9b48f'], 1, 2, 0.03, 0.12);
});

// water normal map (tileable sum of sines)
T.waterN = (() => {
  const n = 256; const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  const img = g.createImageData(n, n); const H = new Float32Array(n * n);
  const waves = []; for (let i = 0; i < 14; i++) waves.push([((rnd() * 8) | 0) + 1, ((rnd() * 8) | 0) - 4, rnd() * 6.28, rr(0.3, 1)]);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let v = 0; for (const [a, b, p, amp] of waves) v += amp * Math.sin((a * x + b * y) * 2 * Math.PI / n + p); H[y * n + x] = v; }
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = H[y * n + (x + 1) % n] - H[y * n + (x - 1 + n) % n], dy = H[((y + 1) % n) * n + x] - H[((y - 1 + n) % n) * n + x];
    const v = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize(); const k = (y * n + x) * 4;
    img.data[k] = (v.x * 0.5 + 0.5) * 255; img.data[k + 1] = (v.y * 0.5 + 0.5) * 255; img.data[k + 2] = (v.z * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
})();


function leafCluster(w, h, n, drawLeaf) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * w * 0.42;
      const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.9;
      g.save(); g.translate(x, y); g.rotate(a + rr(-0.8, 0.8)); drawLeaf(g, i); g.restore();
    }
  });
}
T.olive = leafCluster(512, 512, 520, (g) => {
  const L = rr(26, 40), W = rr(4, 6.5); const top = rnd() < 0.55;
  g.fillStyle = top ? `hsl(${rr(78, 95)},${rr(14, 24)}%,${rr(30, 40)}%)` : `hsl(${rr(80, 100)},${rr(6, 12)}%,${rr(58, 70)}%)`;
  g.beginPath(); g.ellipse(L / 2, 0, L / 2, W / 2, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(70,60,40,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-4, 0); g.lineTo(L * 0.8, 0); g.stroke();
});
T.bougain = leafCluster(512, 512, 330, (g, i) => {
  if (i % 3 === 0) { // magenta bract trio
    for (let k = 0; k < 3; k++) { g.rotate(2.1); g.fillStyle = `hsl(${rr(318, 334)},${rr(60, 78)}%,${rr(38, 52)}%)`; g.beginPath(); g.ellipse(8, 0, 9, 6.5, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(90,10,50,0.35)'; g.lineWidth = 0.7; g.stroke(); }
    g.fillStyle = '#f2ead0'; g.beginPath(); g.arc(0, 0, 1.6, 0, 7); g.fill();
  } else { g.fillStyle = `hsl(${rr(95, 120)},${rr(30, 45)}%,${rr(20, 32)}%)`; g.beginPath(); g.ellipse(10, 0, 11, 6, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(160,190,120,0.35)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, 0); g.lineTo(20, 0); g.stroke(); }
});
T.lavender = leafCluster(256, 256, 150, (g, i) => {
  if (i % 2) { g.strokeStyle = `hsl(${rr(90, 110)},${rr(8, 16)}%,${rr(45, 58)}%)`; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(rr(18, 30), 0); g.stroke(); }
  else { g.strokeStyle = '#7d8a6a'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(26, 0); g.stroke(); for (let k = 0; k < 6; k++) { g.fillStyle = `hsl(${rr(255, 275)},${rr(28, 45)}%,${rr(48, 62)}%)`; g.beginPath(); g.arc(16 + k * 2.4, rr(-1, 1), 2.2, 0, 7); g.fill(); } }
});
T.palmRings = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#8b7b63'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += rr(9, 14)) { g.fillStyle = `rgba(60,48,34,${rr(0.4, 0.7)})`; g.fillRect(0, y, w, rr(2, 4)); g.fillStyle = 'rgba(200,185,160,0.25)'; g.fillRect(0, y + 4, w, 2); }
  speckle(g, w, h, 3000, ['#5a4a38', '#b8a88c'], 0.5, 2, 0.1, 0.4);
}, { rep: [3, 6] });
T.bark = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#6f6455'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) { g.strokeStyle = rnd() < 0.5 ? 'rgba(40,34,28,0.6)' : 'rgba(170,160,140,0.35)'; g.lineWidth = rr(1, 3); const x = rnd() * w; g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + rr(-5, 5), y); g.stroke(); }
}, { rep: [2, 2] });


/* ---------- driftwood pavilion decor ---------- */
T.planks = canvasTex(512, 512, (g, w, h) => {
  const bw = 41;
  for (let x = 0; x < w; x += bw) {
    const l = rr(70, 82), s = rr(10, 20), hu = rr(30, 40);
    g.fillStyle = `hsl(${hu},${s}%,${l}%)`; g.fillRect(x, 0, bw, h);
    for (let i = 0; i < 26; i++) { g.strokeStyle = rnd() < 0.6 ? `rgba(110,90,65,${rr(0.08, 0.28)})` : `rgba(255,250,240,${rr(0.1, 0.3)})`; g.lineWidth = rr(0.5, 1.6); const gx = x + rr(2, bw - 2); g.beginPath(); g.moveTo(gx, 0); for (let y = 0; y <= h; y += 24) g.lineTo(gx + Math.sin(y * 0.03 + i) * rr(0.5, 2.5), y); g.stroke(); }
    if (rnd() < 0.5) { g.fillStyle = 'rgba(90,70,50,0.35)'; g.beginPath(); g.ellipse(x + rr(8, bw - 8), rr(0, h), rr(3, 6), rr(6, 12), 0, 0, 7); g.fill(); }  // knot
    g.fillStyle = 'rgba(55,40,25,0.75)'; g.fillRect(x, 0, 2.5, h);                       // board gap
    g.fillStyle = 'rgba(255,250,240,0.25)'; g.fillRect(x + 2.5, 0, 1.5, h);
    for (const y of [40, 300]) { g.fillStyle = 'rgba(60,55,50,0.6)'; g.beginPath(); g.arc(x + bw / 2, y + rr(-8, 8), 1.8, 0, 7); g.fill(); }  // nails
  }
  speckle(g, w, h, 4000, ['#7a6a55', '#fff8ec'], 0.5, 1.5, 0.05, 0.2);
}, { rep: [0.5, 0.5] });
T.lime = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#f2ece0'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, 50, 'rgba(215,200,175,A)', 30, 140, 0.16);
  blotch(g, w, h, 30, 'rgba(255,255,250,A)', 30, 120, 0.25);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(200,185,160,${rr(0.05, 0.14)})`; g.lineWidth = rr(6, 18); g.beginPath(); const x = rnd() * w, y = rnd() * h; g.arc(x, y, rr(30, 90), rr(0, 6), rr(0, 6) + 1); g.stroke(); }
  speckle(g, w, h, 6000, ['#d8ccb4', '#ffffff']);
}, { rep: [0.5, 0.5] });
T.cedar = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#5d5448'; g.fillRect(0, 0, w, h);
  const rh = 46;
  for (let y = 0; y < h; y += rh) {
    let x = -rr(0, 40);
    while (x < w) { const sw = rr(28, 62); g.fillStyle = `hsl(${rr(25, 40)},${rr(6, 14)}%,${rr(52, 68)}%)`; g.fillRect(x + 1.5, y, sw - 3, rh + 10);
      for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(70,60,50,0.2)'; g.lineWidth = 0.8; const gx = x + rr(3, sw - 3); g.beginPath(); g.moveTo(gx, y); g.lineTo(gx + rr(-2, 2), y + rh); g.stroke(); }
      x += sw; }
    g.fillStyle = 'rgba(30,25,20,0.55)'; g.fillRect(0, y + rh - 5, w, 5);
  }
  speckle(g, w, h, 5000, ['#3a332b', '#c9c0b0'], 0.5, 2, 0.05, 0.3);
}, { rep: [0.7, 0.7] });
T.porous = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#efe3cc'; g.fillRect(0, 0, w, h);
  blotch(g, w, h, 30, 'rgba(205,185,150,A)', 20, 80, 0.25);
  speckle(g, w, h, 5000, ['#c9b48f', '#fff8e8']);
  g.globalCompositeOperation = 'destination-out';
  const holes = [];
  for (let i = 0; i < 2200 && holes.length < 150; i++) {
    const x = rr(10, w - 10), y = rr(10, h - 10), r = rr(9, 26);
    if (holes.every(([hx, hy, hr]) => Math.hypot(hx - x, hy - y) > hr + r + 7)) holes.push([x, y, r]);
  }
  for (const [x, y, r] of holes) { g.beginPath(); g.ellipse(x, y, r, r * rr(0.75, 1), rr(0, 3), 0, 7); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  for (const [x, y, r] of holes) { g.strokeStyle = 'rgba(150,120,80,0.55)'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.stroke(); }
}, { rep: [1.2, 1.2] });

/* ---------- materials ---------- */
const M = {
  stucco: new THREE.MeshStandardMaterial({ map: T.stucco, roughness: 0.92 }),
  stone: new THREE.MeshStandardMaterial({ map: T.stone, roughness: 0.88 }),
  terracotta: new THREE.MeshStandardMaterial({ map: T.terracotta, roughness: 0.75, side: THREE.DoubleSide }),
  woodDark: new THREE.MeshStandardMaterial({ map: T.woodDark, roughness: 0.6 }),
  woodFloor: new THREE.MeshStandardMaterial({ map: T.woodFloor, roughness: 0.55 }),
  woodWarm: new THREE.MeshStandardMaterial({ map: T.woodWarm, roughness: 0.55 }),
  iron: new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.55, metalness: 0.6 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd8dde2, roughness: 0.22, metalness: 1.0 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x9fc4cf, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  paver: new THREE.MeshStandardMaterial({ map: T.paver, roughness: 0.9 }),
  flag: new THREE.MeshStandardMaterial({ map: T.flag, roughness: 0.85 }),
  grass: new THREE.MeshStandardMaterial({ map: T.grass, roughness: 1 }),
  sand: new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1 }),
  mulch: new THREE.MeshStandardMaterial({ map: T.mulch, roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ map: T.concrete, roughness: 0.95 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xb4643c, roughness: 0.85 }),
  leaf: new THREE.MeshStandardMaterial({ map: T.leaf, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }),
  frond: new THREE.MeshStandardMaterial({ map: T.frond, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x6f7d58, roughness: 0.9, flatShading: true }),
  foliageDark: new THREE.MeshStandardMaterial({ color: 0x3f5a2e, roughness: 0.9, flatShading: true }),
  bark: new THREE.MeshStandardMaterial({ color: 0x6b5d4c, roughness: 1 }),
  palmBark: new THREE.MeshStandardMaterial({ color: 0x8a7a63, roughness: 1 }),
  flowerPink: new THREE.MeshStandardMaterial({ color: 0xc8327a, roughness: 0.8 }),
  flowerPurple: new THREE.MeshStandardMaterial({ color: 0x7b3c8f, roughness: 0.8 }),
  flowerOrange: new THREE.MeshStandardMaterial({ color: 0xd9682b, roughness: 0.8 }),
  lantern: new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: 0xffb347, emissiveIntensity: 0, roughness: 0.4 }),
  garage: new THREE.MeshStandardMaterial({ map: T.garage, roughness: 0.6 }),
  door: new THREE.MeshStandardMaterial({ map: T.door, roughness: 0.6 }),
  plaque: new THREE.MeshStandardMaterial({ map: T.plaque, roughness: 0.3 }),
  linen: new THREE.MeshStandardMaterial({ color: 0xe9e1cf, roughness: 0.95 }),
  sofa: new THREE.MeshStandardMaterial({ color: 0xcfc0a2, roughness: 0.95 }),
  cushionBlue: new THREE.MeshStandardMaterial({ color: 0x3f6f8c, roughness: 0.95 }),
  cushionRust: new THREE.MeshStandardMaterial({ color: 0xb4582f, roughness: 0.95 }),
  rug: new THREE.MeshStandardMaterial({ map: T.rug, roughness: 1 }),
  rug2: new THREE.MeshStandardMaterial({ map: T.rug2, roughness: 1 }),
  counter: new THREE.MeshStandardMaterial({ color: 0xe6dccb, roughness: 0.35 }),
  tileBlue: new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.4 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xf1ebe0, roughness: 0.3 }),
  fruitY: new THREE.MeshStandardMaterial({ color: 0xf0c430, roughness: 0.5 }),
  fruitO: new THREE.MeshStandardMaterial({ color: 0xe8781e, roughness: 0.5 }),
  fruitG: new THREE.MeshStandardMaterial({ color: 0x7aa53a, roughness: 0.5 }),
  fruitR: new THREE.MeshStandardMaterial({ color: 0xb3262a, roughness: 0.45 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x8d5a3b, roughness: 0.7 }),
  skin2: new THREE.MeshStandardMaterial({ color: 0xc58c64, roughness: 0.7 }),
  clothA: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.9 }),
  clothB: new THREE.MeshStandardMaterial({ color: 0x3c6a7a, roughness: 0.9 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x1b1310, roughness: 0.8 }),
  sponge: new THREE.MeshStandardMaterial({ map: T.sponge, roughness: 1 }),
  frp: new THREE.MeshStandardMaterial({ color: 0xeef3f2, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.55 }),
  lining: new THREE.MeshStandardMaterial({ color: 0xd8cbb2, roughness: 0.8 }),
  seafan: new THREE.MeshStandardMaterial({ map: T.seafan, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7 }),
  water: new THREE.MeshStandardMaterial({ color: 0x5fa5a8, roughness: 0.05, metalness: 0.1, normalMap: T.waterN, transparent: true, opacity: 0.85 }),
  lampShade: new THREE.MeshStandardMaterial({ color: 0xf3e2bf, emissive: 0xffc97a, emissiveIntensity: 0.0, roughness: 0.8, side: THREE.DoubleSide }),
  book: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
  bedding: new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.95 }),
  throwB: new THREE.MeshStandardMaterial({ color: 0x6d8a7d, roughness: 0.95 }),
  curtain: new THREE.MeshStandardMaterial({ color: 0xf5eedf, roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.88 }),
  arrow: new THREE.MeshBasicMaterial({ color: 0x3fa9ff, transparent: true, opacity: 0.85, depthWrite: false }),
  arrowWarm: new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.85, depthWrite: false }),
};
M.water.normalScale.set(0.4, 0.4);
for (const [m, s] of [[M.stucco, 1.2], [M.stone, 3.5], [M.terracotta, 2.5], [M.woodDark, 0.8], [M.woodFloor, 0.8], [M.woodWarm, 0.8], [M.paver, 2.5], [M.flag, 2.5], [M.concrete, 0.8], [M.asphalt, 1.0], [M.sponge, 3], [M.grass, 1.5], [M.sand, 0.8]]) { m.bumpMap = m.map; m.bumpScale = s; }
M.foliage = new THREE.MeshStandardMaterial({ map: T.olive, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
M.foliageDark = new THREE.MeshStandardMaterial({ map: T.bougain, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
M.lavender = new THREE.MeshStandardMaterial({ map: T.lavender, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 });
M.bark = new THREE.MeshStandardMaterial({ map: T.bark, bumpMap: T.bark, bumpScale: 3, roughness: 1 });
M.palmBark = new THREE.MeshStandardMaterial({ map: T.palmRings, bumpMap: T.palmRings, bumpScale: 4, roughness: 1 });
M.stucco.color.set(0xf2e8d8); M.terracotta.color.set(0xd9c2b0);
// --- driftwood pavilion decor: re-skin the house materials ---
M.stone.color.set(0xfff6ea);   // pale coral limestone base, steps & trims
T.diamond = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#3e2818'; g.fillRect(0, 0, w, h);
  const s = 128;   // 4 diamonds per metre
  const cells = [];
  for (let r = -1; r <= h / (s / 2) + 1; r++) for (let c2 = -1; c2 <= w / s + 1; c2++) cells.push([c2 * s + (r % 2 ? s / 2 : 0), r * s / 2]);
  cells.sort((A, B) => A[1] - B[1]);
  for (const [cx, cy] of cells) {
    const l = rr(38, 50), hu = rr(24, 30), sa = rr(34, 46);
    const gr = g.createLinearGradient(cx, cy - s / 2, cx, cy + s / 2);
    gr.addColorStop(0, `hsl(${hu},${sa}%,${l + 8}%)`); gr.addColorStop(0.75, `hsl(${hu},${sa}%,${l}%)`); gr.addColorStop(1, `hsl(${hu},${sa}%,${l - 16}%)`);
    g.fillStyle = gr; g.beginPath(); g.moveTo(cx, cy - s / 2 - 2); g.lineTo(cx + s / 2 + 2, cy); g.lineTo(cx, cy + s / 2 + 2); g.lineTo(cx - s / 2 - 2, cy); g.closePath(); g.fill();
    g.save(); g.clip();
    for (let k = 0; k < 14; k++) { g.strokeStyle = rnd() < 0.5 ? 'rgba(70,45,25,0.25)' : 'rgba(255,230,190,0.18)'; g.lineWidth = rr(0.6, 1.6); const yy = cy + rr(-s / 2, s / 2); g.beginPath(); g.moveTo(cx - s / 2, yy); g.bezierCurveTo(cx - s / 6, yy + rr(-3, 3), cx + s / 6, yy + rr(-3, 3), cx + s / 2, yy + rr(-2, 2)); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(40,25,12,0.75)'; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = 'rgba(30,18,8,0.35)'; g.beginPath(); g.moveTo(cx - s / 2, cy); g.lineTo(cx, cy + s / 2); g.lineTo(cx + s / 2, cy); g.lineTo(cx, cy + s / 2 - 5); g.closePath(); g.fill();   // overlap shadow
  }
}, { rep: [1, 1] });
T.cement = canvasTex(512, 512, (g, w, h) => {
  const s = 128;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const x = c * s, y = r * s;
    g.fillStyle = '#f1ebdf'; g.fillRect(x, y, s, s);
    g.fillStyle = '#244a6b';
    for (const [ax, ay] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(x + ax, y + ay, s * 0.32, 0, 7); g.fill(); }
    g.fillStyle = '#f1ebdf'; for (const [ax, ay] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(x + ax, y + ay, s * 0.2, 0, 7); g.fill(); }
    g.fillStyle = '#c4703f'; for (const [ax, ay] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.beginPath(); g.arc(x + ax, y + ay, s * 0.1, 0, 7); g.fill(); }
    g.fillStyle = '#5f9aa0'; g.beginPath(); g.moveTo(x + s / 2, y + s * 0.22); g.lineTo(x + s * 0.78, y + s / 2); g.lineTo(x + s / 2, y + s * 0.78); g.lineTo(x + s * 0.22, y + s / 2); g.closePath(); g.fill();
    g.fillStyle = '#f1ebdf'; g.beginPath(); g.arc(x + s / 2, y + s / 2, s * 0.1, 0, 7); g.fill();
    g.strokeStyle = 'rgba(80,70,60,0.5)'; g.lineWidth = 2; g.strokeRect(x, y, s, s);
  }
  speckle(g, w, h, 6000, ['#000', '#fff'], 0.5, 1.5, 0.03, 0.12);
}, { rep: [1.25, 1.25] });
T.zellige = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#e8e1d4'; g.fillRect(0, 0, w, h);
  const s = 64; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { g.fillStyle = `hsl(${rr(195, 210)},${rr(45, 65)}%,${rr(32, 50)}%)`; g.fillRect(x + 2, y + 2, s - 4, s - 4); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 4, y + 4, s * 0.4, 4); }
}, { rep: [4, 4] });
T.rattan = canvasTex(256, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.lineWidth = 6;
  for (let i = -w; i < w * 2; i += 22) { g.strokeStyle = '#c69a5e'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.strokeStyle = '#b3864d'; g.beginPath(); g.moveTo(i, h); g.lineTo(i + h, 0); g.stroke(); }
}, { rep: [3, 3] });
function artTex(kind) {
  return canvasTex(512, 384, (g, w, h) => {
    if (kind === 0) { // turquoise seascape at sunset
      let gr = g.createLinearGradient(0, 0, 0, h * 0.55); gr.addColorStop(0, '#f6c79a'); gr.addColorStop(1, '#f39b7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h * 0.55);
      g.fillStyle = '#ffe2a8'; g.beginPath(); g.arc(w * 0.62, h * 0.48, 34, 0, 7); g.fill();
      gr = g.createLinearGradient(0, h * 0.55, 0, h); gr.addColorStop(0, '#3fb3b8'); gr.addColorStop(1, '#1f6f8f'); g.fillStyle = gr; g.fillRect(0, h * 0.55, w, h * 0.45);
      for (let i = 0; i < 40; i++) { g.strokeStyle = 'rgba(255,240,220,0.35)'; g.lineWidth = 2; const y = h * 0.58 + rnd() * h * 0.4; g.beginPath(); g.moveTo(rnd() * w, y); g.lineTo(rnd() * w, y); g.stroke(); }
    } else if (kind === 1) { // palm fronds, botanical print
      g.fillStyle = '#efe6d2'; g.fillRect(0, 0, w, h);
      for (let k = 0; k < 5; k++) { g.save(); g.translate(w * (0.2 + k * 0.15), h); g.rotate(-0.6 + k * 0.3); g.strokeStyle = '#2f5d3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -h * 0.85); g.stroke();
        for (let y = 20; y < h * 0.85; y += 12) { g.lineWidth = 3; g.strokeStyle = k % 2 ? '#3f7a4a' : '#2f6a3e'; g.beginPath(); g.moveTo(0, -y); g.lineTo(-60 * Math.sin(y / h * 3), -y + 30); g.moveTo(0, -y); g.lineTo(60 * Math.sin(y / h * 3), -y + 30); g.stroke(); } g.restore(); }
    } else { // conch spiral study
      g.fillStyle = '#f3e9d6'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b06a4a'; g.lineWidth = 3;
      for (let i = 0; i < 260; i++) { const a = i * 0.12, r = 2 + i * 0.62; g.beginPath(); g.arc(w / 2 + Math.cos(a) * r * 0.3, h / 2 + Math.sin(a) * r * 0.3, r * 0.06 + 1, 0, 7); g.stroke(); }
      g.strokeStyle = '#2b4f6a'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 300; i++) { const a = i * 0.08, r = Math.exp(a * 0.12) * 3; const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    }
  });
}
M.cement = new THREE.MeshStandardMaterial({ map: T.cement, roughness: 0.55 });
M.zellige = new THREE.MeshStandardMaterial({ map: T.zellige, roughness: 0.15, metalness: 0.05 });
M.rattan = new THREE.MeshStandardMaterial({ map: T.rattan, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.8 });
M.rattanSolid = new THREE.MeshStandardMaterial({ color: 0xc69a5e, roughness: 0.85 });
M.brass = new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.8, roughness: 0.35 });
M.art = [0, 1, 2].map(k => new THREE.MeshStandardMaterial({ map: artTex(k), roughness: 0.8 }));
M.diamond = new THREE.MeshStandardMaterial({ map: T.diamond, bumpMap: T.diamond, bumpScale: 4, roughness: 0.7 });
M.stucco.map = T.lime; M.stucco.bumpMap = T.lime; M.stucco.bumpScale = 0.8; M.stucco.color.set(0xffffff);
M.terracotta.map = T.cedar; M.terracotta.bumpMap = T.cedar; M.terracotta.bumpScale = 3; M.terracotta.color.set(0xffffff); M.terracotta.roughness = 0.9;
M.flag.color.set(0xf4efe6);
M.porous = new THREE.MeshStandardMaterial({ map: T.porous, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, bumpMap: T.porous, bumpScale: 2 });
M.porousCore = new THREE.MeshStandardMaterial({ color: 0x7a6447, roughness: 1 });
M.rail = new THREE.MeshStandardMaterial({ map: T.planks, color: 0xe9e0d0, roughness: 0.7 });
M.lantern.color.set(0xffe2a8);
M.door.color.set(0xd9c7ae); M.garage.color.set(0xd9c7ae); M.woodDark.color.set(0xb89d82);
/* slender limewash column with turned timber base + capital (Bahamian veranda style) */
const _colGeo = new THREE.LatheGeometry([[0, 0], [0.5, 0], [0.5, 0.04], [0.42, 0.08], [0.4, 0.5], [0.36, 0.97], [0.44, 1.0], [0, 1.0]].map(q => new THREE.Vector2(q[0], q[1])), 24);
function pillar(w, h, d, x, y, z, o = {}) {
  const r = Math.min(w, d) * 0.5;
  const shaft = new THREE.Mesh(_colGeo, M.stucco); shaft.scale.set(r * 1.6, h - 0.3, r * 1.6); shaft.position.set(x, y + 0.15, z);
  shaft.castShadow = true; shaft.receiveShadow = true; staticRoot.add(shaft);
  box(r * 2.4, 0.15, r * 2.4, M.woodWarm, x, y, z);                     // timber plinth
  box(r * 2.6, 0.15, r * 2.6, M.woodWarm, x, y + h - 0.15, z);          // timber capital
  if (o.collide) addCollider(x - r, x + r, y, y + h, z - r, z + r);
  return shaft;
}
/* soft sea-blue Bahama shutters (louvered), shown open beside a window */
T.louver = canvasTex(128, 256, (g, w, h) => {
  g.fillStyle = '#86b9bb'; g.fillRect(0, 0, w, h);
  for (let y = 10; y < h - 8; y += 9) { g.fillStyle = 'rgba(30,60,70,0.35)'; g.fillRect(8, y + 5, w - 16, 3); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(8, y, w - 16, 2); }
  g.strokeStyle = '#5f8f92'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  speckle(g, w, h, 1500, ['#4f7a7c', '#d9ecea'], 0.5, 1.5, 0.05, 0.3);
});
M.shutter = new THREE.MeshStandardMaterial({ map: T.louver, roughness: 0.65 });
function shutters(c, y0, ww, hh, face, axis = 'x') {
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(ww / 2 + 0.05, hh, 0.04), M.shutter); m.castShadow = true;
    if (axis === 'x') m.position.set(c + s * (ww * 0.75 + 0.1), y0 + hh / 2, face); else { m.rotation.y = Math.PI / 2; m.position.set(face, y0 + hh / 2, c + s * (ww * 0.75 + 0.1)); }
    staticRoot.add(m);
  }
}
/* planter box with flowers under a window */
function windowBox(c, y, face, ww, axis = 'x') {
  if (axis === 'x') { box(ww + 0.2, 0.22, 0.25, M.woodWarm, c, y, face); foliage(M.foliageDark, c, y + 0.3, face, ww / 2, 0.15, 0.15, 18, 0.22, 0.35); }
  else { box(0.25, 0.22, ww + 0.2, M.woodWarm, face, y, c); foliage(M.foliageDark, face, y + 0.3, c, 0.15, 0.15, ww / 2, 18, 0.22, 0.35); }
}
/* festoon string lights (glow at dusk / night) */
const _bulbGeo = new THREE.SphereGeometry(0.045, 8, 6);
function stringLights(a, b, sag = 0.4, n = 14) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b); const pts = [];
  for (let i = 0; i <= 24; i++) { const t = i / 24; const p = A.clone().lerp(B, t); p.y -= sag * 4 * t * (1 - t); pts.push(p); }
  tube(pts, 0.006, M.iron, { seg: 24, rs: 3, cast: false, parent: dynRoot });
  const inst = new THREE.InstancedMesh(_bulbGeo, M.lantern, n); const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const p = A.clone().lerp(B, t); p.y -= sag * 4 * t * (1 - t) + 0.06; m4.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(i, m4); }
  dynRoot.add(inst);
}
/* leaf-card foliage: many alpha-textured cards scattered in an ellipsoid */
const _cardGeo = new THREE.PlaneGeometry(1, 1);
function foliage(mat, cx, cy, cz, rx, ry, rz, n, smin, smax, parent) {
  const inst = new THREE.InstancedMesh(_cardGeo, mat, n); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    let x, y, z; do { x = rr(-1, 1); y = rr(-1, 1); z = rr(-1, 1); } while (x * x + y * y + z * z > 1);
    e.set(rr(-1.3, 1.3), rnd() * Math.PI * 2, rr(-0.6, 0.6)); q.setFromEuler(e); const s = rr(smin, smax);
    m4.compose(new THREE.Vector3(cx + x * rx, cy + y * ry, cz + z * rz), q, new THREE.Vector3(s, s, s)); inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true; inst.receiveShadow = true; (parent || dynRoot).add(inst); return inst;
}

/* ---------- geometry helpers ---------- */
function worldUV(geo, s = 1) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u * s, v * s);
  }
  uv.needsUpdate = true; return geo;
}
// box with centre x,z and BOTTOM at y
function box(w, h, d, mat, x, y, z, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d); if (o.uv !== false) worldUV(g);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y + h / 2, z);
  if (o.ry) m.rotation.y = o.ry;
  m.castShadow = o.cast !== false; m.receiveShadow = true;
  (o.parent || (o.dyn ? dynRoot : staticRoot)).add(m);
  if (o.walk) { walkables.push(m); m.userData.keep = true; }
  if (o.collide) addCollider(x - w / 2, x + w / 2, y, y + h, z - d / 2, z + d / 2);
  if (o.block) blockers.push(m);
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, o = {}) {
  const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 16, 1, !!o.open);
  const m = new THREE.Mesh(g, mat); m.position.set(x, y + h / 2, z);
  m.castShadow = o.cast !== false; m.receiveShadow = true;
  (o.parent || (o.dyn ? dynRoot : staticRoot)).add(m);
  if (o.collide) addCollider(x - rb, x + rb, y, y + h, z - rb, z + rb);
  return m;
}
function sphere(r, mat, x, y, z, o = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, o.seg || 12, o.seg ? o.seg * 0.75 : 9), mat);
  m.position.set(x, y, z); if (o.scale) m.scale.set(...o.scale);
  m.castShadow = o.cast !== false; m.receiveShadow = true;
  (o.parent || (o.dyn ? dynRoot : staticRoot)).add(m); return m;
}
function tube(points, r, mat, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => p.isVector3 ? p : new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg || Math.max(8, points.length * 6), r, o.rs || 6, false), mat);
  m.castShadow = o.cast !== false; m.receiveShadow = true;
  (o.parent || (o.dyn ? dynRoot : staticRoot)).add(m); return m;
}

/* wall along an axis, with arched / rectangular openings.
   axis 'x': runs a..b along x at z=c ; axis 'z': runs a..b along z at x=c */
const SKIN_PANELS = [];
M.skinBack = new THREE.MeshStandardMaterial({ color: 0x4a3b2e, emissive: 0xffa04a, emissiveMap: T.perf, emissiveIntensity: 0, roughness: 0.95 });
function wall(axis, a, b, c, y0, h, t, mat, openings = [], o = {}) {
  const len = b - a;
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, h); shape.lineTo(0, h); shape.closePath();
  const holes = [];
  for (const op of openings) {
    const x0 = op.c - a - op.w / 2, x1 = x0 + op.w, yb = op.y || 0, yt = yb + op.h;
    const hole = new THREE.Path();
    if (op.arch) { const r = op.w / 2; hole.moveTo(x0, yb); hole.lineTo(x1, yb); hole.lineTo(x1, yt - r); hole.absarc(x0 + r, yt - r, r, 0, Math.PI, false); hole.lineTo(x0, yb); }
    else { hole.moveTo(x0, yb); hole.lineTo(x1, yb); hole.lineTo(x1, yt); hole.lineTo(x0, yt); hole.lineTo(x0, yb); }
    shape.holes.push(hole); holes.push({ hole, op });
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 14 });
  geo.translate(0, 0, -t / 2);
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  if (o.clad) {   // kinetic diamond-scale skin on the exterior face: glowing backing now, tiles added by SKIN (p4)
    const cg = new THREE.ShapeGeometry(shape, 14); cg.translate(0, 0, o.clad * (t / 2 + 0.008));
    if (o.clad < 0) { const idx = cg.index.array; for (let i = 0; i < idx.length; i += 3) { const tmp = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = tmp; } }
    cg.computeVertexNormals();
    const uvA = cg.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) / 3, uvA.getY(i) / 3);
    const cm = new THREE.Mesh(cg, M.skinBack); cm.receiveShadow = true;
    const W = new THREE.Object3D();
    (axis === 'x') ? (cm.position.set(a, y0, c), W.position.set(a, y0, c)) : (cm.rotation.y = W.rotation.y = -Math.PI / 2, cm.position.set(c, y0, a), W.position.set(c, y0, a));
    dynRoot.add(cm); W.updateMatrix();
    SKIN_PANELS.push({ W: W.matrix.clone(), Wq: W.quaternion.clone(), len, h, t, clad: o.clad, ops: openings.map(op => ({ x0: op.c - a - op.w / 2, x1: op.c - a + op.w / 2, yb: op.y || 0, yt: (op.y || 0) + op.h, arch: op.arch, r: op.w / 2, cx: op.c - a })) });
    const tb = new THREE.Mesh(new THREE.BoxGeometry(len, 0.14, 0.12), M.stone); tb.position.set(len / 2, h - 0.07, o.clad * (t / 2 + 0.06));
    const bb = tb.clone(); bb.position.y = 0.07; const tg = new THREE.Group(); tg.add(tb, bb);
    (axis === 'x') ? tg.position.set(a, y0, c) : (tg.rotation.y = -Math.PI / 2, tg.position.set(c, y0, a));
    (o.parent || staticRoot).add(tg);
  }
  const place = (obj) => { if (axis === 'x') obj.position.set(a, y0, c); else { obj.rotation.y = -Math.PI / 2; obj.position.set(c, y0, a); } };
  place(m); (o.parent || staticRoot).add(m); blockers.push(m);
  // glass + frames in window openings
  for (const { hole, op } of holes) {
    if (op.glass === false) continue;
    if ((op.y || 0) < 0.05 && !op.glass) continue;   // doors: no glass by default
    const sg = new THREE.ShapeGeometry(new THREE.Shape(hole.getPoints(16)));
    const gm = new THREE.Mesh(sg, M.glass); place(gm); gm.renderOrder = 2; (o.parent || dynRoot).add(gm);
    // dark wood frame
    const fr = new THREE.Shape(hole.getPoints(16)); const inner = new THREE.Path(hole.getPoints(16).map(p => {
      const cx = op.c - a, cy = (op.y || 0) + op.h / 2; return new THREE.Vector2(cx + (p.x - cx) * 0.94, cy + (p.y - cy) * 0.96);
    })); fr.holes.push(inner);
    const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(fr, { depth: 0.06, bevelEnabled: false }), M.woodDark);
    fm.geometry.translate(0, 0, -0.03); place(fm); fm.castShadow = false; (o.parent || staticRoot).add(fm);
    if (op.mullion) { // vertical + horizontal muntins
      const mb = new THREE.Mesh(new THREE.BoxGeometry(0.04, op.h * 0.96, 0.05), M.woodDark);
      mb.position.set(op.c - a, (op.y || 0) + op.h / 2, 0); const grp = new THREE.Group(); grp.add(mb);
      const hb = new THREE.Mesh(new THREE.BoxGeometry(op.w * 0.94, 0.04, 0.05), M.woodDark); hb.position.set(op.c - a, (op.y || 0) + op.h * 0.55, 0); grp.add(hb);
      place(grp); (o.parent || staticRoot).add(grp);
    }
  }
  // colliders: solid spans, door openings (y≈0) left open
  if (o.collide !== false) {
    const doors = openings.filter(op => (op.y || 0) < 0.05).map(op => [op.c - op.w / 2, op.c + op.w / 2]).sort((p, q) => p[0] - q[0]);
    let s = a; const spans = [];
    for (const [d0, d1] of doors) { if (d0 > s) spans.push([s, d0]); s = Math.max(s, d1); }
    if (s < b) spans.push([s, b]);
    for (const [s0, s1] of spans) {
      if (axis === 'x') addCollider(s0, s1, y0, y0 + h, c - t / 2 - 0.05, c + t / 2 + 0.05);
      else addCollider(c - t / 2 - 0.05, c + t / 2 + 0.05, y0, y0 + h, s0, s1);
    }
  }
  return m;
}

/* hip roof over rectangle, eave y, rise h */
function hipRoof(x0, x1, z0, z1, y, h, mat) {
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2;
  const longZ = d >= w; const half = (longZ ? w : d) / 2;
  let ridgeA, ridgeB;
  if (longZ) { ridgeA = [cx, y + h, z0 + half]; ridgeB = [cx, y + h, z1 - half]; }
  else { const cz = (z0 + z1) / 2; ridgeA = [x0 + half, y + h, cz]; ridgeB = [x1 - half, y + h, cz]; }
  const A = [x0, y, z0], B = [x1, y, z0], C = [x1, y, z1], D = [x0, y, z1];
  const tris = longZ
    ? [[A, B, ridgeA], [C, D, ridgeB], [B, C, ridgeB], [B, ridgeB, ridgeA], [D, A, ridgeA], [D, ridgeA, ridgeB]]
    : [[A, B, ridgeB], [A, ridgeB, ridgeA], [B, C, ridgeB], [C, D, ridgeA], [C, ridgeA, ridgeB], [D, A, ridgeA]];
  const pos = [], uv = [];
  for (const tri of tris) {
    const [p, q, r] = tri.map(v => new THREE.Vector3(...v));
    const n = new THREE.Vector3().subVectors(q, p).cross(new THREE.Vector3().subVectors(r, p)).normalize();
    const flip = n.y < 0; const order = flip ? [p, r, q] : [p, q, r];
    const horiz = new THREE.Vector3(n.z, 0, -n.x).normalize(); if (horiz.lengthSq() < 0.01) horiz.set(1, 0, 0);
    for (const v of order) {
      pos.push(v.x, v.y, v.z);
      const up = new THREE.Vector3().crossVectors(n, horiz);
      uv.push(v.dot(horiz), v.dot(up));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; staticRoot.add(m);
  // eave fascia + rafter tails
  const fas = (fx, fz, len, rot) => { const b = box(len, 0.18, 0.12, M.woodDark, fx, y - 0.18, fz, { ry: rot }); };
  fas(cx, z0, w, 0); fas(cx, z1, w, 0); fas(x0, (z0 + z1) / 2, d, Math.PI / 2); fas(x1, (z0 + z1) / 2, d, Math.PI / 2);
  for (let x = x0 + 0.3; x < x1; x += 0.6) { box(0.08, 0.12, 0.5, M.woodDark, x, y - 0.3, z0 + 0.25); box(0.08, 0.12, 0.5, M.woodDark, x, y - 0.3, z1 - 0.25); }
  return m;
}

/* simple potted plant */
function pottedPlant(x, y, z, s = 1, kind = 0, parent) {
  const grp = new THREE.Group(); grp.position.set(x, y, z); grp.scale.setScalar(s); (parent || staticRoot).add(grp);
  const pts = [[0, 0], [0.16, 0], [0.2, 0.05], [0.24, 0.38], [0.27, 0.4], [0.27, 0.44], [0, 0.44]].map(p => new THREE.Vector2(...p));
  const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), M.pot); pot.castShadow = true; pot.receiveShadow = true; grp.add(pot);
  if (kind === 0) { // tropical leaves
    for (let i = 0; i < 9; i++) {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.55), M.leaf);
      const a = i / 9 * Math.PI * 2; lf.position.set(Math.cos(a) * 0.1, 0.7 + rr(-0.05, 0.25), Math.sin(a) * 0.1);
      lf.rotation.set(rr(-0.7, -0.3), -a + Math.PI / 2, 0, 'YXZ'); lf.rotation.y = a; lf.rotation.x = -0.6; lf.castShadow = true; grp.add(lf);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.4), M.foliageDark); st.position.set(Math.cos(a) * 0.05, 0.6, Math.sin(a) * 0.05); grp.add(st);
    }
  } else if (kind === 1) { // olive / shrub ball
    foliage(M.foliage, 0, 0.82, 0, 0.3, 0.28, 0.3, 26, 0.3, 0.5, grp);
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.5), M.bark); tr.position.y = 0.55; grp.add(tr);
  } else { // flowering cascade
    foliage(M.foliageDark, 0, 0.58, 0, 0.36, 0.22, 0.36, 26, 0.28, 0.45, grp);
  }
  return grp;
}

/* climbing vines with bougainvillea flowers along a set of points */
function vine(points, flowers = 40) {
  tube(points, 0.025, M.bark, { cast: false });
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const leaves = new THREE.InstancedMesh(_cardGeo, M.foliageDark, flowers);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  for (let i = 0; i < flowers; i++) {
    const p = curve.getPoint(rnd()); p.x += rr(-0.18, 0.18); p.y += rr(-0.18, 0.18); p.z += rr(-0.12, 0.12);
    s.setScalar(rr(0.3, 0.6)); q.setFromEuler(new THREE.Euler(rr(-1, 1), rnd() * 6.3, rr(-0.5, 0.5))); m4.compose(p, q, s); leaves.setMatrixAt(i, m4);
  }
  leaves.castShadow = true; dynRoot.add(leaves);
}

/* wall lantern — returns the glass mesh */
const lanternLights = [];
function lantern(x, y, z, ry = 0, withLight = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; dynRoot.add(g);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), M.iron); arm.position.set(0, 0.25, 0.11); g.add(arm);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.34, 6), M.lantern); body.position.set(0, 0.05, 0.24); g.add(body);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.14, 6), M.iron); cap.position.set(0, 0.29, 0.24); g.add(cap);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.105, 0.34, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0x1d1a17, wireframe: true })); cage.position.copy(body.position); g.add(cage);
  if (withLight) {
    const L = new THREE.PointLight(0xffb45a, 0, 9, 1.6); L.position.set(0, 0.05, 0.45); g.add(L); lanternLights.push(L);
  }
  return g;
}

/* iron railing between two points (balusters + top rail) */
function railing(a, b, h = 1.0, spacing = 0.13) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const len = A.distanceTo(B); const n = Math.max(2, Math.round(len / spacing));
  box(len, 0.06, 0.09, M.rail, (A.x + B.x) / 2, Math.min(A.y, B.y) + h - 0.03, (A.z + B.z) / 2, { ry: -Math.atan2(B.z - A.z, B.x - A.x), dyn: true, uv: false });
  box(len, 0.05, 0.05, M.rail, (A.x + B.x) / 2, Math.min(A.y, B.y) + 0.08, (A.z + B.z) / 2, { ry: -Math.atan2(B.z - A.z, B.x - A.x), dyn: true, uv: false });
  const bg = new THREE.BoxGeometry(0.035, h, 0.035);
  const inst = new THREE.InstancedMesh(bg, M.rail, n + 1); const m4 = new THREE.Matrix4();
  for (let i = 0; i <= n; i++) { const p = A.clone().lerp(B, i / n); m4.makeTranslation(p.x, p.y + h / 2, p.z); inst.setMatrixAt(i, m4); }
  dynRoot.add(inst);
  // collider (thin)
  const minX = Math.min(A.x, B.x) - 0.06, maxX = Math.max(A.x, B.x) + 0.06, minZ = Math.min(A.z, B.z) - 0.06, maxZ = Math.max(A.z, B.z) + 0.06;
  if (Math.abs(A.y - B.y) < 0.05) addCollider(minX, maxX, A.y, A.y + h, minZ, maxZ);
}
