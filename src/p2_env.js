/* ============================================================
   ENVIRONMENT — sky, sun, Nassau shoreline, palms, olive, rain
   ============================================================ */
const sky = new Sky(); sky.scale.setScalar(3500); scene.add(sky);
const envScene = new THREE.Scene();
const envSky = new THREE.Mesh(sky.geometry, sky.material); envSky.scale.setScalar(3500); envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null;

const stormDome = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.MeshBasicMaterial({ color: 0x4a5058, side: THREE.BackSide, transparent: true, opacity: 0.0, fog: false, depthWrite: false }));
scene.add(stormDome);

const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
sun.target.position.set(1, 0, 0); scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6e5c46, 1); scene.add(hemi);
scene.fog = new THREE.Fog(0xd7a07a, 80, 900);

// interior warm lights (lamps) — turned up at dusk / night
const interiorLights = [];
for (const [x, y, z, i] of [[6, G + 2.6, 2.4, 1], [6.2, G + 2.4, -2.6, 1], [-1.6, G + 2.4, -3.3, 1], [-0.6, U + 2.2, 4.6, 1], [-1.8, U + 2.2, -4.0, 1]]) {
  const L = new THREE.PointLight(0xffc27a, 0, 10, 1.5); L.position.set(x, y, z); scene.add(L); interiorLights.push(L);
}
// daytime interior bounce fill (fakes light spilling through openings)
const fillA = new THREE.PointLight(0xfff1dc, 0, 14, 1.2); fillA.position.set(6, G + 3.5, 0); scene.add(fillA);
const fillB = new THREE.PointLight(0xfff1dc, 0, 12, 1.2); fillB.position.set(-0.5, G + 2.6, 0); scene.add(fillB);
const fillC = new THREE.PointLight(0xfff1dc, 0, 12, 1.2); fillC.position.set(-0.5, U + 2.4, 1); scene.add(fillC);

/* ---------- ground, road, beach, ocean ---------- */
{
  const grass = new THREE.Mesh(new THREE.CircleGeometry(44, 64), M.grass);
  grass.rotation.x = -Math.PI / 2; grass.position.set(-10, 0, -5); grass.receiveShadow = true; scene.add(grass); walkables.push(grass);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(60, 64), M.sand);
  sand.rotation.x = -Math.PI / 2; sand.position.set(-10, -0.12, -5); sand.receiveShadow = true; scene.add(sand); walkables.push(sand);
  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1b7896, roughness: 0.08, metalness: 0.05, normalMap: T.waterN.clone() });
  oceanMat.normalMap.repeat.set(160, 160); oceanMat.normalMap.wrapS = oceanMat.normalMap.wrapT = THREE.RepeatWrapping; oceanMat.normalScale.set(0.6, 0.6);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), oceanMat);
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -0.45; scene.add(ocean);
  // shallow turquoise band
  const shallowMat = new THREE.MeshStandardMaterial({ color: 0x47c2c4, roughness: 0.1, transparent: true, opacity: 0.55, normalMap: T.waterN.clone() });
  shallowMat.normalMap.repeat.set(30, 30); shallowMat.normalMap.wrapS = shallowMat.normalMap.wrapT = THREE.RepeatWrapping;
  const shallow = new THREE.Mesh(new THREE.RingGeometry(55, 95, 64), shallowMat);
  shallow.rotation.x = -Math.PI / 2; shallow.position.set(-10, -0.3, -5); scene.add(shallow);
  updaters.push((dt, t) => {
    oceanMat.normalMap.offset.set(t * 0.004, t * 0.0065);
    shallowMat.normalMap.offset.set(-t * 0.01, t * 0.006);
  });
  // coast road along the east side (you arrive here, facing the breathing wall)
  box(6, 0.03, 90, M.asphalt, 22, 0, -5, { walk: true, cast: false });
  box(1.6, 0.06, 90, M.concrete, 18.2, 0, -5, { walk: true, cast: false });
  box(1.6, 0.06, 90, M.concrete, 25.8, 0, -5, { walk: true, cast: false });
  for (let z = -48; z < 40; z += 3) box(0.12, 0.035, 1.5, new THREE.MeshStandardMaterial({ color: 0xe8dcb0, roughness: 0.8 }), 22, 0, z, { cast: false, uv: false });
  // paved lane from the garage to the coast road
  box(29, 0.05, 2.6, M.paver, 4.75, 0, 11.3, { walk: true, cast: false });
  // driveway pavers (in front of garage)
  box(6.2, 0.05, 4.6, M.paver, -6.5, 0, 8.3, { walk: true, cast: false });
  // front path flagstone
  box(2.2, 0.05, 1.8, M.flag, -0.5, 0, 9.7, { walk: true, cast: false });
}

