/* ============================================================
   1. CONCH SHELL ROOF — 3-stage spiral opening
   ============================================================ */
/* conch colouring: cream / tan growth bands with blush pink */
const C_CREAM = new THREE.Color(0xead6b8), C_TAN = new THREE.Color(0xa87448), C_BLUSH = new THREE.Color(0xd98b80), C_DARK = new THREE.Color(0x7d5434);
function shellColor(out, u, v, band) {
  const b = 0.5 + 0.5 * Math.sin(band);
  out.copy(C_CREAM).lerp(C_TAN, 0.55 * b);
  if (Math.sin(band * 0.37 + 1.3) > 0.82) out.lerp(C_DARK, 0.35);            // dark growth streaks
  out.lerp(C_BLUSH, 0.4 * smooth(1 - Math.abs(v) * 2.2) * smooth(1 - u));     // blush along the lip
  return out;
}
function colorize(geo, fn) {
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { fn(c, p.getX(i), p.getY(i), p.getZ(i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); return geo;
}
/* One body-whorl segment of the conch: lip -> knobbed shoulder -> second whorl step -> spire base.
   Hinge (on the curved track) is at the origin; the segment runs inward along -x. */
function petalGeometry(N, R, H, twist) {
  const prof = new THREE.SplineCurve([
    [1.0, 0.0], [1.07, 0.22], [1.15, 0.5], [1.21, 0.72], [1.16, 0.8], [0.98, 0.86],
    [0.8, 0.9], [0.66, 0.96], [0.52, 1.0], [0.44, 1.03]].map(q => new THREE.Vector2(q[0], q[1])));
  const su = 44, sv = 12; const pos = [], col = [], uv = [], idx = [], bpos = [];
  const sR = R / 3.9;
  const bloomAt = (u, v, out) => {   // flat radiating petal, gently cupped and drooping, with a slight spiral sweep
    const d = u * R * 1.05, w = R * 0.36 * Math.sin(Math.PI * Math.min(1, u * 0.92 + 0.06));
    const lat = v * 2 * w, sw = 0.4 * u;
    out.set(d * Math.cos(sw) - lat * Math.sin(sw), -0.45 * u * u * sR + 0.5 * sR * v * v * (0.3 + u) + 0.02 * Math.sin(u * 90), d * Math.sin(sw) + lat * Math.cos(sw));
    return out;
  };
  const BV = new THREE.Vector3();
  const halfW = Math.PI / N * 1.12; const c = new THREE.Color();
  const P = new THREE.Vector2();
  for (let i = 0; i <= su; i++) {
    const u = i / su; prof.getPoint(u, P);
    const r = R * P.x, ang = twist * Math.pow(u, 1.2);
    for (let j = 0; j <= sv; j++) {
      const v = j / sv - 0.5;
      const a = ang + v * 2 * halfW;
      const growth = 0.018 * Math.sin(u * 90) + 0.01 * Math.sin(u * 230);          // fine growth lines
      const cord = 0.03 * Math.sin((v + 0.5) * Math.PI * 6) * smooth(1 - u * 1.6);  // spiral cords on the body
      const bulge = 0.12 * Math.cos(v * Math.PI) * Math.sin(Math.min(1, u * 2.2) * Math.PI);
      const lip = 0 * u < 0 ? 0 : 0; const lip0 = u < 0.1 ? -0.22 * Math.pow(1 - u / 0.1, 2) * (0.5 + Math.abs(Math.sin((v + 0.5) * Math.PI * 2))) : 0;
      const flare = u < 0.1 ? 0.18 * (1 - u / 0.1) * (0.6 + 0.4 * Math.abs(Math.sin((v + 0.5) * Math.PI * 2))) : 0;
      const rr_ = r + flare + cord * 0.5;
      pos.push(rr_ * Math.cos(a) - R, H * P.y + growth + cord + bulge + lip, rr_ * Math.sin(a));
      bloomAt(u, v, BV); bpos.push(BV.x, BV.y, BV.z);
      shellColor(c, u, v, u * 34 + v * 1.5); col.push(c.r, c.g, c.b); uv.push(u, v + 0.5);
    }
  }
  for (let i = 0; i < su; i++) for (let j = 0; j < sv; j++) { const a = i * (sv + 1) + j, b = a + sv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  { const tmp = new THREE.BufferGeometry(); tmp.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3)); tmp.setIndex(idx); tmp.computeVertexNormals();
    g.morphAttributes.position = [tmp.attributes.position]; g.morphAttributes.normal = [tmp.attributes.normal]; }
  g = g.toNonIndexed();
  // knobs (tubercles) on the shoulder and on the second whorl step
  const parts = [g];
  for (const [t, rad, len, tilt] of [[0.34, 0.36, 1.25, 0.25], [0.66, 0.22, 0.7, 0.6]]) {
    prof.getPoint(t, P); const r = R * P.x, ang = twist * Math.pow(t, 1.2);
    const k = new THREE.ConeGeometry(rad * R / 4.2, len * R / 4.2, 9, 3); k.translate(0, len * R / 4.2 / 2, 0);
    // blunt, slightly hooked knob
    const kp = k.attributes.position; for (let i = 0; i < kp.count; i++) { const y = kp.getY(i); kp.setX(i, kp.getX(i) * (1 + 0.25 * Math.sin(y * 3))); }
    const dir = new THREE.Vector3(Math.cos(ang) * 0.8, tilt + 0.5, Math.sin(ang) * 0.8).normalize();
    k.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    k.translate(r * Math.cos(ang) - R, H * P.y - 0.05, r * Math.sin(ang));
    k.deleteAttribute('normal'); k.computeVertexNormals();
    colorize(k, (cc, x, y) => cc.copy(C_CREAM).lerp(C_TAN, 0.3 + 0.3 * Math.sin(y * 12)));
    { const ax = r * Math.cos(ang) - R, ay = H * P.y - 0.05, az = r * Math.sin(ang); bloomAt(t, 0, BV);
      const kp2 = k.attributes.position, kb = new Float32Array(kp2.count * 3);
      for (let i = 0; i < kp2.count; i++) { kb[i * 3] = kp2.getX(i) - ax + BV.x; kb[i * 3 + 1] = (kp2.getY(i) - ay) * 0.6 + BV.y; kb[i * 3 + 2] = kp2.getZ(i) - az + BV.z; }
      k.morphAttributes.position = [new THREE.BufferAttribute(kb, 3)]; k.morphAttributes.normal = [k.attributes.normal.clone()]; }
    parts.push(k.toNonIndexed());
  }
  return mergeGeometries(parts);
}
/* The conch spire: stacked whorls, each with a ring of knobs, spiralling to a point */
function spireGeometry(R) {
  const parts = []; let y = 0, rb = 0.46 * R; const s = R / 4.2;
  for (let k = 0; k < 12; k++) {
    const h = 0.82 * s * Math.pow(0.9, k), rt = rb * 0.82;
    const pts = [[0.02, 0], [rb * 0.9, 0], [rb * 1.06, h * 0.28], [rb * 1.1, h * 0.42], [rb * 0.95, h * 0.62], [rt * 1.02, h * 0.95], [0.02, h]].map(q => new THREE.Vector2(q[0], q[1]));
    const lg = new THREE.LatheGeometry(pts, 28); lg.translate(0, y, 0);
    lg.deleteAttribute('normal'); lg.computeVertexNormals();
    colorize(lg, (cc, x, yy, z) => shellColor(cc, 0.8, 0, yy * 9 + Math.atan2(z, x) * 0.5));
    parts.push(lg.toNonIndexed());
    const n = Math.max(6, 11 - k);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + k * 0.45;   // offset each whorl -> spiral
      const kr = rb * 0.17, kl = rb * 0.5;
      const cone = new THREE.ConeGeometry(kr, kl, 8, 1); cone.translate(0, kl / 2, 0);
      cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a), 0.9, Math.sin(a)).normalize()));
      cone.translate(Math.cos(a) * rb * 1.0, y + h * 0.38, Math.sin(a) * rb * 1.0);
      cone.deleteAttribute('normal'); cone.computeVertexNormals();
      colorize(cone, cc => cc.copy(C_CREAM).lerp(C_TAN, 0.25));
      parts.push(cone.toNonIndexed());
    }
    y += h * 0.92; rb = rt;
  }
  const tip = new THREE.ConeGeometry(rb, 0.35 * s, 12); tip.translate(0, y + 0.17 * s, 0); colorize(tip, cc => cc.copy(C_TAN));
  parts.push(tip.toNonIndexed());
  // underside disc (pink nacre)
  const disc = new THREE.CircleGeometry(0.46 * R * 0.95, 32); disc.rotateX(Math.PI / 2); colorize(disc, cc => cc.copy(C_BLUSH));
  parts.push(disc.toNonIndexed());
  for (const g of parts) for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
  for (const g of parts) if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return { geo: mergeGeometries(parts), height: y };
}
T.shellBump = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += rr(2, 6)) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rr(0.08, 0.3)})`; g.fillRect(x, 0, rr(1, 3), h); }  // growth lines (across u)
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${rr(0.05, 0.2)})`; g.fillRect(rnd() * w, rnd() * h, rr(1, 3), rr(1, 3)); }      // pitting
}, { color: false });
const shellMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.0, side: THREE.DoubleSide,
  bumpMap: T.shellBump, bumpScale: 2.5, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color(0xffd8cc), sheenRoughness: 0.5 });
