import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ---------- tiny spring tween ---------- */
const springs = [];
function spring(obj, key, to, { stiffness = 55, damping = 9 } = {}) {
  let s = springs.find((e) => e.obj === obj && e.key === key);
  if (!s) { s = { obj, key, v: 0 }; springs.push(s); }
  s.to = to; s.stiffness = stiffness; s.damping = damping;
}
function stepSprings(dt) {
  for (let i = springs.length - 1; i >= 0; i--) {
    const s = springs[i];
    const x = s.obj[s.key];
    const F = -s.stiffness * (x - s.to) - s.damping * s.v;
    s.v += F * dt;
    s.obj[s.key] = x + s.v * dt;
    if (Math.abs(s.v) < 0.0004 && Math.abs(s.obj[s.key] - s.to) < 0.0004) {
      s.obj[s.key] = s.to; springs.splice(i, 1);
    }
  }
}
const lerp = (a, b, t) => a + (b - a) * t;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- renderer ---------- */
const canvas = document.getElementById("engine");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f7eedd");
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(4.8, 3.8, 6.8);

const hemi = new THREE.HemisphereLight(0xfff8ec, 0xe6cba6, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(4, 8, 5);
scene.add(sun);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2.2, 0);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4.5;
controls.maxDistance = 11;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = !reducedMotion;
controls.autoRotateSpeed = 0.8;

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  if (camera.aspect < 0.75) camera.position.setLength(13);
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize();

/* soft ground blob - a paper shadow */
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(3.1, 40),
  new THREE.MeshBasicMaterial({ color: "#e4d3b6", transparent: true, opacity: 0.8 })
);
blob.rotation.x = -Math.PI / 2; blob.position.y = -0.02;
scene.add(blob);

/* ---------- ink helpers ---------- */
const INK = "#33241c";
/* hand-inked outline: inverted hull with a fixed, per-part wobble */
function inkify(mesh, thickness = 1.03) {
  const hull = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide })
  );
  hull.scale.setScalar(thickness);
  hull.rotation.set((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
  hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}
/* wireframe ghost for x-ray mode: ink edges, barely-there paper fill */
function ghostify(mesh) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 })
  );
  edges.raycast = () => {};
  mesh.add(edges);
  return edges;
}
const toon3 = (() => {
  const c = document.createElement("canvas"); c.width = 3; c.height = 1;
  const g = c.getContext("2d");
  g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, 1, 1);
  g.fillStyle = "#c8c8c8"; g.fillRect(1, 0, 1, 1);
  g.fillStyle = "#ffffff"; g.fillRect(2, 0, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const clay = (color) => new THREE.MeshToonMaterial({ color, gradientMap: toon3 });

/* ---------- the engine (a friendly toy, drawn in ink) ---------- */
const engine = new THREE.Group();
scene.add(engine);

/* block (the engine's body) */
const block = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.85, 2, 5, 0.3), clay("#e8735a"));
block.position.y = 0.42;
engine.add(block);

/* cylinder shell (the piston's home) */
const shell = new THREE.Mesh(
  new THREE.CylinderGeometry(0.78, 0.78, 2.1, 28, 1, true),
  new THREE.MeshToonMaterial({ color: "#aebfca", gradientMap: toon3, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
);
shell.position.y = 2.25;
engine.add(shell);

/* piston */
const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.05, 28), clay("#7fb3d5"));
piston.position.y = 2.2;
engine.add(piston);

/* head (the lid) */
const head = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.7, 1.7, 4, 0.24), clay("#f2b25c"));
head.position.y = 3.62;
engine.add(head);

/* valves: intake + exhaust */
const valveIn = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 16), clay("#7dcfa0"));
valveIn.position.set(-0.55, 4.25, 0);
engine.add(valveIn);
const valveOut = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.9, 16), clay("#9a8fb8"));
valveOut.position.set(0.55, 4.25, 0);
engine.add(valveOut);

/* fuel injector */
const injector = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.0, 16), clay("#f0924c"));
injector.position.set(0, 4.3, 0.45);
injector.rotation.x = 0.35;
engine.add(injector);

/* crankshaft + rod */
const crank = new THREE.Group();
const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 20), clay("#8a6f4d"));
crankAxle.rotation.z = Math.PI / 2;
crank.add(crankAxle);
const crankWeb = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.9, 0.5, 3, 0.1), clay("#e8b64c"));
crankWeb.position.y = 0.4;
crank.add(crankWeb);
crank.position.y = 1.0;
engine.add(crank);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.6, 12), clay("#c9d4dc"));
rod.position.set(0, 1.75, 0);
rod.scale.y = 0.75;
engine.add(rod);

