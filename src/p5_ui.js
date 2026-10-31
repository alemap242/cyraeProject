/* ============================================================
   LABELS (hand-drafted style), X-RAY SECTION, EXPLODED VIEW
   ============================================================ */
try { await Promise.race([document.fonts.load("600 60px Caveat"), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
const HAND = "'Caveat', 'Segoe Print', 'Bradley Hand', cursive";
const INK = '#3a2614';
function drawLabel(g, w, h, lines, opt) {
  g.clearRect(0, 0, w, h);
  g.fillStyle = opt.bg || 'rgba(246,236,212,0.9)';
  const r = 26; g.beginPath(); g.moveTo(r, 4); g.lineTo(w - r, 4); g.quadraticCurveTo(w - 4, 4, w - 4, r); g.lineTo(w - 4, h - r); g.quadraticCurveTo(w - 4, h - 4, w - r, h - 4); g.lineTo(r, h - 4); g.quadraticCurveTo(4, h - 4, 4, h - r); g.lineTo(4, r); g.quadraticCurveTo(4, 4, r, 4); g.fill();
  g.strokeStyle = 'rgba(58,38,20,0.55)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = INK; g.textBaseline = 'middle'; g.textAlign = 'center';
  const lh = h / lines.length;
  lines.forEach((ln, i) => {
    const bold = i === 0 && opt.title;
    g.font = `${bold ? 700 : 500} ${Math.round(lh * (bold ? 0.72 : 0.62))}px ${HAND}`;
    g.fillStyle = ln.startsWith('~') ? '#1f6fb5' : INK;
    g.fillText(ln.replace(/^~/, ''), w / 2, lh * (i + 0.5));
  });
}
function label(text, pos, o = {}) {
  const lines = text.split('\n');
  const c = document.createElement('canvas'); const g = c.getContext('2d');
  g.font = `600 60px ${HAND}`;
  const tw = Math.max(...lines.map(l => g.measureText(l).width)) + 70;
  c.width = Math.min(2048, Math.ceil(tw)); c.height = 86 * lines.length + 20;
  drawLabel(g, c.width, c.height, lines, o);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  const hgt = (o.size || 0.22) * lines.length * 1.1;
  sp.scale.set(hgt * c.width / c.height, hgt, 1); sp.position.set(...pos); sp.renderOrder = 5;
  const grp = new THREE.Group(); grp.add(sp); (o.parent || labelsRoot).add(grp);
  if (o.target) {
    const a = new THREE.Vector3(...pos), b = new THREE.Vector3(...o.target);
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0x3a2614, transparent: true, opacity: 0.8 }));
    grp.add(ln);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3a2614 })); dot.position.copy(b); grp.add(dot);
  }
  return {
    grp, sp, setText(t) {
      const L = t.split('\n'); drawLabel(g, c.width, c.height, L, o); tex.needsUpdate = true;
    }
  };
}
function scaleBar(x, y, z, len = 5, ry = 0, parent = labelsRoot) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  for (let i = 0; i < len; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.04, 0.16), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf3ead6 : 0x2b1d10 })); b.position.set(i + 0.5, 0.02, 0); g.add(b); }
  for (const k of [0, 1, 2, 5]) if (k <= len) { const l = label(k + (k === len ? ' m' : ''), [0, 0, 0], { size: 0.2, parent: g }); l.sp.position.set(k, 0.3, 0); }
  return g;
}