shellMat.onBeforeCompile = (sh) => { // pearly sheen on the back faces (pink nacre underside)
  sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n if(!gl_FrontFacing){ diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.96,0.72,0.70), 0.55); }');
};

function makeConch(parent, cx, baseY, cz, opt = {}) {
  const N = 13, R = ROOF_R, H = CONCH_H, twist = 1.25;
  const SEMI = THREE.MathUtils.degToRad(26), BLOOM = THREE.MathUtils.degToRad(110);
  const root = new THREE.Group(); root.position.set(cx, baseY, cz); parent.add(root);
  const spin = new THREE.Group(); root.add(spin);
  const geo = petalGeometry(N, R, H, twist);
  const petals = [];
  const rollerGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.2, 12); rollerGeo.rotateX(Math.PI / 2);
  const hingeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8); hingeGeo.rotateX(Math.PI / 2);
  const armGeo = new THREE.BoxGeometry(0.9, 0.05, 0.08); armGeo.translate(-0.45, 0, 0);
  const barrelGeo = new THREE.CylinderGeometry(0.045, 0.045, 1, 10); barrelGeo.translate(0, 0.5, 0);
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8); rodGeo.translate(0, 0.5, 0);
  for (let i = 0; i < N; i++) {
    const th = i / N * Math.PI * 2;
    const pivot = new THREE.Group(); spin.add(pivot);
    const tilt = new THREE.Group(); pivot.add(tilt);
    const mesh = new THREE.Mesh(geo, shellMat); mesh.castShadow = true; mesh.receiveShadow = true; tilt.add(mesh);
    const roller = new THREE.Mesh(rollerGeo, M.steel); pivot.add(roller);
    const hinge = new THREE.Mesh(hingeGeo, M.steel); tilt.add(hinge);
    const arm = new THREE.Mesh(armGeo, M.steel); arm.position.set(0, 0.06, 0); arm.rotation.z = -0.25; tilt.add(arm);
    const barrel = new THREE.Mesh(barrelGeo, M.iron); spin.add(barrel);
    const rod = new THREE.Mesh(rodGeo, M.steel); spin.add(rod);
    petals.push({ th, pivot, tilt, barrel, rod, mesh });
  }
  // conch spire on a telescoping central mast (rises as the roof opens)
  const sp = spireGeometry(R);
  const spire = new THREE.Mesh(sp.geo, shellMat); spire.castShadow = true; spire.receiveShadow = true; spin.add(spire);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 1, 12), M.steel); mast.geometry.translate(0, 0.5, 0); spin.add(mast);
  const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16), M.iron); mastBase.position.y = -0.62; root.add(mastBase);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(R - 0.4, 0.08, 0.1), M.steel); b.position.set(Math.cos(a) * (R - 0.4) / 2, -0.55, Math.sin(a) * (R - 0.4) / 2); b.rotation.y = -a; root.add(b); }
  // fixed track hardware
  const hw = new THREE.Group(); root.add(hw);
  const trackUp = new THREE.Mesh(new THREE.TorusGeometry(R, 0.045, 8, 96), M.steel); trackUp.rotation.x = Math.PI / 2; hw.add(trackUp);
  const trackLo = new THREE.Mesh(new THREE.TorusGeometry(R + 0.55, 0.04, 8, 96), M.steel); trackLo.rotation.x = Math.PI / 2; trackLo.position.y = -0.12; hw.add(trackLo);
  for (let k = 0; k < 26; k++) {
    const a = k / 26 * Math.PI * 2; const pts = [];
    for (let s = 0; s <= 6; s++) { const q = s / 6 * Math.PI / 2; const r = R + 0.55 * Math.sin(q); pts.push(new THREE.Vector3(Math.cos(a) * r, -0.12 * (1 - Math.cos(q)), Math.sin(a) * r)); }
    hw.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.025, 6), M.steel));
  }
  // spiral guide rail (inside the drum)
  { const pts = []; for (let s = 0; s <= 80; s++) { const q = s / 80; const a = q * Math.PI * 2.4; const r = R - 0.12 - q * 1.7; pts.push(new THREE.Vector3(Math.cos(a) * r, -0.14 - q * 0.05, Math.sin(a) * r)); }
    hw.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.03, 6), M.steel)); }
  // radial support spokes for spiral rail
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.04, 0.06), M.steel); b.position.set(Math.cos(a) * (R - 1.0), -0.17, Math.sin(a) * (R - 1.0)); b.rotation.y = -a; hw.add(b); }
  // compression gasket seal
  const gasket = new THREE.Mesh(new THREE.TorusGeometry(R + 0.03, 0.04, 8, 96), M.rubber); gasket.rotation.x = Math.PI / 2; gasket.position.y = 0.04; hw.add(gasket);

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const ptLocal = new THREE.Vector3(0.05 * R, 0.4 * H, 0), ptBloom = new THREE.Vector3(0.25 * R, -0.05, 0);
  function set(p) {
    let spinA, alpha, slide;
    if (p <= 0.5) { const q = smooth(p / 0.5); spinA = -THREE.MathUtils.degToRad(120) * q; alpha = SEMI * q; slide = 0; }
    else { const q = (p - 0.5) / 0.5; spinA = -THREE.MathUtils.degToRad(120); alpha = lerp(SEMI, -0.04, smooth(clamp(q / 0.8, 0, 1))); slide = smooth(clamp((q - 0.15) / 0.85, 0, 1)); }
    const morph = p <= 0.5 ? 0 : smooth(clamp((p - 0.5) / 0.4, 0, 1));
    spin.rotation.y = spinA;
    const lift = 1.7 * smooth(p / 0.5) + 1.2 * smooth((p - 0.5) / 0.5);
    const baseY = H * 0.98 + lift;
    spire.position.y = baseY;
    mast.position.y = -0.6; mast.scale.set(1, baseY + 0.6, 1);
    gasket.material = p < 0.02 ? M.rubber : M.iron;
    const qa = slide * Math.PI / 2;
    const hr = R + 0.55 * Math.sin(qa), hy = -0.12 * (1 - Math.cos(qa));
    for (const P of petals) {
      P.pivot.position.set(Math.cos(P.th) * hr, hy, Math.sin(P.th) * hr);
      P.pivot.rotation.set(0, -P.th, 0);
      P.tilt.rotation.set(0, 0, -alpha);
      P.mesh.morphTargetInfluences[0] = morph;
      // actuator: base fixed on the drum ring (rotates with spin), end on petal underside
      P.tilt.updateMatrix(); P.pivot.updateMatrix();
      tmp.copy(ptLocal).lerp(ptBloom, morph).applyMatrix4(P.tilt.matrix).applyMatrix4(P.pivot.matrix);
      const base = tmp2.set(Math.cos(P.th) * (R - 0.25), -0.5, Math.sin(P.th) * (R - 0.25));
      const d = tmp.clone().sub(base); const L = d.length(); d.normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(up, d);
      P.barrel.position.copy(base); P.barrel.quaternion.copy(q); P.barrel.scale.set(1, Math.min(0.75, L * 0.6), 1);
      P.rod.position.copy(base); P.rod.quaternion.copy(q); P.rod.scale.set(1, L, 1);
    }
  }
  set(0);
  return { root, set, petals, spin };
}
const conch = makeConch(dynRoot, CORE.cx, CORE.top + 0.3 + DRUM_H, CORE.cz);