/* ink every solid part; ghost edges on the exterior for x-ray */
[ piston, valveIn, valveOut, injector, rod ].forEach((m) => inkify(m, 1.045));
[ block, head, shell ].forEach((m) => inkify(m, 1.03));
crankAxle.rotation.set(0, 0, 0); inkify(crankAxle, 1.05); crankAxle.rotation.z = Math.PI / 2;
inkify(crankWeb, 1.06);
const ghosts = new Map();
[ block, head, shell ].forEach((m) => ghosts.set(m, ghostify(m)));

/* boom flash inside the cylinder */
const boomMat = new THREE.MeshBasicMaterial({ color: "#ff9d3c", transparent: true, opacity: 0 });
const boom = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), boomMat);
boom.position.y = 2.9;
engine.add(boom);

/* air + smoke particles */
function makeDots(color, n) {
  const g = new THREE.SphereGeometry(0.09, 8, 8);
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
  const grp = new THREE.Group();
  for (let i = 0; i < n; i++) { const d = new THREE.Mesh(g, m.clone()); grp.add(d); }
  scene.add(grp);
  return grp;
}
const airDots = makeDots("#7fb3d5", 6);
const smokeDots = makeDots("#a89e90", 6);

/* ---------- parts registry ---------- */
/* xray:true = exterior (ghosts in x-ray); label = leader-line note in x-ray */
const PARTS = [
  { mesh: piston, name: "Piston", text: "A little elevator. It rides up and down all day long.", out: 1.7, label: "piston", anchor: new THREE.Vector3(0.62, 0.2, 0) },
  { mesh: shell, name: "Cylinder", text: "The piston's home. All the action happens in here.", out: 1.0, xray: true },
  { mesh: injector, name: "Fuel Injector", text: "A tiny spray can. It spritzes fuel into the hot air.", out: 2.0, label: "fuel injector", anchor: new THREE.Vector3(0.2, 0.5, 0.15) },
  { mesh: crank, name: "Crankshaft", text: "The spinner. It turns up-and-down into round-and-round.", out: -0.35, label: "crankshaft", anchor: new THREE.Vector3(0.3, -0.1, 0) },
  { mesh: valveIn, name: "Valves", text: "Little doors. One lets air in, one lets smoke out.", out: 1.8, label: "air door in", anchor: new THREE.Vector3(-0.1, 0.5, 0) },
  { mesh: valveOut, name: "Valves", text: "Little doors. One lets air in, one lets smoke out.", out: 1.8, label: "smoke door out", anchor: new THREE.Vector3(0.1, 0.5, 0) },
  { mesh: head, name: "Cylinder Head", text: "The lid on top. It keeps all the squeezing inside.", out: 1.5, xray: true },
  { mesh: block, name: "Engine Block", text: "The strong base. The whole engine sits on it.", out: 0, xray: true },
];
PARTS.forEach((p) => { p.home = p.mesh.position.y; p.mesh.userData.part = p; });
const pickMeshes = PARTS.map((p) => p.mesh).concat([crankAxle, crankWeb]);
crankAxle.userData.part = PARTS[3]; crankWeb.userData.part = PARTS[3];