/* ---- X-ray cutaway section model (wall build-up, magnified ×8) ---- */
const SECTION = new THREE.Group(); SECTION.visible = false; scene.add(SECTION);
const sectionArrows = [];
{
  const ox = 12.2, oz = -3.0, base = 0.75, K = 8, W = 1.6, H = 1.5;
  const ped = new THREE.Mesh(new THREE.BoxGeometry(1.4, base, 2.0), M.stone); ped.position.set(ox, base / 2, oz); SECTION.add(ped);
  addCollider(ox - 0.7, ox + 0.7, 0, 1.8, oz - 1.0, oz + 1.0);
  const layers = [ // from inside (−x) to outside (+x)
    { t: 0.005, mat: M.lining, name: 'Perforated inner lining / structural panel 5 mm' },
    { t: 0.053, mat: M.sponge, name: 'Sponge porous core 53 mm (40 mm open-cell bio-foam)' },
    { t: 0.012, mat: new THREE.MeshStandardMaterial({ map: T.shingle, roughness: 0.7 }), name: 'Diamond wood shingle layer 12 mm' },
    { t: 0.008, mat: M.frp, name: 'Outer skin option: 8 mm fiberglass / FRP' },
  ];
  let x = ox - 0.35;
  const fdn = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, W), M.concrete); fdn.position.set(ox, base + 0.15, oz); SECTION.add(fdn);
  label('Concrete foundation 150 mm', [ox + 1.7, base + 0.15, oz + 1.15], { size: 0.13, parent: SECTION, target: [ox + 0.4, base + 0.15, oz + 0.6] });
  const y0 = base + 0.3;
  layers.forEach((L, i) => {
    const th = L.t * K;
    const m = new THREE.Mesh(new THREE.BoxGeometry(th, H, W), L.mat); m.position.set(x + th / 2, y0 + H / 2, oz); SECTION.add(m);
    if (i === 2) { // diamonds on the shingle face
      for (let r = 0; r < 9; r++) for (let c2 = 0; c2 < 10; c2++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.13, 0.13), L.mat); d.rotation.x = Math.PI / 4;
        d.position.set(x + th + 0.006, y0 + 0.08 + r * 0.17, oz - W / 2 + 0.08 + c2 * 0.16 + (r % 2) * 0.08); SECTION.add(d);
      }
    }
    label(L.name, [ox + 1.9, y0 + 0.3 + i * 0.36, oz - 1.2], { size: 0.12, parent: SECTION, target: [x + th / 2, y0 + 0.3 + i * 0.36, oz - W / 2] });
    if (i === 1) { L.x0 = x; L.x1 = x + th; SECTION.userData.core = [x, x + th]; }
    x += th + 0.002;
  });
  label('X-RAY CUTAWAY — wall build-up (×8)\n~Air flows through porous sponge — natural ventilation,\n~cooling & humidity control — sealed when closed.', [ox, y0 + H + 0.75, oz], { size: 0.16, parent: SECTION, title: true });
  const ag = new THREE.ConeGeometry(0.03, 0.12, 6);
  const [cx0, cx1] = SECTION.userData.core;
  for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(ag, M.arrow); SECTION.add(m); sectionArrows.push({ m, t: rnd(), row: i % 5, x: lerp(cx0 + 0.04, cx1 - 0.04, rnd()) }); }
  updaters.push((dt, t) => {
    if (!SECTION.visible) return;
    const open = smooth((S.wall.p - 1) / 0.6);
    for (const A of sectionArrows) {
      A.t += dt * 0.25 * (open > 0.05 ? 1 : 0); if (A.t > 1) A.t -= 1;
      const s = A.t; let p, dir;
      if (s < 0.7) { p = new THREE.Vector3(A.x, y0 + 0.15 + A.row * 0.22, oz + W / 2 - (s / 0.7) * W); dir = new THREE.Vector3(0, 0.15, -1); }
      else { const q = (s - 0.7) / 0.3; p = new THREE.Vector3(A.x, y0 + 0.15 + A.row * 0.22 + q * (H - A.row * 0.22), oz - W / 2 + 0.1); dir = new THREE.Vector3(0, 1, 0); }
      A.m.position.copy(p); A.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      A.m.visible = open > 0.05;
    }
  });
}

/* ---- Exploded view area (east lawn) ---- */
const EXPLODED = new THREE.Group(); scene.add(EXPLODED);
let conch2;
{
  const ex = 0, ez = -25;
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.08, 48), M.flag); pad.position.set(ex, 0.04, ez); pad.receiveShadow = true; EXPLODED.add(pad); walkables.push(pad);
  // roof lifted off on four steel posts, with its own drum ring
  conch2 = makeConch(EXPLODED, ex + 1.5, 4.6, ez - 3.2); conch2.root.scale.setScalar(0.45);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 8), M.steel); p.position.set(ex + 1.5 + Math.cos(a) * 1.7, 2.2, ez - 3.2 + Math.sin(a) * 1.7); EXPLODED.add(p); addCollider(p.position.x - 0.1, p.position.x + 0.1, 0, 4, p.position.z - 0.1, p.position.z + 0.1); }
  // curved track on its own stand
  {
    const g = new THREE.Group(); g.position.set(ex + 4.3, 1.1, ez + 3.6); g.scale.setScalar(0.45); EXPLODED.add(g);
    const t1 = new THREE.Mesh(new THREE.TorusGeometry(ROOF_R, 0.07, 8, 64), M.steel); t1.rotation.x = Math.PI / 2; g.add(t1);
    const t2 = new THREE.Mesh(new THREE.TorusGeometry(ROOF_R + 0.55, 0.06, 8, 64), M.steel); t2.rotation.x = Math.PI / 2; t2.position.y = -0.27; g.add(t2);
    for (let k = 0; k < 13; k++) { const a = k / 13 * Math.PI * 2; const pts = []; for (let s = 0; s <= 6; s++) { const q = s / 6 * Math.PI / 2; const r = ROOF_R + 0.55 * Math.sin(q); pts.push(new THREE.Vector3(Math.cos(a) * r, -0.27 * (1 - Math.cos(q)), Math.sin(a) * r)); } g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.04, 6), M.steel)); const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 12), M.steel); rl.rotation.x = Math.PI / 2; rl.rotation.z = a; rl.position.set(Math.cos(a) * ROOF_R, 0, Math.sin(a) * ROOF_R); g.add(rl); }
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 1.0, 16), M.stone); st.position.set(ex + 4.3, 0.5, ez + 3.6); EXPLODED.add(st);
    addCollider(ex + 2.6, ex + 6.0, 0, 1.5, ez + 1.9, ez + 5.3);
    label('Curved stainless steel sliding track\n+ roller bearings (petals slide out & down)', [ex + 4.3, 2.4, ez + 3.6], { size: 0.17, parent: EXPLODED });
  }
  // single spiral segment on a pedestal
  {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 16), M.stone); ped.position.set(ex - 4.2, 0.5, ez + 3.4); EXPLODED.add(ped);
    addCollider(ex - 4.7, ex - 3.7, 0, 1.5, ez + 2.9, ez + 3.9);
    const seg = new THREE.Mesh(petalGeometry(13, ROOF_R, CONCH_H, 1.75), shellMat); seg.scale.setScalar(0.45); seg.castShadow = true;
    const holder = new THREE.Group(); holder.position.set(ex - 4.2, 1.05, ez + 3.4); EXPLODED.add(holder);
    seg.position.set(ROOF_R * 0.45 * 0.5, 0, 0); holder.add(seg);
    updaters.push((dt, t) => { holder.rotation.y = t * 0.25; });
    label('Single spiral shell segment\n(1 of 13) — cream, blush & tan ridges', [ex - 4.2, 2.9, ez + 3.4], { size: 0.17, parent: EXPLODED });
  }
  // wall layers pulled apart
  {
    const wx = ex - 1.6, wz = ez + 5.2;
    const L = [
      ['Concrete foundation\n150 mm', M.concrete, 0.6, 0.6],
      ['Perforated inner\nlining 5 mm', M.lining, 0.03, 2.0],
      ['Sponge porous core\n53 mm (40 mm bio-foam)', M.sponge, 0.22, 2.0],
      ['Diamond wood\nshingles 12 mm', new THREE.MeshStandardMaterial({ map: T.shingle }), 0.05, 2.0],
      ['8 mm fiberglass /\nFRP outer skin', M.frp, 0.035, 2.0],
    ];
    L.forEach(([name, mat, t, h], i) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, t), mat); m.position.set(wx + i * 0.95 - 1.6, h / 2 + 0.08, wz); m.rotation.y = 0.0; m.castShadow = true; EXPLODED.add(m);
      if (i === 3) for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.015), mat); d.rotation.z = Math.PI / 4; d.position.set(m.position.x - 0.6 + c * 0.17 + (r % 2) * 0.085, 0.2 + r * 0.155, wz + 0.035); EXPLODED.add(d); }
      label(name, [m.position.x, h + 0.55, wz], { size: 0.13, parent: EXPLODED });
    });
    addCollider(wx - 2.4, wx + 3.0, 0, 2.2, wz - 0.2, wz + 0.2);
  }
  label('EXPLODED VIEW\nroof lifted off · curved track · wall layers · spiral segment', [ex + 1.5, 7.4, ez - 3.2], { size: 0.32, parent: EXPLODED, title: true });
  scaleBar(ex - 2.5, 0.09, ez - 6.8, 5, 0, EXPLODED);
}

