// Intro 3D de King Regal: golosinas procedurales que orbitan y, con el scroll,
// vuelan a formar una corona. Three.js r160, sin assets externos.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const intro = document.querySelector('.intro');
const stage = intro.querySelector('.stage');
const canvas = document.getElementById('candy');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:760px)').matches;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

let renderer = null;
if (!intro.classList.contains('no-webgl')) try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  renderer = null;
}
if (!renderer) {
  intro.classList.add('static', 'no-webgl');
} else {
  window.__intro3d = true;
  run();
}

function run() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 120);

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff3b55, 1.8); rim.position.set(-6, 2, -5); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x8090ff, 0.35));

  /* ---------- geometrías ---------- */
  function wheelGeo() {
    const pts = [], turns = 3.2, n = 170;
    for (let i = 0; i <= n; i++) {
      const t = i / n, th = t * turns * Math.PI * 2, r = 0.07 + t * 0.5;
      pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
    }
    const l = pts[pts.length - 1];
    pts.push(new THREE.Vector3(l.x + 0.12, l.y - 0.2, 0), new THREE.Vector3(l.x + 0.18, l.y - 0.42, 0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 300, 0.075, 10, false);
  }
  function flower(R) {
    const s = new THREE.Shape();
    for (let i = 0; i <= 120; i++) {
      const a = i / 120 * Math.PI * 2, r = R * (0.7 + 0.3 * Math.cos(a * 5));
      i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return new THREE.ShapeGeometry(s, 4);
  }
  const H = 0.42, RR = 0.11;
  const capTop = g => g.rotateX(-Math.PI / 2).translate(0, H / 2, 0);
  const capBot = g => g.rotateX(Math.PI / 2).translate(0, -H / 2, 0);
  const rellenoBody = mergeGeometries([
    new THREE.CylinderGeometry(RR, RR, H, 22, 1, true),
    capTop(new THREE.CircleGeometry(RR, 22)), capBot(new THREE.CircleGeometry(RR, 22)),
  ]);
  const rellenoCore = mergeGeometries([
    flower(RR * 0.78).rotateX(-Math.PI / 2).translate(0, H / 2 + 0.002, 0),
    flower(RR * 0.78).rotateX(Math.PI / 2).translate(0, -H / 2 - 0.002, 0),
  ]);
  const pill = new THREE.CapsuleGeometry(0.078, 0.26, 6, 14);
  const choco = new THREE.SphereGeometry(0.15, 24, 16).scale(1, 0.8, 1.38);
  const chicle = new THREE.SphereGeometry(0.15, 26, 18).scale(1.4, 1, 1);
  { // rayas del chicle como color de vértice
    const p = chicle.attributes.position, c = [];
    for (let i = 0; i < p.count; i++) {
      const s = Math.sin(Math.atan2(p.getZ(i), p.getY(i)) * 7) > 0 ? 1 : 0.78;
      c.push(s, s, s);
    }
    chicle.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  }
  const ring = new THREE.TorusGeometry(0.13, 0.068, 14, 30);

  /* ---------- materiales ---------- */
  const M = (o) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, ...o });
  const mats = {
    wheel: M({ color: 0xd8202e, roughness: .32, clearcoat: .7, clearcoatRoughness: .25 }),
    body: M({ roughness: .42, clearcoat: .35 }),
    core: M({ color: 0xfff4e6, roughness: .6 }),
    pill: M({ roughness: .16, clearcoat: 1, clearcoatRoughness: .1 }),
    choco: M({ roughness: .3, clearcoat: .55 }),
    chicle: M({ roughness: .22, clearcoat: .9, vertexColors: true }),
    gummy: M({ roughness: .85, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color(0xffffff) }),
  };
  const candy = ['#e8253a', '#2f6fe0', '#3cc24a', '#ffcf2e', '#ff6fa8', '#ff8a1f', '#8a4fd8', '#f4f1ea'];
  const browns = ['#5a3420', '#6e4128', '#3f2416', '#e9d8bf'];
  const pick = a => a[Math.floor(rnd() * a.length)];

  const k = mobile ? 0.78 : 1;
  const types = [
    { n: mobile ? 6 : 10, parts: [[wheelGeo(), mats.wheel, null]], s: [0.62, 0.62], wheel: true },
    { n: Math.round(46 * k), parts: [[rellenoBody, mats.body, candy.slice(0, 6)], [rellenoCore, mats.core, null]], s: [0.95, 1.15] },
    { n: Math.round(72 * k), parts: [[pill, mats.pill, candy]], s: [0.95, 1.2] },
    { n: Math.round(50 * k), parts: [[choco, mats.choco, browns]], s: [0.9, 1.15] },
    { n: Math.round(40 * k), parts: [[chicle, mats.chicle, ['#9bdc4a', '#ff8fb5', '#ffd84d', '#7fc8ff', '#ff9a4a']]], s: [0.9, 1.1] },
    { n: Math.round(30 * k), parts: [[ring, mats.gummy, ['#e8253a', '#ffcf2e', '#3cc24a', '#ff8a1f']]], s: [0.95, 1.2] },
  ];

  /* ---------- corona: posiciones destino ---------- */
  const R = 3.0, BAND = 1.0, SPIKE = 1.9, NSP = 5, BASE = -1.55;
  const topAt = th => {
    let f = (th / (Math.PI * 2) * NSP) % 1; if (f < 0) f += 1;
    return BAND + SPIKE * Math.pow(1 - Math.abs(f - 0.5) * 2, 1.05);
  };
  const nOthers = types.slice(1).reduce((a, t) => a + t.n, 0);
  const area = 2 * Math.PI * R * (BAND + SPIKE / 2.05);
  const step = Math.sqrt(area / nOthers) * 0.98;
  let slots = [];
  for (let y = 0.12; y < BAND + SPIKE; y += step * 0.88) {
    const cnt = Math.floor(2 * Math.PI * R / step), off = rnd();
    for (let j = 0; j < cnt; j++) {
      const th = (j + off + (rnd() - .5) * .3) / cnt * Math.PI * 2;
      const yy = y + (rnd() - .5) * step * .25;
      if (yy < topAt(th) - 0.08) slots.push([th, yy]);
    }
  }
  slots.sort(() => rnd() - .5);
  while (slots.length < nOthers) { const th = rnd() * Math.PI * 2; slots.push([th, rnd() * topAt(th)]); }
  slots = slots.slice(0, nOthers);
  const wheelSlots = [];
  for (let i = 0; i < NSP; i++) { const th = (i + .5) / NSP * Math.PI * 2; wheelSlots.push([th, topAt(th) + 0.12, 0.8]); }
  for (let i = 0; i < NSP; i++) { const th = i / NSP * Math.PI * 2; wheelSlots.push([th, BAND * 0.5, 0.58]); }

  /* ---------- instancias ---------- */
  const items = [], meshes = [];
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  let si = 0;
  types.forEach((t, ti) => {
    const parts = t.parts.map(([g, m]) => {
      const im = new THREE.InstancedMesh(g, m, t.n);
      im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im); meshes.push(im); return im;
    });
    for (let i = 0; i < t.n; i++) {
      let th, y, sc;
      if (t.wheel) { [th, y, sc] = wheelSlots[i % wheelSlots.length]; }
      else { [th, y] = slots[si++]; sc = t.s[0] + rnd() * (t.s[1] - t.s[0]); }
      const r = R + (t.wheel ? 0.1 : (rnd() - .5) * 0.12);
      const target = new THREE.Vector3(Math.cos(th) * r, BASE + y, Math.sin(th) * r);
      const tq = new THREE.Quaternion();
      if (t.wheel) { dummy.position.copy(target); dummy.lookAt(target.x * 2, target.y, target.z * 2); tq.copy(dummy.quaternion); }
      else tq.setFromEuler(new THREE.Euler(rnd() * 6.3, rnd() * 6.3, rnd() * 6.3));
      t.parts.forEach(([, , pal], pi) => { if (pal) { col.set(pick(pal)); parts[pi].setColorAt(i, col); } });
      items.push({
        parts, i, wheel: !!t.wheel, sc: sc * (mobile ? 1.32 : 1), target, tq,
        or: 2.4 + rnd() * 6, oa: rnd() * Math.PI * 2, os: (0.1 + rnd() * 0.22) * (rnd() < .5 ? 1 : -1),
        oy: (rnd() - .5) * 7, ph: rnd() * 6.3,
        axis: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), spin: 0.4 + rnd() * 1.2,
        delay: clamp((y / (BAND + SPIKE)) * 0.65 + rnd() * 0.35), arrive: rnd() * 0.5,
        push: new THREE.Vector3(),
      });
    }
    parts.forEach(p => { if (p.instanceColor) p.instanceColor.needsUpdate = true; });
  });

  /* ---------- azúcar flotando + brillo bajo la corona ---------- */
  const sugarN = mobile ? 180 : 380, sp = new Float32Array(sugarN * 3);
  for (let i = 0; i < sugarN; i++) { sp[i * 3] = (rnd() - .5) * 26; sp[i * 3 + 1] = (rnd() - .5) * 16; sp[i * 3 + 2] = (rnd() - .5) * 12 - 2; }
  const sugarGeo = new THREE.BufferGeometry(); sugarGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sugar = new THREE.Points(sugarGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.045, transparent: true, opacity: .55, depthWrite: false }));
  scene.add(sugar);

  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  const gx = gc.getContext('2d'), grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,70,90,0.9)'); grd.addColorStop(1, 'rgba(255,70,90,0)');
  gx.fillStyle = grd; gx.fillRect(0, 0, 128, 128);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(gc), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.rotation.x = -Math.PI / 2; scene.add(glow);

  /* ---------- capas de texto ---------- */
  const layers = [...intro.querySelectorAll('[data-range]')].map(el => {
    const [a, b, flag] = el.dataset.range.split(',');
    return { el, a: +a, b: +b, flag, base: el.classList.contains('l-b') ? 'translateX(-50%) ' : '' };
  });
  const W = 0.06;
  function updateLayers(p) {
    for (const L of layers) {
      const fin = L.flag === 'first' ? 1 : smooth(L.a, L.a + W, p);
      const fout = L.flag === 'last' ? 1 : 1 - smooth(L.b - W, L.b, p);
      const op = fin * fout;
      L.el.style.opacity = op.toFixed(3);
      L.el.style.transform = `${L.base}translate3d(0,${((1 - fin) * 34 - (1 - fout) * 34).toFixed(1)}px,0)`;
      L.el.classList.toggle('live', op > 0.6);
    }
  }

  /* ---------- entrada: scroll y puntero ---------- */
  let pRaw = 0, p = 0;
  const readScroll = () => {
    const total = intro.offsetHeight - innerHeight;
    pRaw = total > 0 ? clamp(-intro.getBoundingClientRect().top / total) : 0;
  };
  addEventListener('scroll', readScroll, { passive: true });

  const ndc = new THREE.Vector2(9, 9), pw = new THREE.Vector3(), ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let pointerAt = -10, par = { x: 0, y: 0 }, parT = { x: 0, y: 0 };
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    parT.x = ndc.x; parT.y = ndc.y; pointerAt = performance.now();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { ndc.set(9, 9); parT.x = parT.y = 0; });

  /* ---------- tamaño ---------- */
  let camZ = 15;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camZ = Math.max(15, 7.4 / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * camera.aspect));
  }
  addEventListener('resize', () => { resize(); if (reduce) frame(performance.now()); });
  resize();

  /* ---------- bucle ---------- */
  const q = new THREE.Quaternion(), qT = new THREE.Quaternion(), crownQ = new THREE.Quaternion();
  const eul = new THREE.Euler(), orbit = new THREE.Vector3(), world = new THREE.Vector3(), push = new THREE.Vector3();
  const crownPos = new THREE.Vector3(), scaleV = new THREE.Vector3();
  const t0 = performance.now();
  let last = t0, visible = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = reduce ? 4 : (now - t0) / 1000;
    if (reduce) p = 1; else p += (pRaw - p) * (1 - Math.exp(-dt * 7));

    const arrival = reduce ? 1 : easeIO(clamp((t - 0.15) / 1.9));
    const move = smooth(0.7, 0.86, p); // la corona se aparta para los CTA
    const built = smooth(0.5, 0.68, p);
    const pop = 1 + Math.sin(clamp((p - 0.62) / 0.12) * Math.PI) * 0.06;

    if (mobile) crownPos.set(0, THREE.MathUtils.lerp(1.5, 2.2, move), 0);
    else crownPos.set(THREE.MathUtils.lerp(0, 3.4, move), THREE.MathUtils.lerp(0.95, 0.35, move), 0);
    const crownScale = (mobile ? 0.86 : 1) * THREE.MathUtils.lerp(1, 0.82, move) * pop;
    crownQ.setFromEuler(eul.set(0.24, t * 0.22 + p * 2.2, 0));

    const cx = mobile ? 0 : 2.2, cy = mobile ? 1.8 : 0;
    const tighten = 1 - 0.3 * smooth(0, 0.28, p);
    const pushOn = !reduce && now - pointerAt < 2500 && ndc.x < 5;
    if (pushOn) { ray.setFromCamera(ndc, camera); ray.ray.intersectPlane(plane, pw); }

    for (const it of items) {
      // órbita suelta (tramo A), con llegada desde el fondo
      const a = it.oa + t * it.os * (1 + p * 2);
      const arr = clamp((arrival - it.arrive * 0.4) / 0.6);
      const far = 1 - arr;
      const r = it.or * tighten * (1 + far * 1.6);
      orbit.set(cx + Math.cos(a) * r, cy + it.oy * (mobile ? 0.7 : 1) + Math.sin(t * 0.6 + it.ph) * 0.4,
        Math.sin(a) * r * 0.55 - 1 - far * 26);

      // vuelo a la corona (tramo B)
      const m = easeIO(clamp((p - 0.26 - it.delay * 0.16) / 0.24));
      world.copy(it.target).applyQuaternion(crownQ).multiplyScalar(crownScale).add(crownPos);
      world.lerpVectors(orbit, world, m);
      const arc = Math.sin(m * Math.PI);
      world.y += arc * 0.8; world.z += arc * 2.6;

      // movimiento firma: se apartan del cursor y vuelven
      push.set(0, 0, 0);
      if (pushOn) {
        const dx = world.x - pw.x, dy = world.y - pw.y, d = Math.hypot(dx, dy);
        if (d < 1.4 && d > 1e-4) { const f = (1.4 - d) / 1.4; push.set(dx / d * f * 1.1, dy / d * f * 1.1, f * 1.4); }
      }
      it.push.lerp(push, 1 - Math.exp(-dt * (push.lengthSq() > 0 ? 14 : 4)));
      world.add(it.push);

      q.setFromAxisAngle(it.axis, t * it.spin + it.ph);
      qT.copy(crownQ).multiply(it.tq);
      q.slerp(qT, m);
      const s = it.sc * arr * (m > 0 ? THREE.MathUtils.lerp(1, crownScale, m) : 1);
      dummy.position.copy(world); dummy.quaternion.copy(q); dummy.scale.copy(scaleV.setScalar(s));
      dummy.updateMatrix();
      for (const part of it.parts) part.setMatrixAt(it.i, dummy.matrix);
    }
    for (const mm of meshes) mm.instanceMatrix.needsUpdate = true;

    glow.position.set(crownPos.x, crownPos.y + BASE * crownScale - 0.15, 0);
    glow.material.opacity = built * 0.55;
    glow.scale.setScalar(crownScale);
    sugar.rotation.y = t * 0.02; sugar.position.y = Math.sin(t * 0.3) * 0.3;

    par.x += (parT.x - par.x) * (1 - Math.exp(-dt * 3));
    par.y += (parT.y - par.y) * (1 - Math.exp(-dt * 3));
    const z = camZ * (1 - 0.1 * smooth(0.3, 0.64, p));
    camera.position.set(par.x * 0.7, 0.3 + par.y * 0.45, z);
    camera.lookAt(0, 0.35, 0);

    renderer.render(scene, camera);
    updateLayers(p);
  }

  if (reduce) {
    intro.classList.add('static');
    requestAnimationFrame(() => { resize(); frame(performance.now()); });
    return;
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(intro);
  readScroll();
  (function loop(now) {
    if (visible) frame(now); else last = now;
    requestAnimationFrame(loop);
  })(performance.now());
}
