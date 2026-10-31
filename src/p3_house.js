/* ============================================================
   THE HOUSE — Mediterranean / Spanish shell
   ============================================================ */
T.perf = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d9ccb3'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6b5a40';
  for (let y = 8; y < h; y += 16) for (let x = 8 + ((y / 16) % 2) * 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
}, { rep: [3, 3] });
M.lining.map = T.perf;

const DOORS = [];
{
  /* ---- plinth / terraces ---- */
  box(13, G, 12, M.stone, 2.5, 0, 0, { cast: true });
  addCollider(-4, 9, 0, G, -6, 6);
  box(11.5, G, 1.4, M.stone, 3.25, 0, 6.7);
  addCollider(-2.5, 9, 0, G, 6, 7.4);
  // floors
  box(7, 0.03, 12, M.woodFloor, -0.5, G, 0, { walk: true, cast: false });                         // west part ground floor
  box(6, 0.03, 9, M.flag, 6, G, 0, { walk: true, cast: false });                                   // core (cool stone floor)
  box(6, 0.03, 1.5, M.flag, 6, G, 5.25, { walk: true, cast: false });                              // front porch
  box(6, 0.03, 1.5, M.flag, 6, G, -5.25, { walk: true, cast: false });                             // back terrace
  box(11.5, 0.03, 1.4, M.flag, 3.25, G, 6.7, { walk: true, cast: false });                         // front terrace
  // front entry steps (down to path)
  for (let i = 0; i < 4; i++) {
    const top = G - 0.18 * (i + 1);
    box(3.0, top, 0.42, M.flag, -0.5, 0, 7.4 + 0.21 + i * 0.42, { walk: true, collide: true });
  }
  // stone cheek walls + pillars with flowers & lanterns
  for (const x of [-2.25, 1.25]) {
    box(0.45, 0.75, 1.7, M.stone, x, 0, 8.25);
    addCollider(x - 0.23, x + 0.23, 0, 3, 7.4, 9.1);
    box(0.6, 1.5, 0.6, M.stone, x, 0, 8.9);
    pottedPlant(x, 1.5, 8.9, 1.05, 2);
    vine([[x - 0.3, 0.1, 9.2], [x - 0.32, 0.8, 9.21], [x - 0.1, 1.4, 9.21], [x + 0.2, 1.5, 9.1]], 30);
  }
  // east door landing + steps
  box(0.8, G, 2.4, M.stone, 9.4, 0, 0, { walk: true });
  for (let i = 0; i < 4; i++) box(0.42, G - 0.18 * (i + 1), 2.4, M.flag, 9.8 + 0.21 + i * 0.42, 0, 0, { walk: true, collide: true });
  // front-terrace railing (after steps) + west edge
  railing([1.0, G, 7.38], [9.0, G, 7.38]);
  railing([-2.5, G, 7.38], [-2.0, G, 7.38]);
  railing([-2.5, G, 6.05], [-2.5, G, 7.38]);
  railing([9.0, G, 4.5], [9.0, G, 7.38]);
  railing([9.0, G, -4.5], [9.0, G, -6.0]);
  // back terrace edge
  railing([3.0, G, -6.0], [9.0, G, -6.0]);

  /* ---- west part — ground floor walls (stone) ---- */
  const H1 = U - G;
  wall('x', -4, 3, 6, G, H1, 0.25, M.stone, [
    { c: -0.5, w: 1.7, h: 2.7, arch: true },
    { c: -3.0, w: 0.9, y: 1.0, h: 1.6, arch: true, mullion: true },
    { c: 2.0, w: 0.9, y: 1.0, h: 1.6, arch: true, mullion: true }]);
  wall('z', -6, 6, -4, G, H1, 0.25, M.stone, []);
  wall('x', -4, 3, -6, G, H1, 0.25, M.stone, [
    { c: -2.2, w: 1.6, y: 1.05, h: 1.3, mullion: true },
    { c: 1.2, w: 0.9, y: 0.9, h: 1.7, arch: true, mullion: true }]);
  wall('z', -6, 6, 3, G, H1, 0.25, M.stone, [
    { c: -2.4, w: 3.4, h: 2.6, glass: false },
    { c: 2.6, w: 1.5, h: 2.7, arch: true }]);
  // upper floor slab + beamed ceiling
  box(7.25, 0.25, 12.25, M.woodFloor, -0.5, U - 0.25, 0, { walk: true });
  for (let z = -5.4; z <= 5.4; z += 0.9) box(7, 0.16, 0.14, M.woodDark, -0.5, U - 0.41, z, { cast: false });

  /* ---- west part — upper floor walls (stucco) ---- */
  const H2 = 3.0;
  wall('x', -4, 3, 6, U, H2, 0.25, M.stucco, [
    { c: -0.5, w: 4.4, h: 2.75, glass: false },
    { c: -3.3, w: 0.8, y: 0.9, h: 1.4, arch: true, mullion: true },
    { c: 2.3, w: 0.8, y: 0.9, h: 1.4, arch: true, mullion: true }]);
  wall('z', -6, 6, -4, U, H2, 0.25, M.stucco, [
    { c: 1.0, w: 1.1, h: 2.3, arch: true },
    { c: -4.0, w: 0.9, y: 0.9, h: 1.4, arch: true, mullion: true }]);
  wall('x', -4, 3, -6, U, H2, 0.25, M.stucco, [
    { c: -1.5, w: 1.4, y: 0.85, h: 1.5, arch: true, mullion: true },
    { c: 1.5, w: 0.9, y: 0.9, h: 1.4, arch: true, mullion: true }]);
  wall('z', -6, 6, 3, U, CORE.top - U, 0.25, M.stucco, [
    { c: 0, w: 1.4, h: 2.4, arch: true },
    { c: 3.85, w: 1.0, h: 2.3, arch: true }]);
  // ceiling + hip roof
  box(7.25, 0.15, 12.25, M.stucco, -0.5, U + H2, 0, { cast: false });
  hipRoof(-4.7, 3.0, -6.7, 6.7, U + H2 + 0.12, 1.6, M.terracotta);
  // stucco band / cornice between floors
  box(7.4, 0.22, 0.12, M.stucco, -0.5, U - 0.1, 6.17);
  box(7.4, 0.22, 0.12, M.stucco, -0.5, U - 0.1, -6.17);

  /* ---- curved bay window (upper floor, front) ---- */
  {
    const bx = -0.5, bz = 6.0, R = 2.2, ts = -Math.PI / 2, tl = Math.PI;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.3, 32, 1, false, ts, tl), M.woodFloor);
    fl.position.set(bx, U - 0.15, bz); fl.receiveShadow = true; fl.castShadow = true; scene.add(fl); walkables.push(fl);
    const sill = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.45, 32, 1, true, ts, tl), M.stucco);
    sill.position.set(bx, U + 0.22, bz); sill.material = M.stucco; sill.castShadow = true; staticRoot.add(sill);
    const sillIn = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.12, R - 0.12, 0.45, 32, 1, true, ts, tl), new THREE.MeshStandardMaterial({ map: T.stucco, side: THREE.BackSide, roughness: 0.9 }));
    sillIn.position.copy(sill.position); staticRoot.add(sillIn);
    const ledge = new THREE.Mesh(new THREE.RingGeometry(R - 0.14, R + 0.02, 32, 1, 0, Math.PI), M.woodDark);
    ledge.rotation.x = -Math.PI / 2; ledge.rotation.z = Math.PI; ledge.position.set(bx, U + 0.46, bz); ledge.rotation.set(-Math.PI / 2, 0, Math.PI); staticRoot.add(ledge);
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 2.2, 32, 1, true, ts, tl), M.glass);
    gl.position.set(bx, U + 0.45 + 1.1, bz); gl.renderOrder = 2; scene.add(gl);
    for (let k = 0; k <= 8; k++) {
      const a = ts + tl * k / 8; const x = bx + Math.sin(a) * (R - 0.05), z = bz + Math.cos(a) * (R - 0.05);
      box(0.07, 2.2, 0.07, M.woodDark, x, U + 0.45, z, { ry: a });
      addCollider(x - 0.3, x + 0.3, U, U + 2.8, z - 0.3, z + 0.3);
    }
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, 0.35, 32, 1, false, ts, tl), M.stucco);
    band.position.set(bx, U + 2.65 + 0.175, bz); band.castShadow = true; staticRoot.add(band);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(R + 0.4, 0.9, 32, 1, false, ts, tl), M.terracotta);
    cap.position.set(bx, U + 3.0 + 0.45, bz); cap.castShadow = true; staticRoot.add(cap);
    // corbels under the bay
    for (let k = 1; k < 8; k += 2) {
      const a = ts + tl * k / 8; const x = bx + Math.sin(a) * (R - 0.3), z = bz + Math.cos(a) * (R - 0.3);
      box(0.18, 0.5, 0.6, M.woodDark, x, U - 0.8, z, { ry: a });
    }
  }

  /* ---- CORE walls (stucco, double height) ---- */
  const HC = CORE.top - G;
  wall('x', 3, 9, 4.5, G, HC, 0.3, M.stucco, [
    { c: 4.2, w: 1.2, h: 2.6, arch: true },
    { c: 7.8, w: 1.1, y: 0.5, h: 2.4, arch: true, mullion: true },
    { c: 4.2, w: 1.35, y: 3.4, h: 2.5, arch: true, glass: false },
    { c: 6.0, w: 1.35, y: 3.4, h: 2.5, arch: true, glass: false },
    { c: 7.8, w: 1.35, y: 3.4, h: 2.5, arch: true, glass: false }]);
  for (const c of [4.2, 6.0, 7.8]) railing([c - 0.62, U, 4.5], [c + 0.62, U, 4.5], 0.95, 0.11);
  wall('x', 3, 9, -4.5, G, HC, 0.3, M.stucco, [
    { c: 4.5, w: 1.0, y: 4.6, h: 1.4, arch: true },
    { c: 7.5, w: 1.0, y: 4.6, h: 1.4, arch: true }]);
  // corner pilasters (stacked stone) framing the breathing wall
  box(0.5, HC + 0.1, 0.55, M.stone, 9.05, G, 4.5, { collide: true });
  box(0.5, HC + 0.1, 0.55, M.stone, 9.05, G, -4.5, { collide: true });
  box(0.5, 0.45, 9.5, M.stucco, 9.05, CORE.top - 0.4, 0);
  // perforated inner lining of the breathing wall (with arched door)
  wall('z', -4.5, 4.5, 8.92, G, HC - 0.4, 0.06, M.lining, [{ c: 0, w: 1.8, h: 2.9, arch: true }]);
  // gallery (upper loggia) + bridge from spiral stair
  box(6, 0.22, 1.3, M.woodFloor, 6, U - 0.22, 3.85, { walk: true });
  box(1.6, 0.22, 1.4, M.woodFloor, 3.8, U - 0.22, 0, { walk: true });
  railing([3.15, U, 3.2], [8.85, U, 3.2]);
  railing([3.15, U, 0.7], [4.62, U, 0.7]);
  railing([3.15, U, -0.7], [4.62, U, -0.7]);
  // porch shed roof + columns
  {
    const pr = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.0), M.terracotta);
    pr.rotation.x = -Math.PI / 2 + 0.28; pr.position.set(6, G + 3.05, 5.45); pr.castShadow = true; pr.receiveShadow = true; staticRoot.add(pr);
    T.terracotta.repeat.set(0.7, 0.7);
    for (const x of [3.35, 6.1, 8.75]) { box(0.32, 2.75, 0.32, M.stone, x, G, 6.05, { collide: true }); }
    box(6.2, 0.2, 0.3, M.woodDark, 6, G + 2.75, 6.05);
  }
  // core flat roof with circular opening for the conch
  {
    // big roof slab overhanging the breathing wall as a canopy; circular opening for the conch
    const X0 = 1.75 - CORE.cx, X1 = 10.6 - CORE.cx, Z0 = -4.75, Z1 = 4.75;
    const sh = new THREE.Shape(); sh.moveTo(X0, Z0); sh.lineTo(X1, Z0); sh.lineTo(X1, Z1); sh.lineTo(X0, Z1); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, ROOF_R + 0.05, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false, curveSegments: 64 });
    g.rotateX(Math.PI / 2); const m = new THREE.Mesh(g, M.stucco); m.position.set(CORE.cx, CORE.top + 0.3, CORE.cz);
    m.castShadow = true; m.receiveShadow = true; m.userData.keep = true; staticRoot.add(m); walkables.push(m);
    const cx0 = CORE.cx + X0, cx1 = CORE.cx + X1;
    box(cx1 - cx0 + 0.2, 0.12, 0.3, M.terracotta, (cx0 + cx1) / 2, CORE.top + 0.3, Z1); box(cx1 - cx0 + 0.2, 0.12, 0.3, M.terracotta, (cx0 + cx1) / 2, CORE.top + 0.3, Z0);
    box(0.3, 0.12, Z1 - Z0, M.terracotta, cx1, CORE.top + 0.3, 0);
    // stone fascia band under the canopy + corbels
    box(cx1 - cx0, 0.35, 0.12, M.stone, (cx0 + cx1) / 2, CORE.top - 0.35, Z1 + 0.06); box(cx1 - cx0, 0.35, 0.12, M.stone, (cx0 + cx1) / 2, CORE.top - 0.35, Z0 - 0.06);
    box(0.12, 0.35, Z1 - Z0, M.stone, cx1 + 0.06, CORE.top - 0.35, 0);
    for (let z = -4.2; z <= 4.21; z += 1.4) box(1.5, 0.3, 0.2, M.woodDark, 9.8, CORE.top - 0.3, z);
    // two stone columns carrying the canopy corners over the breathing wall
    for (const z of [-4.45, 4.45]) { box(0.45, CORE.top, 0.45, M.stone, 10.3, 0, z, { collide: true }); }
    // roof-deck railings (corners are walkable)
    addCollider(cx0, cx1, CORE.top + 0.3, CORE.top + 1.5, Z1 - 0.15, Z1 + 0.1); addCollider(cx0, cx1, CORE.top + 0.3, CORE.top + 1.5, Z0 - 0.1, Z0 + 0.15);
    addCollider(cx1 - 0.15, cx1 + 0.1, CORE.top + 0.3, CORE.top + 1.5, Z0, Z1);
    addCollider(cx0 - 0.1, cx0 + 0.15, CORE.top, CORE.top + 2, Z0, Z1);
    // drum the conch sits on
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(ROOF_R + 0.08, ROOF_R + 0.08, DRUM_H, 64, 1, true), new THREE.MeshStandardMaterial({ map: T.stone, side: THREE.DoubleSide, roughness: 0.9 }));
    drum.position.set(CORE.cx, CORE.top + 0.3 + DRUM_H / 2, CORE.cz); drum.castShadow = true; staticRoot.add(drum);
  }

  /* ---- garage (stone) + roof terrace ---- */
  wall('x', -9, -4, 6, 0, 4.3, 0.3, M.stone, [{ c: -7.75, w: 2.3, h: 2.5, glass: false }, { c: -5.25, w: 2.3, h: 2.5, glass: false }]);
  wall('z', -6, 6, -9, 0, 4.3, 0.3, M.stone, [{ c: 3.5, w: 0.8, y: 1.3, h: 1.0, arch: true, mullion: true }]);
  wall('x', -9, -4, -6, 0, 4.3, 0.3, M.stone, []);
  box(5.3, 0.3, 12.3, M.stone, -6.5, 4.0, 0, { cast: true });
  box(5.0, 0.03, 12, M.flag, -6.5, 4.3, 0, { walk: true, cast: false });
  box(5.6, 0.2, 0.2, M.terracotta, -6.5, 4.3, 6.15); box(5.6, 0.2, 0.2, M.terracotta, -6.5, 4.3, -6.15);
  railing([-9, 4.3, 6.05], [-4, 4.3, 6.05]);
  railing([-9, 4.3, -6.05], [-4, 4.3, -6.05]);
  railing([-9.05, 4.3, 6.05], [-9.05, 4.3, -1.2]);
  railing([-9.05, 4.3, -2.8], [-9.05, 4.3, -6.05]);
  // garage-top pergola-ish planters
  pottedPlant(-8.4, 4.33, 5.4, 1.2, 0); pottedPlant(-4.6, 4.33, 5.4, 1.0, 2); pottedPlant(-8.4, 4.33, -5.3, 1.1, 1);
  pottedPlant(-6.5, 4.33, 5.5, 0.9, 2);
  // terrace furniture: two chairs + small table
  box(0.7, 0.06, 0.7, M.iron, -6.0, 4.3 + 0.7, 2.6); cyl(0.04, 0.04, 0.7, M.iron, -6.0, 4.3, 2.6);
  for (const dx of [-0.8, 0.8]) { box(0.55, 0.45, 0.55, M.woodWarm, -6.0 + dx, 4.3, 2.6); box(0.55, 0.5, 0.06, M.woodWarm, -6.0 + dx, 4.75, 2.6 - 0.25 * Math.sign(dx) * 0 - 0.27); }

  /* ---- curved exterior staircase (to garage roof terrace) ---- */
  {
    const cx = -9, cz = 0.2, rIn = 1.5, rOut = 2.8, n = 22, rise = 4.3 / n;
    const a0 = THREE.MathUtils.degToRad(72), a1 = THREE.MathUtils.degToRad(-72);
    const outer = [];
    for (let i = 0; i < n; i++) {
      const a = lerp(a0, a1, (i + 0.5) / n); const rm = (rIn + rOut) / 2;
      const x = cx - Math.cos(a) * rm, z = cz + Math.sin(a) * rm;
      const len = Math.abs(a1 - a0) / n * rOut * 1.15;
      const st = box(rOut - rIn, rise * (i + 1), len, M.stone, x, 0, z, { ry: -a + 0, walk: true });
      st.rotation.y = a; // radial alignment
      const tread = box(rOut - rIn + 0.04, 0.04, len + 0.02, M.flag, x, rise * (i + 1) - 0.02, z, { cast: false });
      tread.rotation.y = a;
      outer.push([cx - Math.cos(a) * (rOut - 0.05), rise * (i + 1) + 0.95, cz + Math.sin(a) * (rOut - 0.05)]);
    }
    // top landing
    box(0.65, 4.3, 1.7, M.stone, -9.32, 0, -2.0, { walk: true });
    // iron hand rail (helix)
    tube(outer, 0.025, M.iron, { seg: 80 });
    const bal = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 0.95, 4), M.iron, n * 2); const m4 = new THREE.Matrix4();
    for (let i = 0; i < n * 2; i++) {
      const t = (i + 0.5) / (n * 2); const a = lerp(a0, a1, t); const y = 4.3 * Math.ceil(t * n) / n;
      m4.makeTranslation(cx - Math.cos(a) * (rOut - 0.05), y + 0.475, cz + Math.sin(a) * (rOut - 0.05)); bal.setMatrixAt(i, m4);
    }
    dynRoot.add(bal);
    vine([[-11.5, 0.1, 0.2], [-11.7, 1.5, 0.6], [-11.6, 2.6, -0.4], [-11.0, 3.5, -1.2]], 40);
  }

  /* ---- front door (double, arched, dark wood) ---- */
  function hingedDoor(hx, hy, hz, w, h, mat, dirSign, axis = 'x', openAng = 1.6, openSign = dirSign) {
    const pivot = new THREE.Group(); pivot.position.set(hx, hy, hz); dynRoot.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), mat);
    leaf.position.set(dirSign * w / 2, h / 2, 0); leaf.castShadow = true; pivot.add(leaf);
    if (axis === 'z') pivot.rotation.y = -Math.PI / 2;
    const base = pivot.rotation.y;
    const d = { pivot, leaf, open: false, a: 0, target: 0, base, sign: openSign, openAng };
    DOORS.push(d); return d;
  }
  const fdL = hingedDoor(-1.35, G, 6.0, 0.85, 2.05, M.door, 1);
  const fdR = hingedDoor(0.35, G, 6.0, 0.85, 2.05, M.door, -1);
  // arched transom over the front door
  {
    const sh = new THREE.Shape(); sh.moveTo(-0.85, 0); sh.lineTo(0.85, 0); sh.absarc(0, -0.15, 0.85, Math.asin(0.15 / 0.85), Math.PI - Math.asin(0.15 / 0.85), false); sh.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), M.woodDark); m.position.set(-0.5, G + 2.0, 5.96); staticRoot.add(m);
  }
  const frontCol = addCollider(-1.35, 0.35, G, G + 2.4, 5.85, 6.15);
  // glass arched door in the breathing wall (east)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfd8dc, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35 });
  const edL = hingedDoor(8.92, G, -0.9, 0.9, 2.1, glassMat, 1, 'z', 1.6, -1);
  const edR = hingedDoor(8.92, G, 0.9, 0.9, 2.1, glassMat, -1, 'z', 1.6, 1);
  for (const d of [edL, edR]) { // wooden frames on glass leaves
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.05), M.woodDark); f.scale.set(1, 1, 1);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.9, 2.1, 0.08)), new THREE.LineBasicMaterial({ color: 0x2a1a0e }));
    edges.position.copy(d.leaf.position); d.pivot.add(edges);
  }
  {
    const sh = new THREE.Shape(); const r = 0.9; sh.moveTo(-r, 0); sh.lineTo(r, 0); sh.absarc(0, -0.0, r, 0, Math.PI, false); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), glassMat); m.rotation.y = -Math.PI / 2; m.position.set(8.92, G + 2.1, 0); dynRoot.add(m);
  }
  const eastCol = addCollider(8.85, 9.0, G, G + 2.6, -0.9, 0.9);
  // porch glass doors (core front, by the sofa)
  const pdL = hingedDoor(3.6, G, 4.5, 0.6, 2.0, glassMat, 1);
  const pdR = hingedDoor(4.8, G, 4.5, 0.6, 2.0, glassMat, -1);
  for (const d of [pdL, pdR]) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.6, 2.0, 0.08)), new THREE.LineBasicMaterial({ color: 0x2a1a0e })); e.position.copy(d.leaf.position); d.pivot.add(e); }
  { const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(0.6, 0); sh.absarc(0, 0, 0.6, 0, Math.PI, false); sh.closePath();
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), glassMat); m.position.set(4.2, G + 2.0, 4.5); dynRoot.add(m); }
  const porchCol = addCollider(3.6, 4.8, G, G + 2.4, 4.35, 4.65);
  // upstairs door out to the garage roof terrace (single dark-wood leaf, opens into the room)
  const tdr = hingedDoor(-4.0, U, 0.45, 1.1, 1.8, M.door, 1, 'z', 1.6, 1);
  { const sh = new THREE.Shape(); sh.moveTo(-0.55, 0); sh.lineTo(0.55, 0); sh.absarc(0, 0, 0.55, 0, Math.PI, false); sh.closePath();
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }), M.woodDark); m.rotation.y = -Math.PI / 2; m.position.set(-4.04, U + 1.8, 1.0); staticRoot.add(m); }
  const terrCol = addCollider(-4.15, -3.85, U, U + 2.3, 0.45, 1.55);
  // overhead garage doors (swing up into the garage)
  const GARAGE = [];
  box(4.7, 0.03, 11.7, M.concrete, -6.5, 0, 0, { walk: true, cast: false });
  const gl = new THREE.PointLight(0xffd9a0, 0, 9, 1.5); gl.position.set(-6.5, 3.6, 2); scene.add(gl); interiorLights.push(gl);
  for (const c of [-7.75, -5.25]) {
    const pivot = new THREE.Group(); pivot.position.set(c, 2.5, 5.78); dynRoot.add(pivot);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.28, 2.5, 0.07), [M.woodDark, M.woodDark, M.woodDark, M.woodDark, M.garage, M.woodDark]);
    leaf.position.set(0, -1.25, 0); leaf.castShadow = true; pivot.add(leaf);
    const col = addCollider(c - 1.15, c + 1.15, 0, 2.5, 5.7, 6.2);
    GARAGE.push({ pivot, leaf, col, a: 0, target: 0 });
  }
  // a classic car parked inside
  { const car = new THREE.Group(); car.position.set(-6.5, 0, 1.6); dynRoot.add(car);
    const paint = new THREE.MeshPhysicalMaterial({ color: 0x2f4f5a, metalness: 0.6, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.4), paint); b1.position.y = 0.6; car.add(b1);
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.2), paint); b2.position.set(0, 1.12, -0.2); car.add(b2);
    const wg = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.38, 2.0), M.glass); wg.position.set(0, 1.12, -0.2); car.add(wg);
    for (const [x, z] of [[-0.85, 1.4], [0.85, 1.4], [-0.85, -1.4], [0.85, -1.4]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 20), M.rubber); w.rotation.z = Math.PI / 2; w.position.set(x, 0.33, z); car.add(w); }
    addCollider(-7.5, -5.5, 0, 1.5, -0.7, 3.9); }

  const DGROUPS = [
    { name: 'Front door', leaves: [fdL, fdR], col: frontCol, c: new THREE.Vector3(-0.5, G, 6.0) },
    { name: 'Glass door', leaves: [edL, edR], col: eastCol, c: new THREE.Vector3(8.92, G, 0) },
    { name: 'Porch doors', leaves: [pdL, pdR], col: porchCol, c: new THREE.Vector3(4.2, G, 4.5) },
    { name: 'Terrace door', leaves: [tdr], col: terrCol, c: new THREE.Vector3(-4.0, U, 1.0) },
  ];
  GARAGE.forEach((g, i) => DGROUPS.push({ name: 'Garage door', garage: g, col: g.col, c: new THREE.Vector3(i ? -5.25 : -7.75, 0, 6.0), range: 3.2 }));
  for (const grp of DGROUPS) {
    grp.held = false;
    const meshes = grp.garage ? [grp.garage.leaf] : grp.leaves.map(d => d.leaf);
    for (const m of meshes) { m.userData.onSelect = () => { grp.held = !grp.held; }; m.userData.hint = grp.name + ' (click / trigger)'; interactives.push(m); }
  }
  window.__doors = DGROUPS;
  const headP = new THREE.Vector3();
  updaters.push((dt) => {
    camera.getWorldPosition(headP);
    for (const grp of DGROUPS) {
      const near = Math.hypot(headP.x - grp.c.x, headP.z - grp.c.z) < (grp.range || 2.7) && Math.abs(headP.y - 1.4 - grp.c.y) < 1.6;
      const open = grp.held || S.allDoors || near;
      if (grp.garage) { const g = grp.garage; g.target = open ? 1 : 0; g.a += (g.target - g.a) * Math.min(1, dt * 1.2); g.pivot.rotation.x = g.a * Math.PI / 2 * 0.98; grp.col.on = g.a < 0.6; }
      else { for (const d of grp.leaves) { d.target = open ? 1 : 0; } grp.col.on = grp.leaves[0].a < 0.35; }
    }
    for (const d of DOORS) {
      d.a += (d.target - d.a) * Math.min(1, dt * 2.5);
      d.pivot.rotation.y = d.base + d.a * d.openAng * d.sign;
    }
  });

  /* ---- lanterns ---- */
  lantern(-1.7, G + 1.9, 6.12, 0, true); lantern(0.7, G + 1.9, 6.12, 0, false);
  lantern(-6.5, 2.7, 6.15, 0, true);
  lantern(9.0, G + 2.3, -1.45, Math.PI / 2, true); lantern(9.0, G + 2.3, 1.45, Math.PI / 2, false);
  lantern(-2.25, 1.55, 9.22, 0, false); lantern(1.25, 1.55, 9.22, 0, false);
  lantern(4.2, G + 2.2, 4.66, 0, false);

  /* ---- vines on walls & pillars, flowers ---- */
  vine([[-3.9, 0.9, 6.15], [-3.7, 2.2, 6.2], [-3.2, 3.4, 6.2], [-2.6, 4.0, 6.2], [-1.6, 4.2, 6.25]], 60);
  vine([[-4.05, 0.2, 6.2], [-4.1, 1.8, 6.22], [-4.4, 3.2, 6.22], [-5.3, 3.9, 6.22]], 50);
  vine([[3.35, G, 6.25], [3.35, G + 1.5, 6.25], [3.5, G + 2.6, 6.2], [4.5, G + 2.9, 6.2]], 40);
  vine([[8.75, G, 6.25], [8.75, G + 1.8, 6.25], [8.4, G + 2.7, 6.2]], 30);

  /* ---- front garden, low stone wall with 6435, olive tree ---- */
  box(7.0, 0.08, 2.2, M.mulch, 5.5, 0, 8.5, { cast: false });
  box(7.0, 0.62, 0.38, M.stone, 5.5, 0, 9.75, { collide: true });
  box(7.1, 0.06, 0.45, M.flag, 5.5, 0.62, 9.75);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.2), M.plaque); pl.position.set(3.4, 0.36, 9.95); staticRoot.add(pl);
  oliveTree(6.4, 8.3, 1.0);
  // lavender / agave clumps
  for (let i = 0; i < 14; i++) foliage(M.lavender, rr(2.5, 8.7), 0.25, rr(7.8, 9.3), 0.3, 0.22, 0.3, 14, 0.3, 0.45);
  for (let i = 0; i < 8; i++) foliage(M.lavender, rr(-9.6, -9.1), 0.25, rr(6.5, 9.5), 0.3, 0.22, 0.3, 12, 0.3, 0.45);
  pottedPlant(2.6, G, 7.0, 1.1, 0); pottedPlant(-2.1, G, 6.4, 0.9, 1); pottedPlant(8.6, G, 6.9, 1.0, 2);
  pottedPlant(10.0, 0, 1.6, 1.2, 0); pottedPlant(10.0, 0, -1.6, 1.2, 1);
  // east garden: stepping stones
  for (let i = 0; i < 7; i++) box(0.75, 0.05, 0.65, M.flag, 12 + i * 0.95, 0, Math.sin(i) * 0.4, { walk: true, cast: false });
  pottedPlant(14.0, 0, 5.4, 1.4, 2); pottedPlant(14.0, 0, -5.4, 1.4, 0); pottedPlant(16.5, 0, 1.6, 1.2, 1); pottedPlant(16.5, 0, -1.6, 1.2, 1);
}