/* ---- labels in the house ---- */
const roofStatus = label('ROOF: STAGE 1 — CLOSED / SEALED\n0% open · no airflow', [CORE.cx, CORE.top + 6.9, CORE.cz], { size: 0.38 });
const wallStatus = label('WALL: STATE 1 — CLOSED FLAT\nfully sealed · watertight · no gaps', [13.2, 6.0, 0], { size: 0.28 });
{
  const RT = CORE.top + 0.3 + DRUM_H;
  label('CONCH SHELL ROOF — 18 m bloom diameter\nspiralling open in 3 stages · rotates 120° clockwise, then lowers on curved track', [CORE.cx, CORE.top + 8.2, CORE.cz], { size: 0.38, title: true });
  label('Curved stainless steel sliding track', [CORE.cx + ROOF_R + 2.8, RT + 0.9, 2.4], { size: 0.24, target: [CORE.cx + ROOF_R + 0.4, RT - 0.15, 1.2] });
  label('Compression gasket seal (when closed)', [CORE.cx - ROOF_R - 2.8, RT + 0.6, -1.4], { size: 0.24, target: [CORE.cx - ROOF_R, RT + 0.04, -0.6] });
  label('Linear actuator 24 V · radial arm hinge', [CORE.cx + 1.0, RT + 0.6, -ROOF_R - 3.2], { size: 0.24, target: [CORE.cx + 0.6, RT - 0.4, -ROOF_R + 0.5] });
  label('Roller bearings', [CORE.cx + ROOF_R + 2.2, RT + 1.8, -3.6], { size: 0.24, target: [CORE.cx + ROOF_R * 0.7, RT, -ROOF_R * 0.7] });
  label('Spiral guide rail', [CORE.cx - 1.2, U + 1.5, 1.9], { size: 0.16, target: [CORE.cx - 0.6, RT - 0.2, 1.2] });
  label('DIAMOND SHINGLE WAVE WALL\nbreathing building skin', [13.2, 7.1, 0], { size: 0.3, title: true });
  label('Diamond wood shingles · 60 mm · overlapping', [11.8, 4.2, -3.4], { size: 0.17, target: [9.15, 4.0, -3.2] });
  label('Wavy arched glass entrance', [11.4, 3.7, 1.1], { size: 0.16, target: [9.1, G + 2.2, 0.4] });
  label('A) BREATHING STAIRWELL CHIMNEY\nNo electricity — passive stack ventilation\n~cool air drawn in low · warm air vents high', [7.8, G + 2.7, 1.7], { size: 0.13, title: true });
  label('~Warm air rises & exits through the conch roof', [CORE.cx + 0.4, U + 2.3, -1.8], { size: 0.13 });
  label('~Cool ocean air enters low through the wall', [8.0, G + 0.75, 2.9], { size: 0.11 });
  label('B) INDOOR GARDEN WALL & WATER TROUGH\nair flows over plants & water → evaporative cooling\nlike a mangrove inside the home', [6.2, G + 3.1, -3.2], { size: 0.12, title: true });
  label('C) FOLDING SEA FAN DIVIDERS  (click / trigger to fold)\nopen: breeze & dappled light · closed: storm & privacy', [1.9, G + 2.95, -2.4], { size: 0.11, title: true });
  label('Curved bay window — ocean view', [-0.5, U + 2.4, 7.1], { size: 0.12 });
  label('Sea fan screens fold open / closed', [-2.6, U + 2.45, 2.6], { size: 0.1 });
  scaleBar(2.5, 0.07, 11.3, 5, 0);
  label('BREATHING BUILDING SKIN — Bahamian House · 6435', [13.5, 3.2, 9.5], { size: 0.32, title: true });
}
function statusText() {
  const p = S.roof.p;
  let r;
  if (p < 0.02) r = 'ROOF: STAGE 1 — CLOSED / SEALED\n0% open · no airflow · hurricane-tight';
  else if (Math.abs(p - 0.5) < 0.02) r = 'ROOF: STAGE 2 — SEMI-OPEN 50%\nrotated 120° clockwise · petals lifted · warm air exits';
  else if (p > 0.98) r = 'ROOF: STAGE 3 — FULLY OPEN / BLOOMED 100%\npetals dropped out & down on curved track · full airflow';
  else r = `ROOF: ${p < 0.5 ? 'rotating 120° & lifting' : 'falling out on curved track'} — ${Math.round(p * 100)}%\n${S.roof.paused ? 'PAUSED' : 'moving slowly…'}`;
  const w = S.wall.p;
  let wl;
  if (w < 0.02) wl = 'WALL: STATE 1 — CLOSED FLAT\nfully sealed · watertight · no gaps';
  else if (Math.abs(w - 1) < 0.02) wl = 'WALL: STATE 2 — CLOSED BUT IN A WAVE\nstill sealed · flexes like flowing water';
  else if (w > 1.98) wl = 'WALL: STATE 3 — SEMI-OPEN WAVE\nshingles lift · micro-vents breathe · light glows through';
  else wl = `WALL: rippling ${w < 1 ? 'into a wave' : 'open'}…\n${Math.round(w / 2 * 100)}%`;
  return [r, wl];
}
let lastStatus = '';