/* ============================================================
   2. DIAMOND SHINGLE WAVE WALL — breathing building skin
   ============================================================ */
const WALL = (() => {
  const s = 0.32, d = s / Math.SQRT2 * 1.14;
  const U0 = -4.2, U1 = 4.2, V1 = CORE.top - 0.45 - G;
  const tiles = [];
  for (let j = 0; j * s / 2 <= V1; j++) for (let i = 0; ; i++) {
    const u = U0 + (i + (j % 2) * 0.5) * s; if (u > U1) break; const v = j * s / 2 + 0.08;
    // arched door opening
    if (Math.abs(u) < 1.05 && v < 2.05 + Math.sqrt(Math.max(0, 1.05 * 1.05 - u * u)) + 0.06) continue;
    tiles.push({ u, v, diag: ((u - U0) / (U1 - U0) + v / V1) / 2, edge: smooth(Math.min(U1 - Math.abs(u), v, V1 - v) / 0.7) });
  }
  const geo = new THREE.BoxGeometry(d, d, 0.016);
  geo.rotateZ(Math.PI / 4);
  const glowAttr = new THREE.InstancedBufferAttribute(new Float32Array(tiles.length), 1);
  geo.setAttribute('aGlow', glowAttr);
  const mat = new THREE.MeshStandardMaterial({ map: T.shingle, roughness: 0.7, transparent: false });
  const glowU = { value: 1 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glowU;
    sh.vertexShader = 'attribute float aGlow;\nvarying float vGlow;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = aGlow;');
    sh.fragmentShader = 'uniform float uGlow;\nvarying float vGlow;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0,0.58,0.24) * vGlow * uGlow;');
  };
  const inst = new THREE.InstancedMesh(geo, mat, tiles.length);
  inst.castShadow = true; inst.receiveShadow = true; inst.frustumCulled = false;
  dynRoot.add(inst);
  // glowing perforated backing (seen through the open shingles)
  const backMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, emissive: 0xffa04a, emissiveMap: T.perf, emissiveIntensity: 0, roughness: 0.9 });
  const skinShape = () => { const sh = new THREE.Shape(); sh.moveTo(-4.3, 0); sh.lineTo(4.3, 0); sh.lineTo(4.3, V1 + 0.1); sh.lineTo(-4.3, V1 + 0.1); sh.closePath();
    const h = new THREE.Path(); h.moveTo(-0.92, 0); h.lineTo(0.92, 0); h.lineTo(0.92, 2.0); h.absarc(0, 2.0, 0.92, 0, Math.PI, false); h.lineTo(-0.92, 0); sh.holes.push(h);
    const g = new THREE.ShapeGeometry(sh, 24); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 8.6 * 3, uv.getY(i) / 8.6 * 3); return g; };
  const back = new THREE.Mesh(skinShape(), backMat); back.rotation.y = Math.PI / 2; back.position.set(8.965, G, 0); dynRoot.add(back);
  // sponge core layer revealed in X-ray
  const sponge = new THREE.Mesh(skinShape(), new THREE.MeshStandardMaterial({ map: T.sponge, emissive: 0x6b4a10, emissiveIntensity: 0.25, roughness: 1 }));
  sponge.material.map = T.sponge.clone(); sponge.material.map.repeat.set(1.3, 1.3); sponge.material.map.needsUpdate = true;
  sponge.rotation.y = Math.PI / 2; sponge.position.set(8.985, G, 0); sponge.visible = false; dynRoot.add(sponge);
  const glowLight = new THREE.PointLight(0xffa860, 0, 8, 1.4); glowLight.position.set(10.3, G + 2.8, 2.6); scene.add(glowLight);
  const glowLight2 = new THREE.PointLight(0xffa860, 0, 8, 1.4); glowLight2.position.set(10.3, G + 4.5, -2.6); scene.add(glowLight2);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qb = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), qt = new THREE.Quaternion(), qy = new THREE.Quaternion();
  const ax = new THREE.Vector3(0, 0, 1), ay = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1);
  const A = 0.62;
  let avgWave = 0, avgOpen = 0;
  function wave(u, v, t) { return 0.5 + 0.5 * Math.sin(2 * Math.PI * v / 2.6 + 1.1 * Math.sin(u * 0.6 + t * 0.3) + t * 0.4); }
  function update(t) {
    const Sv = S.wall.p;
    let sw = 0, so = 0;
    for (let k = 0; k < tiles.length; k++) {
      const T_ = tiles[k];
      const wf = smooth(clamp(Math.min(Sv, 1) * 1.7 - T_.diag * 0.7, 0, 1));
      const of = smooth(clamp(Math.max(Sv - 1, 0) * 1.7 - T_.diag * 0.7, 0, 1));
      const doorFade = smooth((Math.hypot(T_.u, Math.max(0, T_.v - 2.0)) - 1.05) / 0.9);
      const amp = A * wf * T_.edge * doorFade;
      const w = wave(T_.u, T_.v, t);
      const e = 0.01;
      const dv = (wave(T_.u, T_.v + e, t) - w) / e * amp, du = (wave(T_.u + e, T_.v, t) - w) / e * amp;
      const bumpW = 4 * wf * (1 - wf), bumpO = 4 * of * (1 - of);   // travelling diagonal ripple during a change
      const pat = 0.55 + 0.45 * Math.sin((Math.abs(T_.u) + Math.abs(T_.v - 3.1)) * 3.2 - t * 1.2);
      const openA = of * (0.55 + 0.5 * pat) * T_.edge + bumpO * 0.25 + bumpW * 0.18;
      p.set(9.03 + 0.02 + amp * w + (bumpW + bumpO) * 0.06, G + T_.v, T_.u);
      qt.setFromAxisAngle(ax, -Math.atan(dv) - openA);
      qy.setFromAxisAngle(ay, Math.atan(du));
      q.copy(qt).multiply(qy).multiply(qb);
      m4.compose(p, q, sc); inst.setMatrixAt(k, m4);
      glowAttr.array[k] = (0.22 * wf * (1 - w) + 0.55 * of * pat);
      sw += wf; so += of;
    }
    avgWave = sw / tiles.length; avgOpen = so / tiles.length;
    inst.instanceMatrix.needsUpdate = true; glowAttr.needsUpdate = true;
    glowU.value = ENV.glow;
    backMat.emissiveIntensity = ENV.glow * (0.15 + 0.5 * avgWave + 2.2 * avgOpen) + 0.4 * avgOpen;
    glowLight.intensity = glowLight2.intensity = ENV.glow * (avgWave * 3 + avgOpen * 9);
  }
  function setXray(on) {
    mat.transparent = on; mat.opacity = on ? 0.16 : 1; mat.depthWrite = !on; mat.needsUpdate = true;
    sponge.visible = on; back.visible = !on;
  }
  return { update, setXray, get open() { return avgOpen; }, get waveAmt() { return avgWave; }, count: tiles.length };
})();

