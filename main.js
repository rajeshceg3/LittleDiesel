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
camera.position.set(4.1, 3.1, 7.8);

const hemi = new THREE.HemisphereLight(0xfff8ec, 0xe6cba6, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(4, 8, 5);
scene.add(sun);

const controls = new OrbitControls(camera, canvas);
/* look a touch lower so the engine rides higher in frame, reserving the
   bottom band for the hint line (no card, no pill) - tall screens lift
   further, laptop gets a milder lift plus a slightly longer camera */
let baseTargetY = innerWidth / innerHeight < 0.75 ? 1.55 : 1.9;
controls.target.set(0, baseTargetY, 0);
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
  baseTargetY = innerWidth / innerHeight < 0.75 ? 1.55 : 1.9;
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
    new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide, transparent: true })
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
  new THREE.CylinderGeometry(0.78, 0.78, 2.1, 48, 1, true, Math.PI / 3, Math.PI * 4 / 3),
  new THREE.MeshToonMaterial({ color: "#aebfca", gradientMap: toon3, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
);
shell.position.y = 2.25;
engine.add(shell);

/* piston */
const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.72, 36), clay("#7fb3d5"));
piston.position.y = 2.6;
engine.add(piston);

/* Ring grooves, crown bowl and wrist pin distinguish a piston from a can.
   Schematic details, not the specification of a particular engine. */
for (const y of [0.20, 0.29]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.625, 0.028, 8, 48), clay("#496c80"));
  ring.rotation.x = Math.PI / 2; ring.position.y = y; piston.add(ring);
}
const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.23, 0.018, 32), clay("#496c80"));
bowl.position.y = 0.367; piston.add(bowl);
const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.32, 20), clay("#d6dde0"));
wrist.rotation.z = Math.PI / 2; piston.add(wrist); inkify(wrist, 1.045);

/* head (the lid) */
const head = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.7, 1.7, 4, 0.24), clay("#f2b25c"));
head.position.y = 3.62;
engine.add(head);

/* valves: intake + exhaust */
const valveIn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.9, 20), clay("#7dcfa0"));
valveIn.position.set(-0.43, 3.75, 0);
engine.add(valveIn);
const valveOut = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.9, 20), clay("#9a8fb8"));
valveOut.position.set(0.43, 3.75, 0);
engine.add(valveOut);

/* Poppet faces meet the underside of the head; visible springs above it. */
for (const [v, color] of [[valveIn,"#7dcfa0"],[valveOut,"#9a8fb8"]]) {
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.075, 28), clay(color));
  face.position.y = -0.43; v.add(face); inkify(face, 1.04);
  const points = Array.from({length:97}, (_,i) => {
    const a=i/96*Math.PI*10; return new THREE.Vector3(Math.cos(a)*0.12,0.13+i/96*0.30,Math.sin(a)*0.12);
  });
  const coil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),96,0.022,6,false),clay("#665b51"));
  v.add(coil);
}
/* Cooling fins and bolts articulate the cylinder head, without new UI. */
for (const y of [-0.15,0.04,0.23]) {
  const fin = new THREE.Mesh(new RoundedBoxGeometry(2.3,0.055,1.8,2,0.025),clay("#e5a452"));
  fin.position.y=y; head.add(fin);
}
for (const x of [-0.88,0.88]) for (const z of [-0.62,0.62]) {
  const bolt=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.08,6),clay("#766652"));
  bolt.position.set(x,0.39,z);head.add(bolt);
}

/* fuel injector */
const injector = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.2, 1.0, 16), clay("#f0924c"));
injector.position.set(0, 3.98, 0.22);
injector.rotation.x = 0.18;
const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.028,0.26,16),clay("#665b51"));
nozzle.position.y=-0.60;injector.add(nozzle);
for(const y of [0.14,0.31]) {
 const collar=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,0.09,6),clay("#d77937"));collar.position.y=y;injector.add(collar);
}
engine.add(injector);

/* crankshaft + rod */
const crank = new THREE.Group();
const crankAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 20), clay("#8a6f4d"));
crankAxle.rotation.z = Math.PI / 2;
crank.add(crankAxle);
/* The crank axle, eccentric journal and rod all share the X axis.
   The rod joins the journal to the wrist pin with constant length. */