/* ============================================================
   CONTROL PANEL (wooden, by the front door + atrium + exploded area)
   ============================================================ */
const GOTO = {
  front: [26, 0, 6, 1.28], house: [-0.8, 0, 17.5, 0.03], deck: [9.95, CORE.top + 0.3, 4.25, 0.75], porch: [-0.4, G, 7.0, 0.1], atrium: [7.8, G, 1.0, Math.PI * 0.62], bay: [-0.5, U, 5.2, Math.PI],
  roof: [4.1, U, 0.0, -Math.PI / 2], terrace: [-6.5, 4.33, -1.0, -0.6], exploded: [-7, 0, -18.5, -0.86], wall: [15.5, 0, 0.5, Math.PI / 2],
};
function setRoof(v) {
  if (S.weather === 'storm' && v > 0) { flash('Storm mode: roof stays sealed. Switch weather to Breeze first.'); return; }
  S.roof.target = v; S.roof.paused = false; refreshUI();
}
function setWall(v) {
  if (S.weather === 'storm' && v > 0) { flash('Storm mode: wall stays flat & sealed. Switch weather to Breeze first.'); return; }
  S.wall.target = v; refreshUI();
}
const ex_panel = [-6.2, -17.4];
const ROWS = [
  ['ROOF', [['Closed', () => setRoof(0), () => S.roof.target === 0], ['Semi 50%', () => setRoof(0.5), () => S.roof.target === 0.5], ['Open 100%', () => setRoof(1), () => S.roof.target === 1], ['Pause', () => { S.roof.paused = !S.roof.paused; refreshUI(); }, () => S.roof.paused]]],
  ['WALL', [['Flat', () => setWall(0), () => S.wall.target === 0], ['Wave', () => setWall(1), () => S.wall.target === 1], ['Semi-open', () => setWall(2), () => S.wall.target === 2]]],
  ['WEATHER', [['Breeze', () => { S.weather = 'breeze'; applyAll(); }, () => S.weather === 'breeze'], ['Sunset', () => { S.weather = 'sunset'; S.time = 'dusk'; applyAll(); }, () => S.weather === 'sunset'], ['Storm', () => { S.weather = 'storm'; applyAll(); }, () => S.weather === 'storm']]],
  ['TIME', [['Day', () => { S.time = 'day'; if (S.weather === 'sunset') S.weather = 'breeze'; applyAll(); }, () => S.time === 'day'], ['Dusk', () => { S.time = 'dusk'; applyAll(); }, () => S.time === 'dusk'], ['Night', () => { S.time = 'night'; if (S.weather === 'sunset') S.weather = 'breeze'; applyAll(); }, () => S.time === 'night']]],
  ['VIEW', [['X-Ray', () => { S.xray = !S.xray; applyAll(); }, () => S.xray], ['Labels', () => { S.labels = !S.labels; applyAll(); }, () => S.labels], ['Sea fans', () => { S.fansOpen = !S.fansOpen; refreshUI(); }, () => S.fansOpen], ['Doors', () => { S.allDoors = !S.allDoors; refreshUI(); }, () => S.allDoors]]],
  ['GO TO', [['Street', () => goTo('front')], ['Wave wall', () => goTo('wall')], ['Roof deck', () => goTo('deck')], ['Under roof', () => goTo('roof')]]],
  ['', [['Atrium', () => goTo('atrium')], ['Bay', () => goTo('bay')], ['Front door', () => goTo('house')], ['Exploded', () => goTo('exploded')]]],
];
const PW = 1024, PH = 1180;
const panelCanvas = document.createElement('canvas'); panelCanvas.width = PW; panelCanvas.height = PH;
const panelTex = new THREE.CanvasTexture(panelCanvas); panelTex.colorSpace = THREE.SRGBColorSpace; panelTex.anisotropy = 8;
const panelRects = [];
let panelHover = null, flashMsg = '', flashUntil = 0;
function drawPanel() {
  const g = panelCanvas.getContext('2d');
  g.drawImage(T.woodWarm.image, 0, 0, PW, PH);
  g.fillStyle = 'rgba(60,32,12,0.35)'; g.fillRect(0, 0, PW, PH);
  g.strokeStyle = 'rgba(30,14,4,0.8)'; g.lineWidth = 14; g.strokeRect(10, 10, PW - 20, PH - 20);
  g.fillStyle = '#f7e9c8'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `700 64px ${HAND}`; g.fillText('Breathing Building Skin · 6435', PW / 2, 62);
  panelRects.length = 0;
  let y = 120; const rowH = 128;
  for (const [title, btns] of ROWS) {
    g.textAlign = 'left'; g.font = `700 46px ${HAND}`; g.fillStyle = '#f7e9c8'; g.fillText(title, 34, y + rowH / 2 - 6);
    const x0 = 210, avail = PW - x0 - 30, n = btns.length, gap = 12, bw = (avail - gap * (n - 1)) / n, bh = rowH - 34;
    btns.forEach(([txt, act, isOn], i) => {
      const x = x0 + i * (bw + gap), yy = y + 6;
      const on = isOn ? isOn() : false, hov = panelHover === title + i;
      g.fillStyle = on ? '#e2a64a' : hov ? '#f0dfb8' : '#e9dcc0';
      g.beginPath(); g.roundRect(x, yy, bw, bh, 18); g.fill();
      g.lineWidth = 5; g.strokeStyle = on ? '#6b3b0c' : 'rgba(40,20,6,0.6)'; g.stroke();
      g.fillStyle = on ? '#2b1404' : '#3a2614'; g.textAlign = 'center';
      g.font = `${on ? 700 : 600} ${n > 4 ? 36 : 44}px ${HAND}`; g.fillText(txt, x + bw / 2, yy + bh / 2 + 2);
      panelRects.push({ x, y: yy, w: bw, h: bh, act, key: title + i });
    });
    y += rowH;
  }
  // status
  const [r, w] = statusText();
  g.fillStyle = 'rgba(247,233,200,0.92)'; g.beginPath(); g.roundRect(30, y + 8, PW - 60, PH - y - 40, 16); g.fill();
  g.fillStyle = '#3a2614'; g.font = `600 30px ${HAND}`; g.textAlign = 'left';
  const msg = performance.now() < flashUntil ? flashMsg : r.split('\n')[0] + '   ·   ' + w.split('\n')[0];
  g.fillText(msg, 50, y + 8 + (PH - y - 40) / 2);
  panelTex.needsUpdate = true;
}
function panelClick(uv) {
  const x = uv.x * PW, y = (1 - uv.y) * PH;
  for (const r of panelRects) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { r.act(); return true; }
  return false;
}
function panelHoverAt(uv) {
  let k = null; if (uv) { const x = uv.x * PW, y = (1 - uv.y) * PH; for (const r of panelRects) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) k = r.key; }
  if (k !== panelHover) { panelHover = k; drawPanel(); }
}
const panelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: panelTex, emissiveIntensity: 0.25 });
function makePanel(x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; dynRoot.add(g);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), M.woodDark); post.position.y = 0.5; g.add(post);
  const footing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.4), M.woodDark); footing.position.y = 0.025; g.add(footing);
  const tilt = new THREE.Group(); tilt.position.y = 1.22; tilt.rotation.x = -0.45; g.add(tilt);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.98, 0.05), M.woodDark); frame.position.z = -0.03; frame.castShadow = true; tilt.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8 * PH / PW), panelMat); tilt.add(face);
  face.userData.onSelectUV = panelClick; face.userData.onHoverUV = panelHoverAt; face.userData.hint = 'Control panel';
  interactives.push(face);
  addCollider(x - 0.3, x + 0.3, y, y + 1.4, z - 0.3, z + 0.3);
  return g;
}
makePanel(2.3, G, 6.75, -0.35);     // by the front door
makePanel(8.2, G, 2.3, -Math.PI / 2 + 0.5);   // inside the atrium
makePanel(ex_panel[0], 0, ex_panel[1], -0.6); // exploded-view area
makePanel(14.6, 0, 6.6, Math.PI / 2 - 0.5);   // street side, by the breathing wall
makePanel(1.3, U, 5.0, -0.9);       // upstairs by the bay