/* ============================================================
   3. INTERIOR — stair chimney, garden wall, sea-fan dividers, furniture
   ============================================================ */
/* ---- A) breathing stairwell chimney: curved wooden spiral stair ---- */
{
  const cx = CORE.cx, cz = CORE.cz, Rs = 1.35, n = 17, rise = (U - G) / n, D = THREE.MathUtils.degToRad(26);
  cyl(0.11, 0.11, U - G + 1.1, M.woodDark, cx, G, cz, { collide: true });
  const rail = [], stringer = [];
  for (let k = 0; k < n; k++) {
    const th = Math.PI + (k - (n - 1)) * D; const top = G + rise * (k + 1);
    const g = new THREE.CylinderGeometry(Rs, Rs, 0.06, 10, 1, false, Math.PI / 2 - th - D * 0.56, D * 1.12);
    const m = new THREE.Mesh(g, M.woodWarm); m.position.set(cx, top - 0.03, cz); m.castShadow = true; m.receiveShadow = true;
    scene.add(m); walkables.push(m);
  }
  for (let s = 0; s <= 120; s++) {
    const k = s / 120 * (n - 1); const th = Math.PI + (k - (n - 1)) * D; const y = G + rise * (k + 1);
    rail.push(new THREE.Vector3(cx + Math.cos(th) * (Rs - 0.04), y + 0.95, cz + Math.sin(th) * (Rs - 0.04)));
    stringer.push(new THREE.Vector3(cx + Math.cos(th) * (Rs - 0.02), y - 0.14, cz + Math.sin(th) * (Rs - 0.02)));
  }
  staticRoot.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), 200, 0.03, 8), M.woodDark));
  const st = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stringer), 200, 0.07, 8), M.woodWarm); st.castShadow = true; staticRoot.add(st);
  const bal = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.95, 5), M.iron, n * 2); const m4 = new THREE.Matrix4();
  for (let i = 0; i < n * 2; i++) { const k = Math.floor(i / 2) + (i % 2) * 0.5; const th = Math.PI + (k - (n - 1)) * D; const y = G + rise * (Math.floor(i / 2) + 1); m4.makeTranslation(cx + Math.cos(th) * (Rs - 0.04), y + 0.475, cz + Math.sin(th) * (Rs - 0.04)); bal.setMatrixAt(i, m4); }
  dynRoot.add(bal);
  // a lantern pendant hanging down the stairwell
  tube([[cx, CORE.top, cz + 0.0], [cx + 0.0, U + 1.8, cz]], 0.006, M.iron, { seg: 2 });
  const pend = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.4, 6), M.lantern); pend.position.set(cx, U + 1.6, cz); dynRoot.add(pend);
}

/* ---- B) indoor garden wall + water trough ---- */
{
  const z = CORE.z0 + 0.17;
  box(5.6, 4.3, 0.05, new THREE.MeshStandardMaterial({ color: 0x2c3f22, roughness: 1 }), 6, G, z - 0.02, { cast: false });
  const n = 620; const lg = new THREE.PlaneGeometry(0.34, 0.5); lg.translate(0, 0.22, 0);
  const leaves = new THREE.InstancedMesh(lg, M.leaf, n); const m4 = new THREE.Matrix4(); const col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = rr(3.35, 8.65), y = G + 0.25 + Math.pow(rnd(), 0.8) * 4.0, d = rr(0.02, 0.4);
    const qq = new THREE.Quaternion().setFromEuler(new THREE.Euler(rr(-1.1, 0.2), rr(-0.9, 0.9), rr(-2.6, 2.6)));
    const sc = rr(0.6, 1.6) * (y < G + 1.5 ? 1.25 : 1);
    m4.compose(new THREE.Vector3(x, y, z + d), qq, new THREE.Vector3(sc, sc, sc)); leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, col.setHSL(rr(0.24, 0.33), rr(0.35, 0.6), rr(0.45, 0.8)));
  }
  leaves.castShadow = true; dynRoot.add(leaves);
  updaters.push((dt, t) => { const f = AIR.strength; leaves.rotation.x = Math.sin(t * 1.3) * 0.004 * (0.3 + f); leaves.position.z = Math.sin(t * 0.9) * 0.01 * f; });
  // mangrove roots arching into the water
  for (let i = 0; i < 9; i++) {
    const x = 3.7 + i * 0.6 + rr(-0.15, 0.15);
    tube([[x, G + 1.5 + rr(0, 0.6), z + 0.1], [x + rr(-0.2, 0.2), G + 0.8, z + 0.35], [x + rr(-0.3, 0.3), G + 0.35, z + 0.55], [x + rr(-0.3, 0.3), G + 0.12, z + 0.7]], 0.035, M.bark, { seg: 16 });
  }
  // trough
  const tz0 = CORE.z0 + 0.2, tz1 = CORE.z0 + 0.98;
  box(5.4, 0.3, 0.12, M.stone, 6, G, tz1, { collide: false });
  box(0.12, 0.3, tz1 - tz0, M.stone, 3.35, G, (tz0 + tz1) / 2); box(0.12, 0.3, tz1 - tz0, M.stone, 8.65, G, (tz0 + tz1) / 2);
  addCollider(3.3, 8.7, G, G + 0.35, tz0, tz1 + 0.08);
  box(5.3, 0.03, tz1 - tz0, new THREE.MeshStandardMaterial({ color: 0x5c6b55, roughness: 1 }), 6, G, (tz0 + tz1) / 2, { cast: false });
  const wm = M.water.clone(); wm.normalMap = T.waterN.clone(); wm.normalMap.wrapS = wm.normalMap.wrapT = THREE.RepeatWrapping; wm.normalMap.repeat.set(4, 0.6);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.3, tz1 - tz0 - 0.05), wm); water.rotation.x = -Math.PI / 2; water.position.set(6, G + 0.22, (tz0 + tz1) / 2); dynRoot.add(water);
  updaters.push((dt, t) => { wm.normalMap.offset.set(t * 0.05, t * 0.02); });
  const peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: 0xcfc6b3, roughness: 0.6, flatShading: true }), 90);
  for (let i = 0; i < 90; i++) { m4.compose(new THREE.Vector3(rr(3.5, 8.5), G + 0.06, rr(tz0 + 0.05, tz1 - 0.08)), new THREE.Quaternion(), new THREE.Vector3(rr(0.6, 1.5), rr(0.4, 0.8), rr(0.6, 1.5))); peb.setMatrixAt(i, m4); }
  dynRoot.add(peb);
}