const crankWeb = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.74, 0.52, 3, 0.07), clay("#e8b64c"));
crankWeb.position.set(-0.20, 0.16, 0); crank.add(crankWeb);
const crankWeb2=crankWeb.clone();crankWeb2.material=crankWeb.material.clone();crankWeb2.position.x=0.20;crank.add(crankWeb2);
const journal=new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.105,0.56,24),clay("#aab6bd"));
journal.rotation.z=Math.PI/2;journal.position.y=0.35;crank.add(journal);
const flywheel=new THREE.Mesh(new THREE.CylinderGeometry(0.68,0.68,0.18,48),clay("#648c92"));
flywheel.rotation.z=Math.PI/2;flywheel.position.x=-1.1;crank.add(flywheel);inkify(flywheel,1.025);
for(let i=0;i<6;i++) {
 const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,0.19,16),clay("#35565e"));
 hole.rotation.z=Math.PI/2;hole.position.set(-1.105,Math.cos(i*Math.PI/3)*0.45,Math.sin(i*Math.PI/3)*0.45);crank.add(hole);
}
crank.position.y = 1.0;
engine.add(crank);
const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1, 16), clay("#c9d4dc"));
engine.add(rod);
const rodEnds=[];
for (const radius of [0.15,0.115]) {
 const bearing=new THREE.Mesh(new THREE.TorusGeometry(radius,0.055,8,24),clay("#aab6bd"));
 bearing.rotation.y=Math.PI/2;engine.add(bearing);rodEnds.push(bearing);inkify(bearing,1.035);
}
const CRANK_R=0.35, ROD_L=1.25;
function linkage(angle, exploded=false) {
 const pin=new THREE.Vector3(0,crank.position.y+CRANK_R*Math.cos(angle),CRANK_R*Math.sin(angle));
 const wrist=new THREE.Vector3(0,exploded?pin.y+ROD_L:piston.position.y,0);
 crank.rotation.x=angle;
 rod.position.copy(pin).add(wrist).multiplyScalar(0.5);
 const vector=wrist.clone().sub(pin);
 rod.scale.y=vector.length();
 rod.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());
 rodEnds[0].position.copy(pin);rodEnds[1].position.copy(wrist);
}
linkage(0);

/* ink every solid part; ghost edges on the exterior for x-ray */
[ piston, valveIn, valveOut, injector, rod ].forEach((m) => inkify(m, 1.045));
const hulls = new Map();
[ block, head, shell ].forEach((m) => hulls.set(m, inkify(m, 1.03)));
crankAxle.rotation.set(0, 0, 0); inkify(crankAxle, 1.05); crankAxle.rotation.z = Math.PI / 2;
inkify(crankWeb, 1.06); inkify(crankWeb2,1.06); inkify(journal,1.035);
const ghosts = new Map();
[ block, head, shell ].forEach((m) => ghosts.set(m, ghostify(m)));

/* The chamber occupies only the space above the piston crown.
   Warmth is a teaching cue, not a simulated temperature. */
const boomMat = new THREE.MeshBasicMaterial({ color: "#ff9d3c", transparent: true, opacity: 0 });
const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.68,0.68,1,32), boomMat);
engine.add(boom);
const spray=makeSpray();
function makeSpray(){
 const g=new THREE.Group();
 for(let i=0;i<5;i++){
  const bead=new THREE.Mesh(new THREE.SphereGeometry(0.025,8,6),new THREE.MeshBasicMaterial({color:"#d76e25",transparent:true,opacity:0}));
  g.add(bead);
 }
 engine.add(g);return g;
}

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
PARTS.push({mesh:rod,name:"Connecting Rod",text:"This jointed arm joins the piston pin to the offset crank pin. Watch it tilt as the crank turns.",out:0,label:"connecting rod",anchor:new THREE.Vector3(0,-0.08,0),home:rod.position.y});
rod.userData.part=PARTS[PARTS.length-1];
const pickMeshes = PARTS.map((p) => p.mesh).concat([crankAxle, crankWeb,crankWeb2,journal,flywheel]);
crankAxle.userData.part = PARTS[3]; crankWeb.userData.part = PARTS[3]; crankWeb2.userData.part=PARTS[3];journal.userData.part=PARTS[3];flywheel.userData.part=PARTS[3];

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
/* top band reserved for the narration banner while it runs (mode 2).
   Measured from the live DOM, so it holds at any width, font or safe-area.
   94 matches the long-standing stacking floor when no banner is up. */