/* ============================================================
   HTML overlay (desktop / phone)
   ============================================================ */
const ui = document.getElementById('ui');
function buildHTML() {
  ui.innerHTML = '';
  const hd = document.createElement('div'); hd.id = 'uihead'; hd.textContent = 'Controls ▾'; hd.onclick = () => { ui.classList.toggle('min'); hd.textContent = ui.classList.contains('min') ? 'Controls ▸' : 'Controls ▾'; }; ui.appendChild(hd);
  for (const [title, btns] of ROWS) {
    const row = document.createElement('div'); row.className = 'row';
    const h = document.createElement('span'); h.textContent = title; row.appendChild(h);
    btns.forEach(([txt, act, isOn]) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = (e) => { e.stopPropagation(); act(); }; b._isOn = isOn; row.appendChild(b); });
    ui.appendChild(row);
  }
  const st = document.createElement('div'); st.id = 'status'; ui.appendChild(st);
  if (innerWidth < 900) { ui.classList.add('min'); hd.textContent = 'Controls ▸'; }
}
function refreshUI() {
  drawPanel();
  for (const b of ui.querySelectorAll('button')) b.classList.toggle('on', !!(b._isOn && b._isOn()));
  const st = document.getElementById('status'); if (st) { const [r, w] = statusText(); st.textContent = (performance.now() < flashUntil ? flashMsg + ' · ' : '') + r.split('\n')[0] + ' · ' + w.split('\n')[0]; }
}
function flash(m) { flashMsg = m; flashUntil = performance.now() + 3500; refreshUI(); }
function applyAll() {
  applyEnvironment();
  const P = TIME[S.time]; const storm = S.weather === 'storm';
  dapple.intensity = storm ? 0 : S.time === 'day' ? 90 : S.time === 'dusk' ? 35 : 0;
  dapple.color.set(S.time === 'dusk' ? 0xffb070 : 0xfff0d0);
  WALL.setXray(S.xray); SECTION.visible = S.xray;
  labelsRoot.visible = S.labels;
  EXPLODED.traverse(o => { if (o.isSprite || (o.isLine)) o.visible = S.labels; });
  refreshUI();
}