/* ---- C) folding sea fan room dividers ---- */
const FANS = [];
function foldingScreen(ox, oy, oz, run, nrm, n, w, h, closedA, openA) {
  const grp = new THREE.Group(); dynRoot.add(grp);
  const panels = [];
  const fanGeo = new THREE.PlaneGeometry(w - 0.08, h - 0.1);
  for (let i = 0; i < n; i++) {
    const pg = new THREE.Group(); grp.add(pg);
    const fan = new THREE.Mesh(fanGeo, M.seafan); fan.castShadow = true; fan.position.y = h / 2; pg.add(fan);
    for (const [fw, fh, fx, fy] of [[w, 0.05, 0, h - 0.025], [w, 0.05, 0, 0.025], [0.05, h, -w / 2 + 0.025, h / 2], [0.05, h, w / 2 - 0.025, h / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.045), M.woodWarm); b.position.set(fx, fy, 0); b.castShadow = true; pg.add(b);
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = h / 2; pg.add(hit);
    panels.push(pg);
    hit.userData.onSelect = () => { S.fansOpen = !S.fansOpen; refreshUI(); };
    hit.userData.hint = 'Sea fan divider';
    interactives.push(hit);
  }
  const R = new THREE.Vector3(...run).normalize(), Nn = new THREE.Vector3(...nrm).normalize();
  const st = { a: S.fansOpen ? openA : closedA };
  const cols = [];
  for (let i = 0; i < n; i++) cols.push(addCollider(0, 0, 0, 0, 0, 0));
  function update(dt) {
    const target = S.fansOpen ? openA : closedA;
    st.a += (target - st.a) * Math.min(1, dt * 2);
    const a = st.a;
    for (let i = 0; i < n; i++) {
      const P0 = new THREE.Vector3(ox, oy, oz).addScaledVector(R, i * w * Math.cos(a)).addScaledVector(Nn, (i % 2) * w * Math.sin(a));
      const P1 = new THREE.Vector3(ox, oy, oz).addScaledVector(R, (i + 1) * w * Math.cos(a)).addScaledVector(Nn, ((i + 1) % 2) * w * Math.sin(a));
      const mid = P0.clone().add(P1).multiplyScalar(0.5); const d = P1.clone().sub(P0);
      panels[i].position.copy(mid); panels[i].rotation.y = Math.atan2(-d.z, d.x);
      const c = cols[i]; c.minX = Math.min(P0.x, P1.x) - 0.05; c.maxX = Math.max(P0.x, P1.x) + 0.05; c.minZ = Math.min(P0.z, P1.z) - 0.05; c.maxZ = Math.max(P0.z, P1.z) + 0.05; c.minY = oy; c.maxY = oy + h;
    }
  }
  update(10);
  FANS.push({ update, st, closedA, openA });
  updaters.push(update);
}
// between kitchen and the core living space (in the wide opening of the x=3 wall)
foldingScreen(3.0, G, -4.08, [0, 0, 1], [1, 0, 0], 6, 0.57, 2.5, THREE.MathUtils.degToRad(9), THREE.MathUtils.degToRad(80));
// upstairs, by the curved bay window
foldingScreen(-3.85, U, 2.6, [1, 0, 0], [0, 0, 1], 4, 0.6, 2.2, THREE.MathUtils.degToRad(12), THREE.MathUtils.degToRad(78));
// dappled light projected through the sea fan screens (real alpha-tested shadows)
const dapple = new THREE.SpotLight(0xffe2b0, 0, 14, 0.55, 0.6, 1.2);
dapple.position.set(-0.6, G + 3.0, -2.5); dapple.target.position.set(5.5, G, -1.6);
dapple.castShadow = true; dapple.shadow.mapSize.set(1024, 1024); dapple.shadow.bias = -0.0005;
scene.add(dapple, dapple.target);

/* ---- furniture & life ---- */
function person(x, y, z, ry, pose = 'sit', book = false, skin = M.skin, cloth = M.clothA) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; dynRoot.add(g);
  const add = (geo, mat, px, py, pz, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  const limb = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 8);
  if (pose === 'sit') {
    add(limb(0.16, 0.36), cloth, 0, 0.82, -0.05, -0.12);
    add(new THREE.SphereGeometry(0.11, 14, 10), skin, 0, 1.24, -0.0);
    add(new THREE.SphereGeometry(0.115, 14, 10), M.hair, 0, 1.28, -0.04);
    for (const s of [-1, 1]) {
      add(limb(0.075, 0.36), M.clothB, s * 0.1, 0.5, 0.18, Math.PI / 2);
      add(limb(0.06, 0.36), M.clothB, s * 0.1, 0.24, 0.4);
      add(limb(0.05, 0.26), cloth, s * 0.2, 0.86, 0.06, book ? -0.9 : -0.3, s * 0.15);
      add(limb(0.045, 0.22), skin, s * 0.15, 0.78, 0.26, book ? -1.4 : -1.2);
    }
    if (book) { const b = add(new THREE.BoxGeometry(0.28, 0.02, 0.2), M.linen, 0, 0.86, 0.38, -0.7); const cvr = add(new THREE.BoxGeometry(0.29, 0.012, 0.21), M.tileBlue, 0, 0.85, 0.385, -0.7); }
  } else {
    add(limb(0.16, 0.45), cloth, 0, 1.2, 0);
    add(new THREE.SphereGeometry(0.11, 14, 10), skin, 0, 1.68, 0);
    add(new THREE.SphereGeometry(0.115, 14, 10), M.hair, 0, 1.72, -0.04);
    for (const s of [-1, 1]) { add(limb(0.07, 0.7), M.clothB, s * 0.1, 0.48, 0); add(limb(0.05, 0.5), cloth, s * 0.22, 1.15, 0, 0, s * 0.08); }
  }
  return g;
}
function chair(x, y, z, ry, mat = M.woodWarm) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; staticRoot.add(g);
  const b = (w, h, d, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); };
  b(0.46, 0.05, 0.46, 0, 0.46, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b(0.04, 0.46, 0.04, sx * 0.2, 0.23, sz * 0.2);
  b(0.46, 0.5, 0.04, 0, 0.75, -0.21); b(0.4, 0.04, 0.03, 0, 0.62, -0.21);
  const cu = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.42), M.linen); cu.position.set(0, 0.5, 0); g.add(cu);
}
function sofa(x, y, z, ry, len = 2.3) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; staticRoot.add(g);
  const b = (w, h, d, px, py, pz, m = M.sofa) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(px, py, pz); me.castShadow = true; me.receiveShadow = true; g.add(me); };
  b(len, 0.25, 0.85, 0, 0.2, 0, M.woodDark);
  b(len - 0.1, 0.2, 0.75, 0, 0.42, 0.02);
  b(len, 0.5, 0.2, 0, 0.6, -0.33);
  b(0.18, 0.35, 0.85, -len / 2 + 0.09, 0.5, 0); b(0.18, 0.35, 0.85, len / 2 - 0.09, 0.5, 0);
  b(0.4, 0.36, 0.12, -len / 2 + 0.45, 0.68, -0.18, M.cushionBlue); b(0.4, 0.36, 0.12, len / 2 - 0.45, 0.68, -0.18, M.cushionRust);
  b(0.38, 0.34, 0.12, 0, 0.68, -0.18, M.linen);
  const th = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.8), M.throwB); th.position.set(len / 2 - 0.5, 0.54, 0.05); g.add(th);
}
function fruitBowl(x, y, z, s = 1) {
  const pts = [[0, 0], [0.08, 0], [0.16, 0.05], [0.2, 0.12], [0.19, 0.12], [0.15, 0.06], [0, 0.03]].map(p => new THREE.Vector2(p[0] * s, p[1] * s));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), M.ceramic); bowl.position.set(x, y, z); bowl.castShadow = true; staticRoot.add(bowl);
  const fm = [M.fruitY, M.fruitO, M.fruitG, M.fruitR, M.fruitO, M.fruitY, M.fruitG];
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; sphere(0.045 * s * (i === 0 ? 1.4 : 1), fm[i], x + Math.cos(a) * 0.08 * s * (i ? 1 : 0), y + 0.1 * s + (i === 0 ? 0.03 : 0), z + Math.sin(a) * 0.08 * s * (i ? 1 : 0)); }
}
function floorLamp(x, y, z) {
  cyl(0.15, 0.17, 0.03, M.iron, x, y, z); cyl(0.015, 0.015, 1.45, M.iron, x, y, z);
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 20, 1, true), M.lampShade); sh.position.set(x, y + 1.5, z); dynRoot.add(sh);
}
function books(x, y, z, n, along = 'x', ry = 0) {
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.book, n); const m4 = new THREE.Matrix4(); const c = new THREE.Color();
  let o = 0;
  for (let i = 0; i < n; i++) {
    const w = rr(0.025, 0.06), h = rr(0.18, 0.28), d = rr(0.14, 0.2);
    const px = along === 'x' ? x + o : x, pz = along === 'z' ? z + o : z;
    m4.compose(new THREE.Vector3(px, y + h / 2, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), along === 'x' ? new THREE.Vector3(w, h, d) : new THREE.Vector3(d, h, w));
    inst.setMatrixAt(i, m4); inst.setColorAt(i, c.setHSL(rnd(), rr(0.25, 0.55), rr(0.25, 0.6))); o += w + 0.004;
  }
  inst.castShadow = true; dynRoot.add(inst);
}
function rug(x, y, z, w, d, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.035, z); m.receiveShadow = true; staticRoot.add(m); }