let reserveCacheW = -1, reserveCacheY = 94;
function topReserveY() {
  if (mode !== 2) return 94;
  if (reserveCacheW !== innerWidth) {
    reserveCacheW = innerWidth;
    reserveCacheY = oneliner.getBoundingClientRect().bottom + 30;
  }
  return reserveCacheY;
}
function projectLabels() {
  const show = mode === 1 || mode === 2;
  const w = innerWidth, h = innerHeight;
  leaderSvg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  /* first pass: project anchors */
  const items = [];
  labeledParts.forEach((p, i) => {
    const el = labelEls.get(p);
    const path = leaderPaths.get(p);
    if (!show) { el.classList.remove("on"); path.classList.remove("on"); return; }
    tmpV.copy(p.anchor);
    p.mesh.localToWorld(tmpV);
    tmpV.project(camera);
    if (tmpV.z > 1) { el.classList.remove("on"); path.classList.remove("on"); return; }
    items.push({
      p, el, path,
      ax: (tmpV.x * 0.5 + 0.5) * w,
      ay: (-tmpV.y * 0.5 + 0.5) * h,
      side: i % 2 === 0 ? -1 : 1,
    });
  });
  /* wide screens: leftmost parts get left-hand labels, rightmost get right,
     so leader lines do not run across neighbouring parts */
  if (w >= 500) {
    const byX = items.slice().sort((a, b) => a.ax - b.ax);
    byX.forEach((it, k) => { it.side = k < byX.length / 2 ? -1 : 1; });
  }
  /* second pass: stack per side with a minimum gap so labels never collide */
  const columns = w < 500 ? [[0, items.slice().sort((a, b) => a.ay - b.ay)]] : [[-1, []], [1, []]];
  if (w >= 500) {
    columns[0][1] = items.filter((it) => it.side === -1).sort((a, b) => a.ay - b.ay);
    columns[1][1] = items.filter((it) => it.side === 1).sort((a, b) => a.ay - b.ay);
  }
  const minAx = Math.min(...items.map((it) => it.ax)), maxAx = Math.max(...items.map((it) => it.ax));
  for (const [side0, col] of columns) {
    let prevY = topReserveY() - 34;
    for (const it of col) {
      let ly = Math.max(prevY + 34, it.ay - 18);
      ly = Math.min(h - 110, ly);
      if(it.p.mesh===rod && w<500 && mode===2) ly=Math.min(document.getElementById("stepui").getBoundingClientRect().top-18,it.ay+52);
      const side = w < 500 ? (it.p.mesh===rod ? -1 : it.ax < w / 2 ? -1 : 1) : it.side;
      /* wide screens: park each label column just outside the whole model
         so a label never sits on a neighbouring part */
      /* phones: park labels in the outer margins (measured width) so they
         neither touch the model nor run past the screen edge */
      const half = it.el.offsetWidth / 2 + 8;
      const lx0 = w >= 500
        ? Math.max(70, Math.min(w - 70, side < 0 ? minAx - 125 : maxAx + 125))
        : (side < 0 ? half : w - half);
      const lx = Math.max(half, Math.min(w - half, lx0));
      it.el.style.transform = `translate(${Math.round(lx)}px, ${Math.round(ly)}px) translate(-50%, -100%)`;
      // End outside the nearest label edge, never under its letters.
      const edgeX=lx+(it.ax<lx?-1:1)*(it.el.offsetWidth/2+6);
      const edgeY=ly-it.el.offsetHeight/2;
      it.path.setAttribute("d", `M ${it.ax.toFixed(1)} ${it.ay.toFixed(1)} L ${edgeX.toFixed(1)} ${edgeY.toFixed(1)}`);
      it.el.classList.add("on"); it.path.classList.add("on");
      if(it.p.mesh!==rod || w>=500 || mode!==2) prevY = ly;
    }
  }
}

/* ---------- x-ray crossfade ---------- */
let xray = 0; /* 0 = solid, 1 = x-ray */
function setXrayTargets(on) {
  for (const [mesh, edges] of ghosts) {
    spring(edges.material, "opacity", on ? 0.9 : 0, { stiffness: 40, damping: 10 });
    spring(mesh.material, "opacity", on ? 0.16 : (mesh === shell ? 0.45 : 1), { stiffness: 40, damping: 10 });
    mesh.children.forEach(child=>{
      if(child.isMesh && child!==hulls.get(mesh)) {
        if(!child.material.transparent){child.material.transparent=true;child.material.needsUpdate=true;}
        spring(child.material,"opacity",on?0.16:1,{stiffness:40,damping:10});
      }
    });
    /* turning transparency on after first compile needs a shader rebuild,
       or the opacity spring is silently ignored (block/head stayed solid) */
    if (!mesh.material.transparent) { mesh.material.transparent = true; mesh.material.needsUpdate = true; }
    /* the ink hull is a second opaque skin: fade it too, or x-ray shows a
       dark inverted shell where the part was */
    const hull = hulls.get(mesh);
    if (hull) spring(hull.material, "opacity", on ? 0 : 1, { stiffness: 40, damping: 10 });
  }
}