/* ============================================================
   LOCOMOTION, COLLISION, INTERACTION
   ============================================================ */
const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
function groundAt(x, z, fromY) {
  ray.set(new THREE.Vector3(x, fromY + 0.5, z), DOWN); ray.far = 60;
  const h = ray.intersectObjects(walkables, false);
  return h.length ? h[0].point.y : null;
}
function blocked(x, z, y) {
  const r = 0.2;
  if (y > CORE.top - 0.2 && y < CORE.top + 2 && Math.hypot(x - CORE.cx, z - CORE.cz) < ROOF_R * 1.22 + 0.2) return true;
  for (const c of colliders) if (c.on && x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ && y + 0.3 < c.maxY && y + 1.7 > c.minY) return true;
  return false;
}
const headW = new THREE.Vector3();
function moveRig(dx, dz) {
  camera.getWorldPosition(headW);
  const y = rig.position.y;
  if (!blocked(headW.x + dx, headW.z, y)) rig.position.x += dx;
  if (!blocked(headW.x, headW.z + dz, y)) rig.position.z += dz;
}
function settleY(dt) {
  camera.getWorldPosition(headW);
  const gy = groundAt(headW.x, headW.z, rig.position.y);
  if (gy === null) return;
  if (gy > rig.position.y) rig.position.y = Math.min(gy, rig.position.y + Math.max(0.02, dt * 6));
  else rig.position.y = Math.max(gy, rig.position.y - dt * 7);
}
function goTo(k) {
  const [x, y, z, yaw] = GOTO[k];
  rig.rotation.y = yaw; rig.updateMatrixWorld(true);
  if (renderer.xr.isPresenting) { camera.getWorldPosition(headW); rig.position.x += x - headW.x; rig.position.z += z - headW.z; rig.position.y = y; }
  else { rig.position.set(x, y, z); pitch = k === 'front' ? 0.25 : k === 'roof' ? 0.9 : k === 'deck' ? 0.35 : 0; }
}

/* ---- desktop: drag to look, WASD, click to interact ---- */
let pitch = -0.04; const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
const cvs = renderer.domElement; let drag = null;
cvs.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, id: e.pointerId }; cvs.setPointerCapture(e.pointerId); });
cvs.addEventListener('pointermove', e => {
  mouseNDC.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); mouseMoved = true;
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  const k = e.pointerType === 'touch' ? 0.006 : 0.0035;
  rig.rotation.y -= dx * k; pitch = clamp(pitch - dy * k, -1.4, 1.4);
});
cvs.addEventListener('pointerup', e => {
  if (drag && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) clickAt(e.clientX, e.clientY);
  drag = null;
});
const mouseNDC = new THREE.Vector2(); let mouseMoved = false;
function pick(origin, dir) {
  ray.set(origin, dir); ray.far = 25;
  const hits = ray.intersectObjects([...interactives, ...blockers], false);
  if (!hits.length) return null;
  const h = hits[0]; return (h.object.userData.onSelect || h.object.userData.onSelectUV) ? h : null;
}
function activate(h) {
  if (!h) return;
  if (h.object.userData.onSelectUV) h.object.userData.onSelectUV(h.uv); else h.object.userData.onSelect();
}
function clickAt(cx, cy) {
  const ndc = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera); activate(pick(ray.ray.origin.clone(), ray.ray.direction.clone()));
}
// touch D-pad
const pad = { f: 0, s: 0 };
document.querySelectorAll('#dpad button').forEach(b => {
  const [f, s] = b.dataset.v.split(',').map(Number);
  const on = (e) => { e.preventDefault(); pad.f = f; pad.s = s; }, off = (e) => { e.preventDefault(); pad.f = 0; pad.s = 0; };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off);
});
const tip = document.getElementById('tip');