{ // CORE living + dining
  rug(6.3, G, 2.6, 3.0, 1.9, M.rug);
  sofa(6.3, G, 3.9, Math.PI);
  person(6.0, G + 0.02, 3.72, Math.PI, 'sit', true, M.skin, M.clothA);
  box(1.1, 0.4, 0.6, M.woodDark, 6.3, G, 2.55);
  fruitBowl(6.0, G + 0.4, 2.55, 0.9); books(6.55, G + 0.4, 2.5, 4, 'x');
  chair(8.2, G, 2.3, -Math.PI / 2 - 0.4, M.woodDark);
  floorLamp(4.7, G, 3.9);
  box(0.5, 0.55, 0.5, M.woodDark, 7.8, G, 3.95); books(7.65, G + 0.55, 3.95, 5, 'x');
  pottedPlant(8.6, G, 3.9, 1.4, 0); pottedPlant(3.6, G, 3.9, 1.2, 0);
  // dining table by the garden wall
  box(2.0, 0.06, 0.95, M.woodWarm, 6.2, G + 0.72, -2.65);
  for (const sx of [-0.9, 0.9]) for (const sz of [-0.38, 0.38]) box(0.08, 0.72, 0.08, M.woodWarm, 6.2 + sx, G, -2.65 + sz);
  addCollider(5.2, 7.2, G, G + 0.78, -3.15, -2.15);
  for (const x of [5.55, 6.25, 6.95]) { chair(x, G, -1.98, Math.PI); chair(x, G, -3.3, 0); }
  fruitBowl(6.2, G + 0.78, -2.65, 1.2);
  const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.35), M.linen); runner.rotation.x = -Math.PI / 2; runner.position.set(6.2, G + 0.785, -2.65); staticRoot.add(runner);
  for (const x of [5.4, 7.0]) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.22, 12), M.tileBlue); v.position.set(x, G + 0.89, -2.65); staticRoot.add(v); }
  // pendant over dining
  tube([[6.2, CORE.top, -2.65], [6.2, G + 2.3, -2.65]], 0.006, M.iron, { seg: 2 });
  const ps = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.25, 20, 1, true), M.lampShade); ps.position.set(6.2, G + 2.2, -2.65); dynRoot.add(ps);
}
{ // KITCHEN (west part, back)
  const kz = -5.55;
  box(5.2, 0.86, 0.6, M.woodWarm, -1.35, G, kz, { collide: true });
  box(5.3, 0.05, 0.64, M.counter, -1.35, G + 0.86, kz);
  box(5.2, 0.6, 0.02, M.tileBlue, -1.35, G + 0.91, -5.86, { cast: false });
  box(0.6, 0.86, 2.6, M.woodWarm, -3.6, G, -3.95, { collide: true });
  box(0.64, 0.05, 2.7, M.counter, -3.6, G + 0.86, -3.95);
  for (const x of [-3.4, 0.8]) { box(1.0, 0.03, 0.3, M.woodDark, x, G + 1.75, -5.85 + 0.15); box(1.0, 0.03, 0.3, M.woodDark, x, G + 2.15, -5.85 + 0.15); }
  for (let i = 0; i < 6; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, rr(0.12, 0.22), 12), [M.ceramic, M.tileBlue, M.pot][i % 3]); j.position.set(-3.75 + i * 0.13, G + 1.86, -5.72); staticRoot.add(j); }
  for (let i = 0; i < 5; i++) { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.16, 12), [M.ceramic, M.pot][i % 2]); j.position.set(0.45 + i * 0.16, G + 2.25, -5.72); staticRoot.add(j); }
  // island + stools
  box(2.0, 0.86, 0.9, M.woodWarm, -1.3, G, -3.0, { collide: true });
  box(2.1, 0.05, 1.0, M.counter, -1.3, G + 0.86, -3.0);
  for (const x of [-1.9, -1.3, -0.7]) { cyl(0.17, 0.17, 0.05, M.woodDark, x, G + 0.7, -2.2); cyl(0.025, 0.025, 0.7, M.iron, x, G, -2.2); }
  fruitBowl(-1.0, G + 0.91, -3.0, 1.1);
  const board = box(0.45, 0.03, 0.3, M.woodWarm, -1.75, G + 0.91, -3.05);
  // range + hood
  box(0.8, 0.02, 0.55, M.iron, -2.2, G + 0.91, kz);
  box(0.9, 0.6, 0.55, M.stucco, -2.2, G + 2.0, -5.6);
  // hanging pots
  for (let i = 0; i < 4; i++) { const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.12, 14), M.pot); pt.position.set(-2.0 + i * 0.3, G + 2.25, -3.0); staticRoot.add(pt); }
  box(1.5, 0.04, 0.04, M.iron, -1.55, G + 2.4, -3.0);
  pottedPlant(2.3, G, -5.3, 1.3, 0);
  // herbs on sill
  for (let i = 0; i < 3; i++) pottedPlant(-2.7 + i * 0.45, G + 0.91, -5.75, 0.35, 1);
}
{ // HALL (west part, front)
  rug(-0.5, G, 3.6, 2.2, 3.2, M.rug2);
  box(1.4, 0.8, 0.4, M.woodDark, -3.6, G, 3.2, { collide: true });
  const mir = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshStandardMaterial({ color: 0xcfd9dd, metalness: 1, roughness: 0.05 })); mir.position.set(-3.86, G + 1.65, 3.2); mir.rotation.y = Math.PI / 2; dynRoot.add(mir);
  const mf = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 32), M.woodWarm); mf.position.copy(mir.position); mf.rotation.y = Math.PI / 2; staticRoot.add(mf);
  pottedPlant(-3.4, G + 0.8, 3.5, 0.5, 2); books(-3.75, G + 0.8, 2.75, 7, 'z');
  // bookcase
  box(0.35, 2.2, 1.8, M.woodDark, -3.7, G, 0.6, { collide: true });
  for (let s = 0; s < 4; s++) books(-3.62, G + 0.3 + s * 0.48, -0.1, 22, 'z');
  pottedPlant(2.4, G, 4.9, 1.3, 0); pottedPlant(-3.4, G, 5.4, 1.2, 0);
  box(1.4, 0.45, 0.4, M.woodWarm, 1.8, G, 1.0); // bench
  floorLamp(1.0, G, 4.8);
}
{ // UPPER FLOOR — bedroom + sitting by the bay window
  rug(-1.5, U, -4.3, 2.8, 2.4, M.rug2);
  box(1.9, 0.35, 2.1, M.woodDark, -1.5, U, -4.85, { collide: true });
  box(1.85, 0.22, 2.0, M.bedding, -1.5, U + 0.35, -4.85);
  box(1.95, 1.1, 0.08, M.woodDark, -1.5, U, -5.88);
  for (const x of [-2.1, -0.9]) box(0.55, 0.12, 0.35, M.linen, x, U + 0.57, -5.6);
  box(1.9, 0.05, 0.9, M.throwB, -1.5, U + 0.57, -4.2);
  for (const x of [-2.85, -0.15]) { box(0.5, 0.55, 0.45, M.woodWarm, x, U, -5.6); cyl(0.07, 0.1, 0.3, M.ceramic, x, U + 0.55, -5.6); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 16, 1, true), M.lampShade); sh.position.set(x, U + 0.95, -5.6); dynRoot.add(sh); }
  box(0.6, 2.2, 1.6, M.woodWarm, -3.65, U, -2.3, { collide: true });
  box(0.6, 2.2, 1.6, M.woodWarm, 2.6, U, -4.3, { collide: true });
  pottedPlant(2.4, U, -1.8, 1.3, 0);
  // sitting by the bay
  rug(-0.5, U, 6.2, 2.6, 1.6, M.rug);
  person(-0.5, U, 6.65, 0, 'sit', false, M.skin2, M.clothB);
  chair(-0.5, U, 6.65, 0, M.woodDark);
  chair(-1.85, U, 6.2, 0.7, M.woodDark);
  box(0.45, 0.5, 0.45, M.woodWarm, 0.6, U, 6.4); fruitBowl(0.6, U + 0.5, 6.4, 0.7);
  pottedPlant(1.2, U, 7.3, 1.1, 0); pottedPlant(-2.3, U, 7.2, 1.0, 2);
  box(1.6, 0.8, 0.35, M.woodDark, 2.6, U, 2.0, { collide: true }); books(2.5, U + 0.8, 1.4, 14, 'z');
  floorLamp(-3.5, U, 4.5);
  // gallery loggia chairs
  chair(5.2, U, 4.05, Math.PI, M.woodWarm); chair(6.8, U, 4.05, Math.PI, M.woodWarm);
  pottedPlant(8.4, U, 4.0, 1.1, 2); pottedPlant(3.6, U, 4.0, 1.0, 0);
}