/* ---------- palms ---------- */
const frondGeo = (() => {
  const g = new THREE.PlaneGeometry(0.9, 3.4, 1, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 1.7; const t = y / 3.4;
    p.setY(i, y * 0.95); p.setZ(i, -t * t * 1.5);
    p.setX(i, p.getX(i) * (1 - t * 0.6)); // taper
    // V fold
    p.setZ(i, p.getZ(i) - Math.abs(p.getX(i)) * 0.35);
  }
  g.computeVertexNormals(); return g;
})();
const palms = [];
function palm(x, z, h = 7, lean = 0.25, dir = 0, y0 = 0) {
  const grp = new THREE.Group(); grp.position.set(x, y0, z); grp.rotation.y = dir; scene.add(grp);
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(Math.sin(t * 1.2) * lean * h * 0.5, t * h, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tg = [];
  for (let i = 0; i < 14; i++) {
    const t0 = i / 14, t1 = (i + 1) / 14; const a = curve.getPoint(t0), b = curve.getPoint(t1);
    const r0 = lerp(0.2, 0.13, t0), r1 = lerp(0.2, 0.13, t1);
    const c = new THREE.CylinderGeometry(r1 * 1.05, r0, a.distanceTo(b), 9, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    c.applyQuaternion(q); c.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); tg.push(c.toNonIndexed());
  }
  const trunk = new THREE.Mesh(mergeGeometries(tg), M.palmBark); trunk.castShadow = true; grp.add(trunk);
  const top = curve.getPoint(1);
  const crown = new THREE.Group(); crown.position.copy(top); grp.add(crown);
  const fg = [];
  for (let i = 0; i < 13; i++) {
    const g = frondGeo.clone(); const a = i / 13 * Math.PI * 2 + rr(-0.2, 0.2);
    g.rotateX(-rr(0.15, 0.75)); g.rotateY(a); fg.push(g);
  }
  const fronds = new THREE.Mesh(mergeGeometries(fg), M.frond); fronds.castShadow = true; crown.add(fronds);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), M.bark); c.position.set(Math.cos(i * 1.6) * 0.18, -0.2, Math.sin(i * 1.6) * 0.18); crown.add(c); }
  palms.push({ grp, crown, ph: rnd() * 6 });
  addCollider(x - 0.25, x + 0.25, y0, y0 + 3, z - 0.25, z + 0.25);
  return grp;
}
[[29, 22, 8, 0.3, 1.9], [30, 10, 9.5, 0.35, 1.5], [29.5, -2, 7.5, 0.25, 1.7], [30.5, -14, 8.8, 0.4, 1.4], [29, -26, 7, 0.3, 1.8], [16.5, 19, 8, 0.3, 0.6],
 [-13, 6, 8.5, 0.2, 1.2], [-13.5, -4, 7, 0.25, 2], [14, -9, 8, 0.3, 4], [-8, -14, 9, 0.2, 3.5], [8, -14, 7.5, 0.35, 5], [-16, 14, 6.5, 0.3, -0.5],
 [-20, 26, 9, 0.3, 0.2], [-6, 30, 8, 0.25, 0.1], [8, 30, 7, 0.3, -0.2], [-28, -18, 8, 0.3, 0.5], [16.5, -20, 8.5, 0.3, 1.2]].forEach(a => palm(a[0], a[1], a[2], a[3], a[4]));