/* ---------- four-stroke cycle ---------- */
const STROKES = [
  { word: "Air in!", line: "The air valve opens. The descending piston draws air in." },
  { word: "Squeeze!", line: "The piston squeezes the air tight. Squeezed air gets really HOT!" },
  { word: "BOOM!", line: "Fuel sprays into hot air and burns. The expanding gas pushes the piston down." },
  { word: "Puff out!", line: "The exhaust valve opens. The rising piston pushes used gas out." },
];
const STROKE_T = 2.0;
let cycleT = 0, lastStroke = -1, boomSeen = false, graceUntil = 0, graceMax = 0;
/* learner-paced stepping: the default way through the four moves is one
   press, one move, then the engine waits for the next press */
let stepMode = true;    /* true: Next! advances one stroke; false: runs on its own */
let stepRunning = false; /* a pressed stroke is animating right now */
let curStroke = -1;      /* stroke playing or last played in step mode (-1 = none yet) */
let runUntil = 0;        /* absolute cycleT where the current step pauses */

/* ---------- modes + chrome ---------- */
const banner = document.getElementById("banner");
const oneliner = document.getElementById("oneliner");
const hint = document.getElementById("hint");
const card = document.getElementById("card");
const cardName = document.getElementById("card-name");
const cardText = document.getElementById("card-text");
const chrome = [...document.querySelectorAll(".chrome")].filter((c) => c.id !== "modes");
const modeBtns = [...document.querySelectorAll(".modebtn")];
const stepui = document.getElementById("stepui");
const nextBtn = document.getElementById("next");
const autoBtn = document.getElementById("autotoggle");
let mode = 0;
let camDist = innerWidth / innerHeight < 0.75 ? 13 : 10.9;

const HINTS = [
  "Drag to spin it around",
  "Tap a part to meet it",
  "Watch it go - four moves, over and over",
];
const MAGIC = "Diesel secret: NO spark plug! The squeeze alone makes the air so hot, the fuel lights by itself.";

let secretTimer = 0;
function setMode(m) {
  const prevMode = mode;
  /* a pending secret-card timer from an earlier visit must not fire late */
  clearTimeout(secretTimer);
  mode = m;
  /* mode 2 pulls back so the whole engine fits between the narration
     band and the hint band - genuinely separate space, both widths */
  camDist = (innerWidth / innerHeight < 0.75 ? 13 : 10.9) + (m === 1 ? 8.0 : 0) + (m === 2 ? (innerWidth / innerHeight < 0.75 ? 1.5 : 8.5) : 0);
  /* laptop Peek inside: the spread is taller than the screen at the default
     max distance, so allow a slightly longer camera there (and only there) */
  const wideXray = m === 1 && innerWidth / innerHeight >= 0.75;
  if (wideXray) camDist = 14;
  /* laptop Make it go: the swept crank must clear the bottom hint, so pull
     back a little (OrbitControls clamps to maxDistance, so raise it too) */
  const wideGo = m === 2 && innerWidth / innerHeight >= 0.75;
  if (wideGo) camDist = 15.5;
  /* phone Peek inside: same clamp, a little more room so the lifted valve
     clears the top edge */
  const phoneXray = m === 1 && innerWidth / innerHeight < 0.75;
  if (phoneXray) camDist = 14;
  controls.maxDistance = wideXray ? 14 : wideGo ? 15.5 : phoneXray ? 14 : m===2 ? 14.5 : 13;
  modeBtns.forEach((b, i) => {
    b.classList.toggle("active", i === m);
    if (i === m) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
  });
  controls.autoRotate = m === 0 && !reducedMotion;
  card.classList.remove("show");
  stepui.classList.remove("show");
  hint.textContent = HINTS[m];
  hint.classList.add("show");
  if (m === 1) {
    banner.classList.remove("pop"); oneliner.classList.remove("show");
    for (const p of PARTS.filter(p=>p.mesh!==rod)) spring(p.mesh.position, "y", p.home + p.out, { stiffness: 42, damping: 8.5 });
    setXrayTargets(true);
  } else {
    for (const p of PARTS.filter(p=>p.mesh!==rod)) spring(p.mesh.position, "y", p.home, { stiffness: 48, damping: 9 });
    setXrayTargets(m === 2); /* cycle runs x-ray too, so the piston is visible */
  }
  if (m === 2) {
    for(let i=springs.length-1;i>=0;i--) if(springs[i].obj===piston.position||springs[i].obj===crank.position||springs[i].obj===valveIn.position||springs[i].obj===valveOut.position) springs.splice(i,1);
    crank.position.y=1; piston.position.y=2.6; linkage(0);
    cycleT = 0; lastStroke = -1; boomSeen = false;
    curStroke = -1; stepRunning = false; runUntil = 0;
    updateStepUI();
    /* let the camera finish easing before the first headline appears, so the
       lifted valves never pass through the narration */
    graceUntil = performance.now() + (prevMode === 1 ? 2100 : 1200);
    graceMax = performance.now() + 5000;
  } else {
    setTimeout(() => { if (mode !== 2) { banner.classList.remove("pop"); oneliner.classList.remove("show"); } }, 400);
  }
  wakeChrome();
}
modeBtns.forEach((b, i) => b.addEventListener("click", () => setMode(i)));