/* ---- curtains that move in the breeze ---- */
const CURTAINS = [];
function curtain(x, y, z, w, h, ry) {
  const g = new THREE.PlaneGeometry(w, h, 10, 12); g.translate(0, -h / 2, 0);
  const base = g.attributes.position.array.slice();
  const m = new THREE.Mesh(g, M.curtain); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; dynRoot.add(m);
  CURTAINS.push({ m, g, base, h, ph: rnd() * 6 });
}
curtain(-2.55, U + 2.75, 6.05, 0.9, 2.6, 0); curtain(1.55, U + 2.75, 6.05, 0.9, 2.6, 0);
curtain(-1.5, U + 2.5, -5.8, 1.9, 1.9, 0);
curtain(-3.0, G + 2.75, 5.82, 1.1, 2.0, 0); curtain(2.0, G + 2.75, 5.82, 1.1, 2.0, 0);
curtain(-2.2, G + 2.5, -5.82, 1.8, 1.6, 0);
updaters.push((dt, t) => {
  const f = 0.04 + AIR.strength * 0.18 + (S.weather === 'storm' ? 0 : 0.02);
  for (const c of CURTAINS) {
    const p = c.g.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) {
      const bx = c.base[i], by = c.base[i + 1]; const k = -by / c.h;
      p[i + 2] = 0.04 * Math.sin(bx * 18) + k * k * f * Math.sin(t * 1.8 + bx * 2 + by * 1.3 + c.ph);
      p[i] = bx + k * f * 0.3 * Math.sin(t * 1.3 + c.ph);
    }
    c.g.attributes.position.needsUpdate = true; c.g.computeVertexNormals();
  }
});