/* ---------- x-ray labels (leader lines) ---------- */
const labelLayer = document.getElementById("labels");
const leaderSvg = document.getElementById("leaders");
const labeledParts = PARTS.filter((p) => p.label);
const labelEls = new Map();
labeledParts.forEach((p) => {
  const el = document.createElement("div");
  el.className = "xlabel";
  el.textContent = p.label;
  labelLayer.appendChild(el);
  labelEls.set(p, el);
});
const leaderPaths = new Map();
labeledParts.forEach((p) => {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "leader");
  leaderSvg.appendChild(path);
  leaderPaths.set(p, path);
});
const tmpV = new THREE.Vector3();
function projectLabels() {
  const show = mode === 1 || mode === 2;
  const w = innerWidth, h = innerHeight;
  leaderSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  labeledParts.forEach((p, i) => {
    const el = labelEls.get(p);
    const path = leaderPaths.get(p);
    if (!show) { el.classList.remove("on"); path.classList.remove("on"); return; }
    tmpV.copy(p.anchor);
    p.mesh.localToWorld(tmpV);
    tmpV.project(camera);
    const behind = tmpV.z > 1;
    const ax = (tmpV.x * 0.5 + 0.5) * w;
    const ay = (-tmpV.y * 0.5 + 0.5) * h;
    if (behind) { el.classList.remove("on"); path.classList.remove("on"); return; }
    /* park labels around the engine, alternating sides */
    const side = i % 2 === 0 ? -1 : 1;
    const lx = ax + side * Math.min(w * 0.24, 130);
    const ly = ay - 18 - (i % 3) * 26;
    el.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px) translate(-50%, -100%)`;
    /* hand-drawn leader: two segments with a slight kink */
    const kx = (ax + lx) / 2 + side * 8;
    const ky = (ay + ly) / 2 - 6;
    path.setAttribute("d", `M ${ax.toFixed(1)} ${ay.toFixed(1)} Q ${kx.toFixed(1)} ${ky.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)}`);
    el.classList.add("on"); path.classList.add("on");
  });
}

/* ---------- x-ray crossfade ---------- */
let xray = 0; /* 0 = solid, 1 = x-ray */
function setXrayTargets(on) {
  for (const [mesh, edges] of ghosts) {
    spring(edges.material, "opacity", on ? 0.9 : 0, { stiffness: 40, damping: 10 });
    spring(mesh.material, "opacity", on ? 0.16 : (mesh === shell ? 0.45 : 1), { stiffness: 40, damping: 10 });
    mesh.material.transparent = true;
  }
}

/* ---------- four-stroke cycle ---------- */
const STROKES = [
  { word: "Air in!", line: "The engine breathes in a big gulp of air." },
  { word: "Squeeze!", line: "The piston squeezes the air tight. Squeezed air gets really HOT!" },
  { word: "BOOM!", line: "Fuel sprays into the hot air and goes BOOM! That push is the power." },
  { word: "Puff out!", line: "The smoke puffs out. Phew! And it all starts again." },
];
const STROKE_T = 2.0;
let cycleT = 0, lastStroke = -1, boomSeen = false;

/* ---------- modes + chrome ---------- */
const banner = document.getElementById("banner");
const oneliner = document.getElementById("oneliner");
const hint = document.getElementById("hint");
const card = document.getElementById("card");
const cardName = document.getElementById("card-name");
const cardText = document.getElementById("card-text");
const chrome = [...document.querySelectorAll(".chrome")].filter((c) => c.id !== "modes");
const modeBtns = [...document.querySelectorAll(".modebtn")];
let mode = 0;
let camDist = innerWidth / innerHeight < 0.75 ? 13 : 10;

const HINTS = [
  "Drag to spin it around",
  "Tap a part to meet it",
  "Watch it go - four moves, over and over",
];
const MAGIC = "Diesel secret: there is NO spark plug! The squeeze alone makes the air so hot, the fuel bursts into flame all by itself.";

function setMode(m) {
  mode = m;
  camDist = (innerWidth / innerHeight < 0.75 ? 13 : 10) + (m === 1 ? 8.0 : 0);
  modeBtns.forEach((b, i) => b.classList.toggle("active", i === m));
  controls.autoRotate = m === 0 && !reducedMotion;
  card.classList.remove("show");
  hint.textContent = HINTS[m];
  hint.classList.add("show");
  if (m === 1) {
    banner.classList.remove("pop"); oneliner.classList.remove("show");
    for (const p of PARTS) spring(p.mesh.position, "y", p.home + p.out, { stiffness: 42, damping: 8.5 });
    setXrayTargets(true);
  } else {
    for (const p of PARTS) spring(p.mesh.position, "y", p.home, { stiffness: 48, damping: 9 });
    setXrayTargets(m === 2); /* cycle runs x-ray too, so the piston is visible */
  }
  if (m === 2) {
    cycleT = 0; lastStroke = -1; boomSeen = false;
  } else {
    setTimeout(() => { if (mode !== 2) { banner.classList.remove("pop"); oneliner.classList.remove("show"); } }, 400);
  }
  wakeChrome();
}
modeBtns.forEach((b, i) => b.addEventListener("click", () => setMode(i)));

document.getElementById("card-ok").addEventListener("click", () => {
  card.classList.remove("show");
  wakeChrome();
});

let idleTimer;
function wakeChrome() {
  chrome.forEach((c) => c.classList.remove("idle"));
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => chrome.forEach((c) => c.classList.add("idle")), 6000);
}

/* ---------- picking ---------- */
const ray = new THREE.Raycaster();
let downX = 0, downY = 0, moved = 0;
canvas.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; moved = 0; wakeChrome(); });
canvas.addEventListener("pointermove", (e) => { moved += Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY); downX = e.clientX; downY = e.clientY; });
canvas.addEventListener("pointerup", (e) => {
  if (moved > 14 || mode !== 1) return;
  const nd = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
  ray.setFromCamera(nd, camera);
  const hit = ray.intersectObjects(pickMeshes, false)[0];
  if (hit && hit.object.userData.part) {
    const p = hit.object.userData.part;
    cardName.textContent = p.name;
    cardText.textContent = p.text;
    card.classList.add("show");
    spring(p.mesh.scale, "x", 1.18, { stiffness: 90, damping: 7 });
    spring(p.mesh.scale, "y", 1.18, { stiffness: 90, damping: 7 });
    spring(p.mesh.scale, "z", 1.18, { stiffness: 90, damping: 7 });
    setTimeout(() => {
      spring(p.mesh.scale, "x", 1); spring(p.mesh.scale, "y", 1); spring(p.mesh.scale, "z", 1);
    }, 450);
  }
});

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const P_TOP = 2.6, P_BOT = 1.9;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 2) {
    cycleT += dt;
    const ph = (cycleT / STROKE_T) % 4;
    const stroke = Math.floor(ph);
    const f = ph - stroke;
    const ease = f * f * (3 - 2 * f);

    if (stroke !== lastStroke) {
      lastStroke = stroke;
      banner.textContent = STROKES[stroke].word;
      banner.classList.remove("pop"); void banner.offsetWidth;
      banner.classList.add("pop");
      oneliner.textContent = STROKES[stroke].line;
      oneliner.classList.add("show");
      if (stroke === 2 && !boomSeen) {
        boomSeen = true;
        setTimeout(() => {
          if (mode === 2) { cardName.textContent = "The diesel secret"; cardText.textContent = MAGIC; card.classList.add("show"); }
        }, 2600);
      }
    }

    let py;
    if (stroke === 0) py = lerp(P_TOP, P_BOT, ease);
    else if (stroke === 1) py = lerp(P_BOT, P_TOP, ease);
    else if (stroke === 2) py = lerp(P_TOP, P_BOT, Math.min(1, f * 2.4));
    else py = lerp(P_BOT, P_TOP, ease);
    piston.position.y = py;

    valveIn.position.y = 4.25 - (stroke === 0 ? Math.sin(f * Math.PI) * 0.3 : 0);
    valveOut.position.y = 4.25 - (stroke === 3 ? Math.sin(f * Math.PI) * 0.3 : 0);

    crank.rotation.z = -ph * Math.PI;
    rod.position.set(0, (py + crank.position.y) / 2 + 0.2, 0);
    rod.scale.y = Math.max(0.4, (py - crank.position.y) / 1.6 + 0.35);

    if (stroke === 2 && f < 0.35) {
      boomMat.opacity = (1 - f / 0.35) * 0.85;
      boom.scale.setScalar(0.6 + f * 2.2);
    } else boomMat.opacity = Math.max(0, boomMat.opacity - dt * 4);

    airDots.children.forEach((d, i) => {
      const ff = (f + i * 0.16) % 1;
      d.position.set(-0.55 + Math.sin(i * 2.1) * 0.15, 5.1 - ff * 2.4, Math.cos(i * 1.7) * 0.15);
      d.material.opacity = stroke === 0 ? Math.sin(ff * Math.PI) * 0.9 : 0;
    });
    smokeDots.children.forEach((d, i) => {
      const ff = (f + i * 0.16) % 1;
      d.position.set(0.55 + Math.sin(i * 1.9) * 0.2 + ff * 0.5, 4.1 + ff * 2.2, Math.cos(i * 2.3) * 0.2);
      d.material.opacity = stroke === 3 ? Math.sin(ff * Math.PI) * 0.7 : 0;
      d.scale.setScalar(1 + ff * 1.6);
    });
  } else {
    airDots.children.forEach((d) => (d.material.opacity = 0));
    smokeDots.children.forEach((d) => (d.material.opacity = 0));
    boomMat.opacity = Math.max(0, boomMat.opacity - dt * 4);
    if (mode === 0 && !reducedMotion) piston.position.y = 2.2 + Math.sin(t * 1.4) * 0.12;
  }

  const len = camera.position.length();
  camera.position.setLength(lerp(len, camDist, 1 - Math.exp(-2.2 * dt)));
  controls.target.y = lerp(controls.target.y, mode === 1 ? 3.4 : 2.2, 1 - Math.exp(-2.2 * dt));
  stepSprings(dt);
  controls.update();
  projectLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

/* ---------- veil ---------- */
setTimeout(() => {
  document.getElementById("veil").classList.add("gone");
  modeBtns[0].classList.add("active");
  hint.textContent = HINTS[0];
  setTimeout(() => hint.classList.add("show"), 800);
  wakeChrome();
}, 1900);