/* step mode hides the hint: the pulsing button is the invitation.
   run mode brings back the original "watch it go" hint. */
function updateStepUI() {
  if (mode !== 2) { stepui.classList.remove("show"); return; }
  stepui.classList.add("show");
  if (stepMode) {
    nextBtn.hidden = stepRunning;
    nextBtn.textContent = curStroke < 0 ? "Go!" : curStroke >= 3 ? "Go again!" : "Next!";
    nextBtn.classList.toggle("invite", !stepRunning && !reducedMotion);
    autoBtn.textContent = "Let it run";
    hint.classList.remove("show");
  } else {
    nextBtn.hidden = true;
    autoBtn.textContent = "Step it";
    hint.textContent = HINTS[2];
    hint.classList.add("show");
  }
}

nextBtn.addEventListener("click", () => {
  if (mode !== 2 || !stepMode || stepRunning) return;
  if (curStroke >= 3) { cycleT = 0; curStroke = -1; }
  curStroke++;
  runUntil = cycleT + STROKE_T;
  stepRunning = true;
  updateStepUI();
  wakeChrome();
});

autoBtn.addEventListener("click", () => {
  if (mode !== 2) return;
  stepMode = !stepMode;
  if (stepMode) {
    /* pause at the end of the stroke already in flight, never rewind */
    curStroke = Math.floor((cycleT / STROKE_T) % 4);
    runUntil = (Math.floor(cycleT / STROKE_T) + 1) * STROKE_T;
    stepRunning = true;
  } else {
    /* the paused pose sits exactly on a stroke boundary, so the cycle
       simply continues into the next move */
    stepRunning = false;
  }
  updateStepUI();
  wakeChrome();
});

document.getElementById("card-ok").addEventListener("click", () => {
  card.classList.remove("show");
  wakeChrome();
});