/* ---- VR controllers ---- */
const ctrls = [];
const ctrlRayGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]);
for (let i = 0; i < 2; i++) {
  const c = renderer.xr.getController(i); rig.add(c);
  const line = new THREE.Line(ctrlRayGeo, new THREE.LineBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0.7 })); line.scale.z = 4; c.add(line);
  const grip = renderer.xr.getControllerGrip(i); rig.add(grip);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 })); body.rotation.x = Math.PI / 2; grip.add(body);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 20), new THREE.MeshStandardMaterial({ color: 0xc9a25a, metalness: 0.6, roughness: 0.3 })); ring.position.z = -0.06; ring.rotation.x = 0.5; grip.add(ring);
  const st = { c, line, source: null, hand: '', snapLatch: false, aiming: false, target: null };
  c.addEventListener('connected', e => { st.source = e.data; st.hand = e.data.handedness; });
  c.addEventListener('disconnected', () => { st.source = null; });
  c.addEventListener('selectstart', () => { if (!st.aiming) activate(st.hover); });
  ctrls.push(st);
}
// teleport arc
const ARC_N = 48;
const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ARC_N * 3), 3));
const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: 0x5fc4ff })); arc.frustumCulled = false; arc.visible = false; scene.add(arc);
const marker = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.3, 32), new THREE.MeshBasicMaterial({ color: 0x5fc4ff, side: THREE.DoubleSide })); marker.rotation.x = -Math.PI / 2; marker.visible = false; scene.add(marker);
const tmpV = new THREE.Vector3(), tmpD = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
function computeArc(c) {
  c.getWorldPosition(tmpV); c.getWorldQuaternion(tmpQ); tmpD.set(0, 0, -1).applyQuaternion(tmpQ);
  const v = tmpD.clone().multiplyScalar(8.5); let p = tmpV.clone(); const pts = arcGeo.attributes.position.array; let hit = null, last = 0;
  for (let i = 0; i < ARC_N; i++) {
    pts.set([p.x, p.y, p.z], i * 3); last = i;
    if (hit) continue;
    const np = p.clone().addScaledVector(v, 0.035); v.y -= 9.8 * 0.035;
    const seg = np.clone().sub(p); const L = seg.length();
    ray.set(p, seg.normalize()); ray.far = L;
    const hs = ray.intersectObjects([...walkables, ...blockers], false);
    if (hs.length) { const h = hs[0]; const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 1, 0); hit = { point: h.point, ok: walkables.includes(h.object) && n.y > 0.6 }; p = h.point.clone(); for (let k = i + 1; k < ARC_N; k++) pts.set([p.x, p.y, p.z], k * 3); break; }
    p = np;
  }
  arcGeo.attributes.position.needsUpdate = true;
  return hit;
}
function snapTurn(a) {
  camera.getWorldPosition(headW); const before = headW.clone();
  rig.rotation.y += a; rig.updateMatrixWorld(true);
  camera.getWorldPosition(headW); rig.position.x += before.x - headW.x; rig.position.z += before.z - headW.z;
}
function updateVR(dt) {
  let aimingAny = false;
  for (const st of ctrls) {
    st.hover = null;
    if (!st.source) { st.line.visible = false; continue; }
    st.line.visible = true;
    const gp = st.source.gamepad; const ax = gp ? [gp.axes[2] || 0, gp.axes[3] || 0] : [0, 0];
    st.c.getWorldPosition(tmpV); st.c.getWorldQuaternion(tmpQ); tmpD.set(0, 0, -1).applyQuaternion(tmpQ);
    const h = pick(tmpV.clone(), tmpD.clone());
    st.hover = h; st.line.scale.z = h ? h.distance : 4;
    st.line.material.color.set(h ? 0xffb347 : 0xfff1cc);
    if (h && h.object.userData.onHoverUV) h.object.userData.onHoverUV(h.uv);
    if (st.hand === 'left') {
      if (Math.hypot(ax[0], ax[1]) > 0.15) {
        camera.getWorldDirection(tmpD); tmpD.y = 0; tmpD.normalize();
        const right = new THREE.Vector3(-tmpD.z, 0, tmpD.x);
        const sp = 2.0 * dt;
        moveRig((tmpD.x * -ax[1] + right.x * ax[0]) * sp, (tmpD.z * -ax[1] + right.z * ax[0]) * sp);
      }
    } else {
      if (Math.abs(ax[0]) > 0.7 && !st.snapLatch) { snapTurn(-Math.sign(ax[0]) * Math.PI / 6); st.snapLatch = true; }
      if (Math.abs(ax[0]) < 0.3) st.snapLatch = false;
      if (ax[1] < -0.6) { st.aiming = true; aimingAny = true; st.target = computeArc(st.c); }
      else if (st.aiming && Math.abs(ax[1]) < 0.3) {
        st.aiming = false;
        if (st.target && st.target.ok) { camera.getWorldPosition(headW); rig.position.x += st.target.point.x - headW.x; rig.position.z += st.target.point.z - headW.z; rig.position.y = st.target.point.y; }
      }
      if (st.aiming && st.target) { marker.visible = true; marker.position.copy(st.target.point).add(new THREE.Vector3(0, 0.02, 0)); marker.material.color.set(st.target.ok ? 0x5fc4ff : 0xff5a4a); arc.material.color.set(st.target.ok ? 0x5fc4ff : 0xff5a4a); }
    }
  }
  arc.visible = aimingAny; if (!aimingAny) marker.visible = false;
  if (!ctrls.some(c => c.hover && c.hover.object.userData.onHoverUV)) panelHoverAt(null);
}
renderer.xr.addEventListener('sessionstart', () => { document.body.classList.add('xr'); });
renderer.xr.addEventListener('sessionend', () => { document.body.classList.remove('xr'); camera.position.set(0, 1.65, 0); camera.rotation.set(0, 0, 0); });