/* ---------- old olive tree (front garden) ---------- */
function oliveTree(x, z, s = 1, y0 = 0) {
  const grp = new THREE.Group(); grp.position.set(x, y0, z); grp.scale.setScalar(s); scene.add(grp);
  const branches = [
    [[0, 0, 0], [0.15, 0.8, 0.1], [-0.1, 1.5, 0.2], [-0.6, 2.4, 0.3], [-1.3, 3.0, 0.2]],
    [[0, 0, 0], [0.1, 0.9, -0.05], [0.5, 1.7, -0.2], [1.2, 2.5, -0.4], [1.6, 3.1, -0.3]],
    [[0, 0.6, 0], [0.2, 1.4, 0.4], [0.3, 2.3, 0.9], [0.1, 3.0, 1.2]],
    [[0, 1.2, 0], [-0.3, 2.0, -0.6], [-0.4, 2.8, -1.1]],
  ];
  for (const b of branches) {
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(b.map(p => new THREE.Vector3(...p))), 24, 0.13, 7), M.bark);
    m.castShadow = true; grp.add(m);
  }
  const inst = new THREE.Group(); grp.add(inst);
  for (const b of branches) { const tip = b[b.length - 1]; foliage(M.foliage, tip[0], tip[1] + 0.2, tip[2], 1.3, 0.75, 1.3, 70, 0.6, 1.05, inst); }
  foliage(M.foliage, 0, 3.0, 0, 1.8, 0.6, 1.8, 80, 0.6, 1.0, inst);
  addCollider(x - 0.3, x + 0.3, y0, y0 + 2, z - 0.3, z + 0.3);
  updaters.push((dt, t) => { const w = wind(); inst.rotation.z = Math.sin(t * 0.9) * 0.01 * w; inst.rotation.x = Math.sin(t * 0.7 + 1) * 0.008 * w; });
  return grp;
}

/* ---------- rain ---------- */
const RAIN_N = 4000;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 6);
const rainVel = new Float32Array(RAIN_N);
for (let i = 0; i < RAIN_N; i++) { const x = rr(-30, 30), y = rr(0, 26), z = rr(-25, 25); rainPos.set([x, y, z, x, y - 0.5, z], i * 6); rainVel[i] = rr(16, 22); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.45 }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
function roofHeightAt(x, z) { // y below which rain is intercepted by the house
  if (x > -9.6 && x < -3.9 && z > -6.4 && z < 6.4) return 4.3;
  if (x > -4.7 && x < 3.1 && z > -6.7 && z < 8.3) return 7.3;
  if (x > 1.6 && x < 10.6 && z > -4.8 && z < 4.8) return CORE.top + 0.6;
  return 0;
}
updaters.push((dt, t) => {
  if (!rain.visible) return;
  const wx = -7, wz = 2.5;
  const cx = rig.position.x, cz = rig.position.z;
  for (let i = 0; i < RAIN_N; i++) {
    const k = i * 6; let x = rainPos[k] + wx * dt, y = rainPos[k + 1] - rainVel[i] * dt, z = rainPos[k + 2] + wz * dt;
    // deflection: drops slide away from the curved wave wall / conch drum
    const dxc = x - CORE.cx, dzc = z - CORE.cz, rc = Math.hypot(dxc, dzc);
    if (rc < 4.2 && y < CORE.top + 2.5 && y > CORE.top) { x += dxc / rc * 3 * dt; z += dzc / rc * 3 * dt; }
    if (x > 9 && x < 10.5 && Math.abs(z) < 4.5 && y < CORE.top) x += 4 * dt;
    if (y < 0 || y < roofHeightAt(x, z)) { x = cx + rr(-30, 30); y = rr(18, 26); z = cz + rr(-25, 25); }
    rainPos[k] = x; rainPos[k + 1] = y; rainPos[k + 2] = z;
    rainPos[k + 3] = x - wx * 0.03; rainPos[k + 4] = y - 0.55; rainPos[k + 5] = z - wz * 0.03;
  }
  rainGeo.attributes.position.needsUpdate = true;
});

/* ---------- stars ---------- */
const stars = (() => {
  const n = 1800, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(rr(-1, 1), rr(0.05, 1), rr(-1, 1)).normalize().multiplyScalar(1400); p.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const s = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 }));
  s.visible = false; scene.add(s); return s;
})();