let suspended=false;
addEventListener("blur",()=>{suspended=true;});
addEventListener("focus",()=>{suspended=false;clock.getDelta();});
document.addEventListener("visibilitychange",()=>{suspended=document.hidden;clock.getDelta();});

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
    card.classList.remove("secret");
    card.classList.add("show");
    if(p.mesh===rod) return;
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

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (mode === 2) {
    const nowMs = performance.now();
    /* wait for the minimum pause AND for the camera to arrive (but never
       longer than 5s, so a slow device is not left without narration) */
    /* the camera grace only matters when running on its own; a pressed
       step starts right away so an eager tap always sticks */
    const inGrace = !stepMode && (nowMs < graceUntil || (nowMs < graceMax && Math.abs(camera.position.length() - camDist) > 0.45));
    if (!suspended && !inGrace && (!stepMode || stepRunning)) cycleT += dt;
    if (stepMode && stepRunning && cycleT >= runUntil) {
      cycleT = runUntil;
      stepRunning = false;
      updateStepUI();
    }
    /* paused: hold the last played stroke at its end pose, so the scene,
       labels and dots freeze mid-lesson instead of peeking the next move */
    const ph = stepMode && !stepRunning ? (curStroke < 0 ? 0 : curStroke + 0.9999) : (cycleT / STROKE_T) % 4;
    const stroke = Math.floor(ph);
    const f = ph - stroke;
    const ease = f * f * (3 - 2 * f);

    if (!inGrace && stroke !== lastStroke && (!stepMode || stepRunning)) {
      lastStroke = stroke;
      banner.textContent = STROKES[stroke].word;
      banner.classList.remove("pop"); void banner.offsetWidth;
      banner.classList.add("pop");
      oneliner.textContent = STROKES[stroke].line;
      oneliner.classList.add("show");
      if (stroke === 2 && !boomSeen) {
        boomSeen = true;
        secretTimer = setTimeout(() => {
          if (mode === 2) { cardName.textContent = "The diesel secret"; cardText.textContent = MAGIC; card.classList.add("secret", "show"); }
        }, 2600);
      }
    }

    const angle=ph*Math.PI;
    const lateral=CRANK_R*Math.sin(angle);
    piston.position.y=crank.position.y+CRANK_R*Math.cos(angle)+Math.sqrt(ROD_L*ROD_L-lateral*lateral);
    linkage(angle);

    valveIn.position.y = 3.75 - (stroke === 0 ? Math.sin(f * Math.PI) * 0.3 : 0);
    valveOut.position.y = 3.75 - (stroke === 3 ? Math.sin(f * Math.PI) * 0.3 : 0);



    const crown=piston.position.y+0.36, ceiling=3.28;
    const chamberHeight=Math.max(0.025,ceiling-crown);
    boom.position.y=crown+chamberHeight/2;
    boom.scale.set(1,chamberHeight,1);
    boomMat.color.set(stroke===1?"#e9943f":stroke===2?"#ef7837":"#a9ccd7");
    boomMat.opacity=stroke===1?0.12+f*0.22:stroke===2?0.25:stroke===0?0.10:0.06;
    spray.children.forEach((d,i)=>{
      const u=(f*3+i*0.18)%1;
      d.position.set(Math.sin(i*2.4)*u*0.38,3.26-u*chamberHeight*0.8,Math.cos(i*2.4)*u*0.38);
      d.material.opacity=stroke===2&&f<0.28?0.9:0;
    });

    airDots.children.forEach((d, i) => {
      const ff = (f + i * 0.16) % 1;
      d.position.set(-0.55 + Math.sin(i * 2.1) * 0.15, 3.9 - ff * 0.8, Math.cos(i * 1.7) * 0.15);
      d.material.opacity = stroke === 0 ? Math.sin(ff * Math.PI) * 0.9 : 0;
    });
    smokeDots.children.forEach((d, i) => {
      const ff = (f + i * 0.16) % 1;
      d.position.set(0.55 + Math.sin(i * 1.9) * 0.2 + ff * 0.5, 3.4 + ff * 1.3, Math.cos(i * 2.3) * 0.2);
      d.material.opacity = stroke === 3 ? Math.sin(ff * Math.PI) * 0.7 : 0;
      d.scale.setScalar(1 + ff * 1.6);
    });
  } else {
    spray.children.forEach(d=>d.material.opacity=0);
    airDots.children.forEach((d) => (d.material.opacity = 0));
    smokeDots.children.forEach((d) => (d.material.opacity = 0));
    boomMat.opacity = Math.max(0, boomMat.opacity - dt * 4);
    if (mode === 0) { piston.position.y=2.6; linkage(0); }
    if (mode === 1) linkage(0,true);
  }

  const len = camera.position.length();
  camera.position.setLength(lerp(len, camDist, 1 - Math.exp(-2.2 * dt)));
  /* mode 1 lifts to frame the ghosted spread; mode 2 adds a small lift on
     tall screens so the top labels stay below the narration banner band */
  /* mode 1 lifts to frame the ghosted spread (further on tall screens,
     where the valves otherwise crop off the top); mode 2 drops the
     engine below the measured narration band at both widths */
  const tall = innerWidth / innerHeight < 0.75;
  const xrayLift = mode === 1 ? (tall ? 2.0 : 1.1) : mode === 2 ? (tall ? 1.5 : 1.45) : 0;
  controls.target.y = lerp(controls.target.y, baseTargetY + xrayLift, 1 - Math.exp(-2.2 * dt));
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
  if (mode === 0) {
    modeBtns[0].classList.add("active");
    modeBtns[0].setAttribute("aria-current", "true");
    hint.textContent = HINTS[0];
  }
  setTimeout(() => hint.classList.add("show"), 800);
  wakeChrome();
}, 1900);