/* ---- Enter VR button ---- */
const vrBtn = document.getElementById('vr');
(async () => {
  let ok = false;
  try { ok = !!navigator.xr && await navigator.xr.isSessionSupported('immersive-vr'); } catch (e) { ok = false; }
  if (!ok) { vrBtn.textContent = 'VR: open this page in Meta Quest Browser'; vrBtn.classList.add('off'); }
  vrBtn.onclick = async () => {
    if (!navigator.xr) { flash('This browser has no WebXR. Open the page in the Meta Quest Browser.'); return; }
    try {
      const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
      renderer.xr.setSession(s);
      s.addEventListener('end', () => { vrBtn.textContent = 'ENTER VR'; });
      vrBtn.textContent = 'EXIT VR';
    } catch (e) { flash('VR was blocked here (embedded view). Open the standalone file in the Quest Browser.'); }
  };
})();

/* ============================================================
   MERGE STATIC GEOMETRY (fewer draw calls for Quest)
   ============================================================ */
function mergeStatic() {
  staticRoot.updateMatrixWorld(true);
  const groups = new Map(), victims = [];
  staticRoot.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep || Array.isArray(o.material) || o.material.transparent) return;
    let g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); if (g.index) g = g.toNonIndexed();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    g.morphAttributes = {};
    const key = o.material.uuid + (o.castShadow ? 'c' : 'n');
    if (!groups.has(key)) groups.set(key, { mat: o.material, cast: o.castShadow, list: [] });
    groups.get(key).list.push(g); victims.push(o);
  });
  for (const o of victims) o.parent && o.parent.remove(o);
  for (const { mat, cast, list } of groups.values()) {
    const merged = mergeGeometries(list, false); if (!merged) continue;
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = true; m.matrixAutoUpdate = false; scene.add(m);
  }
}

/* ============================================================
   START
   ============================================================ */
const clock = new THREE.Clock();
async function start() {
  buildHTML();
  mergeStatic();
  applyAll();
  goTo('front');
  document.getElementById('loading').style.display = 'none';
  renderer.setAnimationLoop(loop);
}
let statusTimer = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta()); const t = clock.elapsedTime;
  // roof (slow, smooth; pause holds position)
  if (!S.roof.paused) { const d = S.roof.target - S.roof.p; S.roof.p += clamp(d, -0.065 * dt, 0.065 * dt); }
  conch.set(S.roof.p); conch2.set(S.roof.p);
  const dw = S.wall.target - S.wall.p; S.wall.p += clamp(dw, -0.2 * dt, 0.2 * dt);
  WALL.update(t);
  for (const f of updaters) f(dt, t);
  // movement
  if (renderer.xr.isPresenting) updateVR(dt);
  else {
    camera.rotation.set(pitch, 0, 0);
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + pad.f;
    const s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + pad.s;
    if (f || s) {
      const sp = (keys.ShiftLeft || keys.ShiftRight ? 4.5 : 2.2) * dt; const yaw = rig.rotation.y;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      moveRig((fx * f + rx * s) * sp, (fz * f + rz * s) * sp);
    }
    if (keys.KeyQ) rig.rotation.y += dt * 1.6; if (keys.KeyE) rig.rotation.y -= dt * 1.6;
    // hover tooltip
    if (mouseMoved) {
      mouseMoved = false; ray.setFromCamera(mouseNDC, camera); const h = pick(ray.ray.origin.clone(), ray.ray.direction.clone());
      cvs.style.cursor = h ? 'pointer' : 'grab'; tip.style.display = h ? 'block' : 'none';
      if (h) { tip.textContent = h.object.userData.hint || ''; tip.style.left = ((mouseNDC.x + 1) / 2 * innerWidth + 14) + 'px'; tip.style.top = ((1 - mouseNDC.y) / 2 * innerHeight + 10) + 'px'; }
      if (h && h.object.userData.onHoverUV) h.object.userData.onHoverUV(h.uv); else panelHoverAt(null);
    }
  }
  settleY(dt);
  // status labels
  statusTimer -= dt;
  if (statusTimer < 0) {
    statusTimer = 0.25; const [r, w] = statusText(); const k = r + w;
    if (k !== lastStatus) { lastStatus = k; roofStatus.setText(r); wallStatus.setText(w); refreshUI(); }
  }
  renderer.render(scene, camera);
}
start();
window.__house = { loop, stop() { renderer.setAnimationLoop(null); }, S, goTo, rig, camera, setRoof, setWall, applyAll, get pitch() { return pitch; }, set pitch(v) { pitch = v; }, renderer, scene, WALL };