/* ---------- time / weather presets ---------- */
const TIME = {
  day:   { elev: 52, az: 70,  lightElev: 52, sun: 0xfff2dc, sunI: 3.4, hemiI: 1.2, sky: [2.2, 1.1, 0.004, 0.8], exp: 0.5,  fog: 0xbfd6ea, lamps: 0,   glow: 0.12, fill: 1.0 },
  dusk:  { elev: 3.2, az: 105, lightElev: 9, sun: 0xff9550, sunI: 2.6, hemiI: 0.6, sky: [7, 2.4, 0.006, 0.86], exp: 0.62, fog: 0xd4a27c, lamps: 1, glow: 1.0, fill: 0.35 },
  night: { elev: -7, az: -60, lightElev: 38, sun: 0x9fb6ff, sunI: 0.45, hemiI: 0.16, sky: [1, 0.25, 0.002, 0.7], exp: 0.9, fog: 0x101a2a, lamps: 1.5, glow: 1.35, fill: 0.0 },
};
const ENV = { glow: 1, lamps: 1, windStrength: 0.4 };
function wind() { return ENV.windStrength; }

function applyEnvironment() {
  const P = TIME[S.time]; const storm = S.weather === 'storm';
  const u = sky.material.uniforms;
  u.turbidity.value = storm ? 18 : P.sky[0]; u.rayleigh.value = storm ? 0.6 : P.sky[1];
  u.mieCoefficient.value = P.sky[2]; u.mieDirectionalG.value = P.sky[3];
  const sp = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - P.elev), THREE.MathUtils.degToRad(P.az));
  u.sunPosition.value.copy(sp);
  const lp = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - P.lightElev), THREE.MathUtils.degToRad(P.az));
  sun.position.copy(lp).multiplyScalar(70).add(sun.target.position);
  sun.color.set(P.sun); sun.intensity = P.sunI * (storm ? 0.18 : 1);
  hemi.intensity = P.hemiI * (storm ? 0.7 : 1);
  hemi.color.set(S.time === 'night' ? 0x34466e : 0xcfe3ff); hemi.groundColor.set(S.time === 'night' ? 0x1a1612 : 0x8a7356);
  renderer.toneMappingExposure = P.exp * (storm ? 1.15 : 1);
  scene.fog.color.set(storm ? 0x59626c : P.fog); scene.fog.near = storm ? 12 : 80; scene.fog.far = storm ? 180 : 900;
  stormDome.material.opacity = storm ? (S.time === 'night' ? 0.97 : 0.9) : 0;
  stormDome.material.color.set(S.time === 'night' ? 0x12161c : S.time === 'dusk' ? 0x4d4a50 : 0x5d6670);
  stars.visible = S.time === 'night' && !storm;
  rain.visible = storm;
  ENV.windStrength = storm ? 3.2 : 0.5;
  ENV.lamps = P.lamps + (storm ? 0.6 : 0);
  ENV.glow = P.glow;
  M.lantern.emissiveIntensity = ENV.lamps * 2.2;
  M.lampShade.emissiveIntensity = ENV.lamps * 0.9;
  for (const L of lanternLights) L.intensity = ENV.lamps * 6;
  for (const L of interiorLights) L.intensity = ENV.lamps * 5;
  const f = P.fill * (storm ? 0.4 : 1); fillA.intensity = f * 9; fillB.intensity = f * 6; fillC.intensity = f * 5;
  if (envRT) envRT.dispose();
  envRT = pmrem.fromScene(envScene, 0.02, 1, 5000);
  scene.environment = envRT.texture;
  scene.environmentIntensity = storm ? 0.4 : S.time === 'night' ? 0.35 : 1;
  if (storm) { S.roof.target = 0; S.roof.paused = false; S.wall.target = 0; }
  if (typeof refreshUI === 'function') refreshUI();
}
updaters.push((dt, t) => {
  for (const p of palms) {
    const w = wind();
    p.grp.rotation.z = Math.sin(t * 0.8 + p.ph) * 0.006 * w;
    p.crown.rotation.x = Math.sin(t * 1.3 + p.ph) * 0.03 * w;
    p.crown.rotation.z = Math.sin(t * 1.1 + p.ph * 2) * 0.04 * w;
  }
});