/* ============================================================
   AIRFLOW — blue cool air in low, warm air rising out of the conch
   ============================================================ */
const AIR = (() => {
  const top = CORE.top + 0.9;
  const spiralUp = (x0, z0, y0, y1, r, turns, phase) => { const pts = []; for (let s = 0; s <= 8; s++) { const q = s / 8; const a = phase + q * turns * Math.PI * 2; pts.push([CORE.cx + Math.cos(a) * r * (1 - q * 0.4), lerp(y0, y1, q), CORE.cz + Math.sin(a) * r * (1 - q * 0.4)]); } return pts; };
  const exit = [[CORE.cx, top, CORE.cz], [CORE.cx + 0.3, top + 2.5, CORE.cz + 0.2], [CORE.cx + 1.0, top + 5, CORE.cz + 0.8]];
  const P = (arr) => new THREE.CatmullRomCurve3(arr.map(a => new THREE.Vector3(...a)));
  const paths = [
    { id: 'wallA', need: 'wall', c: P([[10.4, G + 0.35, 2.6], [8.9, G + 0.35, 2.4], [7.6, G + 0.4, 1.9], ...spiralUp(0, 0, G + 0.8, CORE.top - 0.3, 1.0, 1.1, 0.6), ...exit]) },
    { id: 'wallB', need: 'wall', c: P([[10.4, G + 0.3, -2.4], [8.9, G + 0.35, -2.2], [7.6, G + 0.45, -1.7], ...spiralUp(0, 0, G + 0.9, CORE.top - 0.3, 0.9, 1.0, -0.8), ...exit]) },
    { id: 'garden', need: 'wall', c: P([[10.4, G + 0.3, -3.6], [8.9, G + 0.3, -3.7], [7.5, G + 0.32, -3.95], [5.5, G + 0.35, -3.95], [4.0, G + 0.55, -3.7], [4.4, G + 1.8, -2.6], [5.2, G + 3.2, -1.3], ...spiralUp(0, 0, G + 3.8, CORE.top - 0.3, 0.8, 0.6, -2), ...exit]) },
    { id: 'porch', need: 'roof', c: P([[4.2, G + 0.4, 7.2], [4.2, G + 0.45, 4.5], [4.6, G + 0.6, 2.8], [5.0, G + 1.0, 1.6], ...spiralUp(0, 0, G + 1.4, CORE.top - 0.3, 1.1, 0.9, 2.2), ...exit]) },
    { id: 'fans', need: 'fans', c: P([[-2.2, G + 1.6, -6.8], [-2.0, G + 1.2, -5.0], [0.0, G + 1.0, -3.6], [1.8, G + 1.05, -2.6], [3.0, G + 1.1, -2.4], [4.6, G + 1.3, -1.9], [5.2, G + 2.4, -1.0], ...spiralUp(0, 0, G + 3.0, CORE.top - 0.3, 0.9, 0.7, 3.4), ...exit]) },
    { id: 'bay', need: 'roof', c: P([[-0.5, U + 1.3, 9.2], [-0.5, U + 1.3, 6.5], [0.6, U + 1.5, 3.0], [2.4, U + 1.5, 0.2], [3.6, U + 1.5, 0], [5.0, U + 2.2, 0.3], [CORE.cx, CORE.top - 0.3, CORE.cz], ...exit]) },
    { id: 'xray', need: 'xray', c: P([[9.0, G + 0.4, -4.1], [9.0, G + 0.7, -2.5], [9.0, G + 1.1, -0.8], [9.0, G + 2.6, 1.6], [9.0, G + 3.6, 3.4], [9.0, G + 5.2, 2.6], [9.0, CORE.top - 0.6, 1.2], [7.6, CORE.top + 0.3, 0.6], [CORE.cx, top + 1.5, CORE.cz]]) },
    { id: 'xray2', need: 'xray', c: P([[9.0, G + 0.5, 4.1], [9.0, G + 0.9, 2.4], [9.0, G + 1.5, 0.9], [9.0, G + 3.0, -1.5], [9.0, G + 4.4, -3.2], [9.0, CORE.top - 0.6, -1.5], [7.6, CORE.top + 0.3, -0.6], [CORE.cx, top + 1.5, CORE.cz]]) },
  ];
  for (const p of paths) { p.len = p.c.getLength(); if (p.id === 'fans') p.tScreen = 0.25; }
  const N = 420;
  const geo = new THREE.ConeGeometry(0.04, 0.17, 6); geo.rotateX(0); // tip on +y
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, fog: false }), N);
  inst.frustumCulled = false; inst.renderOrder = 3; scene.add(inst);
  const parts = [];
  for (let i = 0; i < N; i++) parts.push({ p: i % paths.length, t: rnd(), j: new THREE.Vector3(rr(-0.28, 0.28), rr(-0.15, 0.15), rr(-0.28, 0.28)), sp: rr(0.8, 1.25) });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), upV = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), tan = new THREE.Vector3(), sc = new THREE.Vector3();
  const blue = new THREE.Color(0x46b2ff), warm = new THREE.Color(0xff9a4a), c = new THREE.Color();
  const st = { strength: 0, enabled: {} };
  function update(dt, t) {
    const storm = S.weather === 'storm';
    const roofOpen = smooth(S.roof.p / 0.3);
    const wallOpen = smooth((S.wall.p - 1) / 0.6);
    const calm = storm ? 0 : 1;
    const en = {
      wall: calm * roofOpen * wallOpen,
      roof: calm * roofOpen,
      fans: calm * roofOpen,
      xray: S.xray ? calm * Math.max(wallOpen, 0) : 0,
    };
    st.strength = Math.max(en.wall, en.roof * 0.6);
    for (let i = 0; i < N; i++) {
      const P = parts[i], path = paths[P.p];
      const e = en[path.need] || 0;
      const visible = (i / N) < e * (path.need === 'xray' ? 1 : 1);
      P.t += dt * 1.05 * P.sp * (0.4 + 0.6 * e) / path.len * (path.c.getPointAt ? 1 : 1);
      if (P.t > 1) P.t -= 1;
      let tt = P.t; let hide = !visible;
      if (path.id === 'fans' && !S.fansOpen && tt > path.tScreen) hide = true;
      if (hide) { m4.makeScale(0, 0, 0); inst.setMatrixAt(i, m4); continue; }
      path.c.getPointAt(tt, pos); path.c.getTangentAt(tt, tan);
      pos.add(P.j);
      q.setFromUnitVectors(upV, tan);
      const fade = Math.min(1, tt / 0.06, (1 - tt) / 0.12);
      sc.setScalar(Math.max(0.001, fade));
      m4.compose(pos, q, sc); inst.setMatrixAt(i, m4);
      const h = smooth((pos.y - G - 1.6) / 4.5);
      inst.setColorAt(i, c.copy(blue).lerp(warm, path.need === 'xray' ? 0 : h));
    }
    inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  }
  updaters.push(update);
  return st;
})();
