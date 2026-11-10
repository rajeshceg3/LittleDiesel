import * as THREE from "three";
import { questions, transfer, createLesson, reduceLesson } from "./learning.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/* ---------- tiny spring tween ---------- */
const springs = [];
function spring(obj, key, to, { stiffness = 55, damping = 9 } = {}) {
  if (reducedMotion) {
    obj[key] = to;
    return;
  }
  let s = springs.find((e) => e.obj === obj && e.key === key);
  if (!s) {
    s = { obj, key, v: 0 };
    springs.push(s);
  }
  s.to = to;
  s.stiffness = stiffness;
  s.damping = damping;
}
function stepSprings(dt) {
  for (let i = springs.length - 1; i >= 0; i--) {
    const s = springs[i];
    const x = s.obj[s.key];
    const F = -s.stiffness * (x - s.to) - s.damping * s.v;
    s.v += F * dt;
    s.obj[s.key] = x + s.v * dt;
    if (Math.abs(s.v) < 0.0004 && Math.abs(s.obj[s.key] - s.to) < 0.0004) {
      s.obj[s.key] = s.to;
      springs.splice(i, 1);
    }
  }
}
const lerp = (a, b, t) => a + (b - a) * t;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- renderer ---------- */
const canvas = document.getElementById("engine");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f7eedd");
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(4.1, 3.1, 7.8);

const hemi = new THREE.HemisphereLight(0xfff8ec, 0xe6cba6, 1.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(4, 8, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 7, bottom: -3, near: 0.5, far: 20 });
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.0005;
scene.add(sun);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 2, 0);
controls.enablePan = false;
controls.enableDamping = !reducedMotion;
controls.dampingFactor = 0.1;
controls.minPolarAngle = 0.4;
controls.maxPolarAngle = 1.65;
controls.autoRotate = false;
const stage = document.getElementById("model-stage");
let stageSize = { w: 1, h: 1 };
let fittedDistance = 9;
let teachingBounds = null;
function fitCamera() {
  // Consume any leftover orbit inertia before restoring the canonical pose.
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = damping;
  const r = canvas.getBoundingClientRect();
  stageSize = { w: r.width, h: r.height };
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  const center = new THREE.Vector3(0, 2.05, 0),
    dir = new THREE.Vector3(7.2, 2.0, 6.8).normalize();
  camera.position.copy(center).addScaledVector(dir, 10);
  camera.lookAt(center);
  camera.updateMatrixWorld(true);
  const inv = camera.quaternion.clone().invert(),
    ty = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
    tx = ty * camera.aspect;
  let d = 0;
  const points = teachingBounds || [new THREE.Vector3(-1.7, 0, -1.1), new THREE.Vector3(1.7, 4.6, 1.1)];
  for (const point of points) {
    const v = point.clone().sub(center).applyQuaternion(inv);
    d = Math.max(d, v.z + Math.max(Math.abs(v.x) / tx, Math.abs(v.y) / ty));
  }
  fittedDistance = d * 1.04;
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(dir, fittedDistance);
  controls.minDistance = fittedDistance * 0.5;
  controls.maxDistance = fittedDistance * 1.8;
  controls.update();
}
new ResizeObserver(fitCamera).observe(stage);
/* soft ground blob - a paper shadow */
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(3.1, 40),
  new THREE.MeshBasicMaterial({
    color: "#e4d3b6",
    transparent: true,
    opacity: 0.26,
  }),
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = -0.02;
scene.add(blob);
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40),
  new THREE.ShadowMaterial({ opacity: 0.18 }));
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = -0.01;
contactShadow.receiveShadow = true;
scene.add(contactShadow);

/* ---------- ink helpers ---------- */
const INK = "#33241c";
/* hand-inked outline: inverted hull with a fixed, per-part wobble */
function inkify(mesh, thickness = 1.03) {
  const hull = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({
      color: INK,
      side: THREE.BackSide,
      transparent: true,
    }),
  );
  hull.scale.setScalar(thickness);
  hull.rotation.set(
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02,
  );
  hull.raycast = () => {};
  mesh.add(hull);
  return hull;
}
/* wireframe ghost for x-ray mode: ink edges, barely-there paper fill */
function ghostify(mesh) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 24),
    new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0 }),
  );
  edges.raycast = () => {};
  mesh.add(edges);
  return edges;
}
const toon3 = (() => {
  const c = document.createElement("canvas");
  c.width = 3;
  c.height = 1;
  const g = c.getContext("2d");
  g.fillStyle = "#8a8a8a";
  g.fillRect(0, 0, 1, 1);
  g.fillStyle = "#c8c8c8";
  g.fillRect(1, 0, 1, 1);
  g.fillStyle = "#ffffff";
  g.fillRect(2, 0, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
const clay = (color) =>
  new THREE.MeshToonMaterial({ color, gradientMap: toon3 });

/* ---------- the engine (a friendly toy, drawn in ink) ---------- */
const engine = new THREE.Group();
scene.add(engine);

/* block (the engine's body) */
const block = new THREE.Mesh(
  new RoundedBoxGeometry(2.6, 0.85, 2, 5, 0.3),
  clay("#e8735a"),
);
block.position.y = 0.42;
engine.add(block);

/* cylinder shell (the piston's home) */
const shell = new THREE.Mesh(
  new THREE.CylinderGeometry(
    0.78,
    0.78,
    2.1,
    48,
    1,
    true,
    Math.PI / 3,
    (Math.PI * 4) / 3,
  ),
  new THREE.MeshToonMaterial({
    color: "#aebfca",
    gradientMap: toon3,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  }),
);
shell.position.y = 2.25;
engine.add(shell);

/* piston */
const piston = new THREE.Mesh(
  new THREE.CylinderGeometry(0.62, 0.62, 0.72, 36),
  clay("#7fb3d5"),
);
piston.position.y = 2.6;
engine.add(piston);

/* Ring grooves, crown bowl and wrist pin distinguish a piston from a can.
   Schematic details, not the specification of a particular engine. */
for (const y of [0.2, 0.29]) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.625, 0.028, 8, 48),
    clay("#496c80"),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = y;
  piston.add(ring);
}
const bowl = new THREE.Mesh(
  new THREE.CylinderGeometry(0.27, 0.23, 0.018, 32),
  clay("#496c80"),
);
bowl.position.y = 0.367;
piston.add(bowl);
const wrist = new THREE.Mesh(
  new THREE.CylinderGeometry(0.095, 0.095, 1.32, 20),
  clay("#d6dde0"),
);
wrist.rotation.z = Math.PI / 2;
piston.add(wrist);
inkify(wrist, 1.045);

/* Rear half of the head: an explicit teaching section, not a transparent lid. */
const head = new THREE.Mesh(
  new RoundedBoxGeometry(2.2, 0.7, 0.74, 4, 0.12),
  clay("#c78837"),
);
head.position.set(0, 3.62, -0.48);
engine.add(head);

/* valves: intake + exhaust */
const valveIn = new THREE.Mesh(
  new THREE.CylinderGeometry(0.095, 0.095, 0.9, 24),
  clay("#49986d"),
);
valveIn.position.set(-0.62, 3.75, 0.22);
engine.add(valveIn);
const valveOut = new THREE.Mesh(
  new THREE.CylinderGeometry(0.095, 0.095, 0.9, 24),
  clay("#8b72a6"),
);
valveOut.position.set(0.62, 3.75, 0.22);
engine.add(valveOut);

/* Poppet faces meet the underside of the head; visible springs above it. */
for (const [v, color] of [
  [valveIn, "#7dcfa0"],
  [valveOut, "#9a8fb8"],
]) {
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.255, 0.28, 0.10, 32),
    clay(color),
  );
  face.position.y = -0.43;
  v.add(face);
  inkify(face, 1.04);
  const points = Array.from({ length: 97 }, (_, i) => {
    const a = (i / 96) * Math.PI * 10;
    return new THREE.Vector3(
      Math.cos(a) * 0.15,
      0.13 + (i / 96) * 0.3,
      Math.sin(a) * 0.15,
    );
  });
  const coil = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      96,
      0.029,
      6,
      false,
    ),
    clay("#665b51"),
  );
  v.add(coil);
}
/* Cooling fins and bolts articulate the cylinder head, without new UI. */
for (const y of [-0.15, 0.04, 0.23]) {
  const fin = new THREE.Mesh(
    new RoundedBoxGeometry(2.3, 0.065, 0.82, 2, 0.025),
    clay("#8e592d"),
  );
  fin.position.y = y;
  fin.userData.fin = true;
  head.add(fin);
}
for (const x of [-0.88, 0.88])
  for (const z of [-0.22, 0.22]) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.08, 6),
      clay("#766652"),
    );
    bolt.position.set(x, 0.39, z);
    head.add(bolt);
  }

/* fuel injector */
const injector = new THREE.Mesh(
  new THREE.CylinderGeometry(0.17, 0.23, 1.0, 24),
  clay("#f0924c"),
);
injector.position.set(0, 3.98, -0.08);
injector.rotation.x = 0.18;
const nozzle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.075, 0.035, 0.26, 20),
  clay("#665b51"),
);
nozzle.position.y = -0.6;
injector.add(nozzle);
for (const y of [0.14, 0.31]) {
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.09, 6),
    clay("#d77937"),
  );
  collar.position.y = y;
  injector.add(collar);
}
engine.add(injector);

/* crankshaft + rod */
const crank = new THREE.Group();
const crankAxle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.22, 2.2, 20),
  clay("#725035"),
);
crankAxle.rotation.z = Math.PI / 2;
crank.add(crankAxle);
/* The crank axle, eccentric journal and rod all share the X axis.
   The rod joins the journal to the wrist pin with constant length. */
const crankWeb = new THREE.Mesh(
  new RoundedBoxGeometry(0.16, 0.74, 0.52, 3, 0.07),
  clay("#e8b64c"),
);
crankWeb.position.set(-0.2, 0.16, 0);
crank.add(crankWeb);
const crankWeb2 = crankWeb.clone();
crankWeb2.material = crankWeb.material.clone();
crankWeb2.position.x = 0.2;
crank.add(crankWeb2);
const journal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.105, 0.105, 0.56, 24),
  clay("#aab6bd"),
);
journal.rotation.z = Math.PI / 2;
journal.position.y = 0.35;
crank.add(journal);
const flywheel = new THREE.Mesh(
  new THREE.CylinderGeometry(0.68, 0.68, 0.18, 48),
  clay("#648c92"),
);
flywheel.rotation.z = Math.PI / 2;
flywheel.position.x = -1.1;
crank.add(flywheel);
inkify(flywheel, 1.025);
for (let i = 0; i < 6; i++) {
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.19, 16),
    clay("#35565e"),
  );
  hole.rotation.z = Math.PI / 2;
  hole.position.set(
    -1.105,
    Math.cos((i * Math.PI) / 3) * 0.45,
    Math.sin((i * Math.PI) / 3) * 0.45,
  );
  crank.add(hole);
}
crank.position.y = 1.0;
engine.add(crank);
const rod = new THREE.Mesh(
  new THREE.CylinderGeometry(0.09, 0.09, 1, 16),
  clay("#7e9aa8"),
);
engine.add(rod);
const rodEnds = [];
for (const radius of [0.15, 0.115]) {
  const bearing = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.055, 8, 24),
    clay("#aab6bd"),
  );
  bearing.rotation.y = Math.PI / 2;
  engine.add(bearing);
  rodEnds.push(bearing);
  inkify(bearing, 1.035);
}
const CRANK_R = 0.35,
  ROD_L = 1.25;
function linkage(angle, exploded = false) {
  const pin = new THREE.Vector3(
    0,
    crank.position.y + CRANK_R * Math.cos(angle),
    CRANK_R * Math.sin(angle),
  );
  const wrist = new THREE.Vector3(
    0,
    exploded ? pin.y + ROD_L : piston.position.y,
    0,
  );
  crank.rotation.x = angle;
  rod.position.copy(pin).add(wrist).multiplyScalar(0.5);
  const vector = wrist.clone().sub(pin);
  rod.scale.y = vector.length();
  rod.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    vector.normalize(),
  );
  rodEnds[0].position.copy(pin);
  rodEnds[1].position.copy(wrist);
}
linkage(0);

/* ink every solid part; ghost edges on the exterior for x-ray */
[piston, valveIn, valveOut, injector, rod].forEach((m) => inkify(m, 1.045));
const hulls = new Map();
[block, head, shell].forEach((m) => hulls.set(m, inkify(m, 1.03)));
crankAxle.rotation.set(0, 0, 0);
inkify(crankAxle, 1.05);
crankAxle.rotation.z = Math.PI / 2;
inkify(crankWeb, 1.06);
inkify(crankWeb2, 1.06);
inkify(journal, 1.035);
hulls.get(shell).material.opacity = 0;
const ghosts = new Map();
[block, head, shell].forEach((m) => ghosts.set(m, ghostify(m)));
ghosts.get(shell).material.color.set("#789baa");
ghosts.get(shell).material.opacity = 0.42;

/* Contact shadows give the inked clay a quiet sense of depth. */
engine.traverse((m) => {
  if (m.isMesh && !m.material.transparent) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
});
/* Schematic arrows expose the two motions without adding text over the model. */
const pistonMotion = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(1.10, 2.8, 0.18), 0.62, 0x285f7c, 0.18, 0.13);
engine.add(pistonMotion);
pistonMotion.visible = false;
const crankMotion = new THREE.Group();
const arc = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.025, 8, 48, Math.PI * 1.6),
  new THREE.MeshBasicMaterial({ color: "#9c572d" }));
arc.rotation.y = Math.PI / 2;
crankMotion.add(arc);
const arcTip = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.22, 12),
  new THREE.MeshBasicMaterial({ color: "#9c572d" }));
const end = Math.PI * 1.6;
arcTip.position.set(0, Math.sin(end) * 0.84, -Math.cos(end) * 0.84);
arcTip.rotation.x = end;
crankMotion.add(arcTip);
crankMotion.position.set(-1.23, 1, 0);
engine.add(crankMotion);
crankMotion.visible = false;

/* The chamber occupies only the space above the piston crown.
   Warmth is a teaching cue, not a simulated temperature. */
const boomMat = new THREE.MeshBasicMaterial({
  color: "#ff9d3c",
  transparent: true,
  opacity: 0,
});
const boom = new THREE.Mesh(
  new THREE.CylinderGeometry(0.68, 0.68, 1, 32),
  boomMat,
);
engine.add(boom);
const spray = makeSpray();
function makeSpray() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const bead = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 8, 6),
      new THREE.MeshBasicMaterial({
        color: "#d76e25",
        transparent: true,
        opacity: 0,
      }),
    );
    g.add(bead);
  }
  engine.add(g);
  return g;
}

/* air + smoke particles */
function makeDots(color, n) {
  const g = new THREE.SphereGeometry(0.09, 8, 8);
  const m = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
  });
  const grp = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const d = new THREE.Mesh(g, m.clone());
    grp.add(d);
  }
  scene.add(grp);
  return grp;
}
const airDots = makeDots("#7fb3d5", 6);
const smokeDots = makeDots("#a89e90", 6);

/* ---------- parts registry ---------- */
/* xray:true = exterior (ghosts in x-ray); label = leader-line note in x-ray */
const PARTS = [
  {
    mesh: piston,
    name: "Piston",
    text: "A little elevator. It rides up and down all day long.",
    out: 1.7,
    label: "piston",
    anchor: new THREE.Vector3(0.62, 0.2, 0),
  },
  {
    mesh: shell,
    name: "Cylinder",
    text: "The piston's home. All the action happens in here.",
    out: 1.0,
    xray: true,
  },
  {
    mesh: injector,
    name: "Fuel Injector",
    text: "A tiny spray can. It spritzes fuel into the hot air.",
    out: 2.0,
    label: "fuel injector",
    anchor: new THREE.Vector3(0.2, 0.5, 0.15),
  },
  {
    mesh: crank,
    name: "Crankshaft",
    text: "The spinner. It turns up-and-down into round-and-round.",
    out: -0.35,
    label: "crankshaft",
    anchor: new THREE.Vector3(0.3, -0.1, 0),
  },
  {
    mesh: valveIn,
    name: "Valves",
    text: "Little doors. One lets air in, one lets smoke out.",
    out: 1.8,
    label: "air door in",
    anchor: new THREE.Vector3(-0.1, 0.5, 0),
  },
  {
    mesh: valveOut,
    name: "Valves",
    text: "Little doors. One lets air in, one lets smoke out.",
    out: 1.8,
    label: "smoke door out",
    anchor: new THREE.Vector3(0.1, 0.5, 0),
  },
  {
    mesh: head,
    name: "Cylinder Head",
    text: "The lid on top. It keeps all the squeezing inside.",
    out: 1.5,
    xray: true,
  },
  {
    mesh: block,
    name: "Engine Block",
    text: "The strong base. The whole engine sits on it.",
    out: 0,
    xray: true,
  },
];
PARTS.forEach((p) => {
  p.home = p.mesh.position.y;
  p.mesh.userData.part = p;
});
PARTS.push({
  mesh: rod,
  name: "Connecting Rod",
  text: "This jointed arm joins the piston pin to the offset crank pin. Watch it tilt as the crank turns.",
  out: 0,
  label: "connecting rod",
  anchor: new THREE.Vector3(0, -0.08, 0),
  home: rod.position.y,
});
rod.userData.part = PARTS[PARTS.length - 1];
const pickMeshes = PARTS.map((p) => p.mesh).concat([
  crankAxle,
  crankWeb,
  crankWeb2,
  journal,
  flywheel,
]);
crankAxle.userData.part = PARTS[3];
crankWeb.userData.part = PARTS[3];
crankWeb2.userData.part = PARTS[3];
journal.userData.part = PARTS[3];
flywheel.userData.part = PARTS[3];

function setXrayTargets(on) {
  for (const [mesh, edges] of ghosts) {
    spring(edges.material, "opacity", on ? 0.65 : mesh === shell ? 0.42 : 0, {
      stiffness: 40,
      damping: 10,
    });
    spring(mesh.material, "opacity", mesh === shell ? (on ? 0.09 : 0.15) : on ? 0.38 : 1, {
      stiffness: 40,
      damping: 10,
    });
    mesh.children.forEach((child) => {
      if (child.isMesh && child !== hulls.get(mesh)) {
        if (!child.material.transparent) {
          child.material.transparent = true;
          child.material.needsUpdate = true;
        }
        spring(child.material, "opacity", on ? 0.38 : 1, {
          stiffness: 40,
          damping: 10,
        });
      }
    });
    /* turning transparency on after first compile needs a shader rebuild,
       or the opacity spring is silently ignored (block/head stayed solid) */
    if (!mesh.material.transparent) {
      mesh.material.transparent = true;
      mesh.material.needsUpdate = true;
    }
    /* the ink hull is a second opaque skin: fade it too, or x-ray shows a
       dark inverted shell where the part was */
    const hull = hulls.get(mesh);
    if (hull)
      spring(hull.material, "opacity", mesh === shell ? 0 : on ? 0.24 : 1, {
        stiffness: 40,
        damping: 10,
      });
  }
}

/* One journey. Exploration never changes its place. */
const $ = (id) => document.getElementById(id);
let lesson = createLesson(),
  exploring = false,
  playing = false,
  previewing = false,
  moving = false,
  cycleT = 0,
  runUntil = 0,
  curStroke = -1,
  suspended = false,
  selectedPart = 0,
  limitsOpen = false;
const STROKES = [
  {
    name: "Air in",
    line: "Burning fuel needs air. The inlet valve, a small door, opens as the piston moves down and draws air in.",
  },
  {
    name: "Squeeze",
    line: "Diesel needs hot air to light its fuel. Both valves shut; the rising piston squeezes the trapped air, heating it: compression.",
  },
  {
    name: "Power",
    line: "The injector sprays fuel into hot air, where it burns. The gas expands and pushes down: the power stroke.",
  },
  {
    name: "Exhaust",
    line: "Used gas must leave before fresh air enters. The outlet, called the exhaust valve, opens while the rising piston pushes gas out.",
  },
];
const descriptions = {
  Piston:
    "A moving surface can collect a push from hot gas. The piston slides inside the cylinder; its flat top is the crown and its joint pin is the wrist pin.",
  Cylinder:
    "Gas needs a space that can shrink and grow. The cylinder guides the piston and holds the gas above it; this drawing cuts one side open.",
  "Fuel Injector":
    "Fuel must meet the hot air at the right time. The injector makes a fine spray near the end of compression; heat lights it, without an electric spark.",
  Crankshaft:
    "A wheel needs rotation, not a straight push. The rod acts on a pin away from the crankshaft centre, so the shaft turns; the attached disc is the flywheel.",
  "Cylinder Head":
    "Squeezing needs a closed space. The cylinder head seals the top and carries the valves and injector; its front is cut away here.",
  "Engine Block":
    "Moving parts need a firm support. The block holds the cylinder and crankshaft in place; cooling and oil passages are left out of this drawing.",
  "Connecting Rod":
    "The piston slides straight, but the crank pin travels in a circle. The connecting rod has a joint at each end, so it can tilt between them.",
};
PARTS[4].name = "Inlet Valve";
PARTS[5].name = "Exhaust Valve";
descriptions["Inlet Valve"] =
  "Air needs a way in, then it must stay trapped. The inlet valve is the door that opens for entry and shuts before squeezing.";
descriptions["Exhaust Valve"] =
  "Used gas needs a way out. The exhaust valve is the outlet door; it opens as the piston rises to clear the cylinder.";
PARTS.forEach((p, i) => {
  const o = document.createElement("option");
  o.value = i;
  o.textContent = p.name;
  $("part-select").append(o);
});
const partLine = $("part-line"),
  partAnchor = $("part-anchor");
function projectPart() {
  const show = exploring;
  $("leaders").classList.toggle("on", show);
  $("part-tag").hidden = !show;
  if (!show) return;
  const p = PARTS[selectedPart];
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(p.mesh);
  const anchor = p.anchor
    ? p.mesh.localToWorld(p.anchor.clone())
    : box.getCenter(new THREE.Vector3());
  anchor.clamp(box.min, box.max);
  anchor.project(camera);
  const x = (anchor.x * 0.5 + 0.5) * stageSize.w,
    y = (-anchor.y * 0.5 + 0.5) * stageSize.h;
  const onscreen =
    anchor.z >= -1 &&
    anchor.z <= 1 &&
    x >= 0 &&
    x <= stageSize.w &&
    y >= 0 &&
    y <= stageSize.h;
  $("leaders").classList.toggle("on", onscreen);
  $("part-tag").textContent =
    p.name + (onscreen ? "" : " · reset view to locate");
  const r = $("part-tag").getBoundingClientRect(),
    s = stage.getBoundingClientRect(),
    lx = r.left - s.left + r.width / 2,
    ly = r.bottom - s.top;
  $("leaders").setAttribute("viewBox", `0 0 ${stageSize.w} ${stageSize.h}`);
  partLine.setAttribute("d", `M ${lx} ${ly} L ${x} ${y}`);
  partAnchor.setAttribute("cx", x);
  partAnchor.setAttribute("cy", y);
}
function highlight() {
  for (const p of PARTS) {
    if (p.mesh.material?.emissive) {
      p.mesh.material.emissive.set(
        exploring && PARTS[selectedPart] === p ? "#955022" : "#000000",
      );
      p.mesh.material.emissiveIntensity =
        exploring && PARTS[selectedPart] === p ? 0.45 : 0;
    }
  }
}
function setPhase(action) {
  lesson = reduceLesson(lesson, action);
  render();
  $("guide-content").scrollTop = 0;
  if (action.type === "answer") {
    $("feedback").classList.remove("answer-enter");
    void $("feedback").offsetWidth;
    $("feedback").classList.add("answer-enter");
  }
}
function updateScrollHint() {
  const e = $("guide-content");
  $("scroll-hint").hidden = !(
    e.scrollHeight > e.clientHeight + 10 &&
    e.scrollTop + e.clientHeight < e.scrollHeight - 10
  );
}
$("guide-content").addEventListener("scroll", updateScrollHint, {
  passive: true,
});
new ResizeObserver(updateScrollHint).observe($("guide-content"));
function render() {
  const ph = lesson.phase;
  document.body.dataset.phase = exploring
    ? "parts"
    : previewing
      ? "playing"
      : ph;
  $("parts-toggle").textContent = exploring
    ? "Back to the guided journey"
    : "Look at parts one by one";
  $("parts-toggle").setAttribute("aria-expanded", String(exploring));
  $("part-picker").hidden = !exploring;
  $("answers").replaceChildren();
  $("feedback").textContent = "";
  $("read-more").open = false;
  $("read-more").hidden = false;
  $("next").disabled = moving && !playing;
  $("back").disabled = ph === "orient" || moving;
  $("play").disabled = moving;
  $("play").hidden = exploring;
  $("reset").hidden = exploring;
  $("progress").hidden = exploring;
  $("back").setAttribute(
    "aria-label",
    exploring ? "Previous part" : "Previous step",
  );
  $("play").textContent = playing ? "Ⅱ" : "▶";
  $("play").setAttribute(
    "aria-label",
    playing ? "Pause the engine cycle" : "Play the engine cycle",
  );
  $("play").title = playing
    ? "Pause the engine cycle"
    : "Play the engine cycle";
  $("parts-toggle").disabled = moving;
  let title = "",
    copy = "",
    more = "",
    next = "Next step";
  if (exploring) {
    const p = PARTS[selectedPart];
    title = "Why do we need the " + p.name.toLowerCase() + "?";
    copy = descriptions[p.name] || p.text;
    more =
      "The dashed connector and dot identify the selected part. The line is a diagram guide, not a pipe or force path; it may pass in front of other parts. Drag the model to see another side. Zoom controls work here too.";
    $("part-tag").textContent = p.name;
    $("part-select").value = String(selectedPart);
    next =
      selectedPart === PARTS.length - 1 ? "Back to the journey" : "Next part";
    $("back").disabled = selectedPart === 0;
  } else if (previewing) {
    const i = Math.floor((cycleT / 2) % 4);
    title = STROKES[i].name + (playing ? "" : " · paused");
    copy = STROKES[i].line;
    more =
      "Two crankshaft turns make one four-stroke cycle. Only the power stroke adds combustion energy. Crankshaft and flywheel motion carries the piston through the other strokes.";
    next = "Back to my journey";
    $("back").disabled = true;
  } else if (ph === "orient") {
    title = "How does a diesel turn a wheel?";
    copy =
      "A piston is a sliding plug inside a tube: the cylinder. A jointed connecting rod links it to a turning shaft: the crankshaft.";
    more =
      "A sliding piston cannot turn a wheel by itself. The rod pushes an off-centre pin on the crankshaft, converting the slide into a turn. Drag the model to see the joint.";
    next = "Start learning";
  } else if (["predict", "feedback", "ready", "moving", "held"].includes(ph)) {
    const i = lesson.stroke,
      q = questions[i];
    title =
      ph === "predict"
        ? [
            "What enters on the first downward move?",
            "Squeezing: what should the valves do?",
            "What starts the next downward push?",
            "How does used gas leave?",
          ][i]
        : ["Why bring air in first?", "Why squeeze the air?", "Why spray fuel into hot air?", "Why clear the used gas?"][i];
    copy = ph === "predict" ? "" : STROKES[i].line;
    more =
      i === 2
        ? "Ignition means the start of burning; combustion means burning itself. In this diesel, compression makes the air hot enough to ignite the sprayed fuel."
        : "A stroke is one trip of the piston, up or down. Only the power stroke adds energy from burning; the turning crank and flywheel carry the other moves.";
    if (ph === "predict") {
      [0, 1, 2]
        .map((n) => (n + i) % 3)
        .forEach((n) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = q.choices[n];
          b.onclick = () => setPhase({ type: "answer", choice: n });
          $("answers").append(b);
        });
      next = "Watch this move";
    } else if (ph === "feedback") {
      $("feedback").textContent = q.why[lesson.choices[i]];
      next = "Watch this move";
    } else if (ph === "moving") {
      next = "Watching the move…";
    } else if (ph === "held") {
      next = i === 3 ? "Try one new case" : "Next step";
    } else next = "Watch this move";
  } else if (ph === "transfer") {
    title = "What if the inlet stays open while squeezing?";
    copy = "";
    more =
      "Compression depends on trapping air. Consider what happens if a door stays open.";
    transfer.choices.forEach((c, n) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c;
      b.onclick = () => setPhase({ type: "answerTransfer", choice: n });
      $("answers").append(b);
    });
    next = "See the takeaway";
  } else if (ph === "transferFeedback") {
    title =
      lesson.transfer === transfer.answer
        ? "Trapped air is the key."
        : "Think about the open valve.";
    copy = transfer.why[lesson.transfer];
    next = "Put it all together";
    more =
      "This is a question about the mechanism, not a test score. You can return and try the moves again.";
  } else {
    title = "How do the moves make a turning crank?";
    copy =
      "Air in. Squeeze it hot. Spray fuel and get a push. Clear the used gas. The rod and off-centre crank pin turn the push into rotation.";
    more =
      "Try explaining it: why must both valves close for compression? When does fuel enter? How does a straight-moving piston turn a crank? Only the power stroke adds combustion energy; motion carries the engine through the other strokes.";
    next = "Run the whole cycle";
  }
  $("step-title").textContent = title;
  $("step-copy").textContent = copy;
  $("step-copy").hidden = !copy;
  $("more-copy").textContent = more;
  $("next").replaceChildren(document.createTextNode(next + " "));
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  $("next").append(arrow);
  $("progress").replaceChildren();
  const active =
    ph === "orient"
      ? 0
      : ["transfer", "transferFeedback", "teachback"].includes(ph)
        ? 5
        : lesson.stroke + 1;
  for (let i = 0; i < 6; i++) {
    const e = document.createElement("i");
    e.className = i === active ? "active" : "";
    $("progress").append(e);
  }
  $("progress").setAttribute(
    "aria-label",
    `Journey position ${active + 1} of 6`,
  );
  highlight();
  requestAnimationFrame(updateScrollHint);
}
function animateStroke() {
  if (moving) return;
  if (lesson.phase === "feedback")
    lesson = reduceLesson(lesson, { type: "continue" });
  if (lesson.phase === "predict")
    lesson = reduceLesson(lesson, { type: "skip" });
  curStroke = lesson.stroke;
  cycleT = curStroke * 2;
  runUntil = cycleT + 2;
  lesson = reduceLesson(lesson, { type: "move" });
  moving = true;
  setXrayTargets(true);
  render();
}
$("next").onclick = () => {
  if (exploring) {
    if (selectedPart === PARTS.length - 1) toggleParts();
    else selectPart(selectedPart + 1);
    return;
  }
  if (previewing) {
    playing = false;
    previewing = false;
    setXrayTargets(lesson.phase !== "orient");
    render();
    return;
  }
  const p = lesson.phase;
  if (p === "orient") {
    setXrayTargets(true);
    setPhase({ type: "start" });
  } else if (["predict", "feedback", "ready"].includes(p)) animateStroke();
  else if (p === "held") setPhase({ type: "next" });
  else if (p === "transfer" || p === "transferFeedback")
    setPhase({ type: "teachback" });
  else if (p === "teachback") {
    playing = true;
    previewing = true;
    setXrayTargets(true);
    render();
  }
};
$("back").onclick = () => {
  if (exploring) {
    selectPart(Math.max(0, selectedPart - 1));
    return;
  }
  if (moving) return;
  lesson = reduceLesson(lesson, { type: "previous" });
  curStroke = lesson.phase === "orient" ? -1 : lesson.stroke;
  cycleT = curStroke < 0 ? 0 : (curStroke + 1) * 2;
  setXrayTargets(lesson.phase !== "orient");
  render();
};
function selectPart(i) {
  selectedPart = i;
  render();
}
let wasPlaying = false;
function toggleParts() {
  if (moving) return;
  exploring = !exploring;
  if (exploring) {
    wasPlaying = playing;
    playing = false;
    selectedPart = 0;
    setXrayTargets(true);
  } else {
    playing = wasPlaying;
    setXrayTargets(playing || lesson.phase !== "orient");
  }
  render();
}
$("parts-toggle").onclick = toggleParts;
$("part-select").onchange = (e) => selectPart(Number(e.target.value));
$("play").onclick = () => {
  if (moving) return;
  previewing = true;
  playing = !playing;
  setXrayTargets(playing || lesson.phase !== "orient");
  render();
};
$("reset").onclick = () => {
  playing = false;
  previewing = false;
  moving = false;
  exploring = false;
  lesson = createLesson();
  cycleT = 0;
  curStroke = -1;
  setXrayTargets(false);
  piston.position.y = 2.6;
  crank.position.y = 1;
  linkage(0);
  fitCamera();
  render();
};
$("zoom-in").onclick = () => {
  camera.position
    .sub(controls.target)
    .multiplyScalar(0.85)
    .add(controls.target);
  controls.update();
};
$("zoom-out").onclick = () => {
  camera.position
    .sub(controls.target)
    .multiplyScalar(1.15)
    .add(controls.target);
  controls.update();
};
$("reset-view").onclick = fitCamera;
const workshop = $("workshop");
async function fullscreen() {
  const full =
    !!document.fullscreenElement ||
    workshop.classList.contains("fullscreen-fallback");
  if (full) {
    if (document.fullscreenElement) await document.exitFullscreen();
    workshop.classList.remove("fullscreen-fallback");
  } else {
    try {
      if (!workshop.requestFullscreen) throw Error();
      await workshop.requestFullscreen();
    } catch {
      workshop.classList.add("fullscreen-fallback");
    }
  }
  syncFullscreen();
}
function syncFullscreen() {
  const full =
    !!document.fullscreenElement ||
    workshop.classList.contains("fullscreen-fallback");
  document.body.classList.toggle("focus-mode", full);
  $("fullscreen").setAttribute(
    "aria-label",
    full ? "Exit full screen" : "Enter full screen",
  );
  requestAnimationFrame(fitCamera);
}
$("fullscreen").onclick = fullscreen;
document.addEventListener("fullscreenchange", syncFullscreen);
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Escape" &&
    workshop.classList.contains("fullscreen-fallback")
  ) {
    workshop.classList.remove("fullscreen-fallback");
    syncFullscreen();
  }
  if (e.target.closest("button,input,select,summary,dialog,a")) return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    $("next").click();
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    $("back").click();
  }
  if (e.key.toLowerCase() === "f") fullscreen();
});
$("limits-open").onclick = () => {
  limitsOpen = true;
  $("limits").showModal();
};
$("limits-close").onclick = () => $("limits").close();
$("limits").addEventListener("close", () => (limitsOpen = false));
addEventListener("blur", () => (suspended = true));
addEventListener("focus", () => {
  suspended = false;
  clock.getDelta();
});
document.addEventListener("visibilitychange", () => {
  suspended = document.hidden;
  clock.getDelta();
});
const ray = new THREE.Raycaster();
let down = { x: 0, y: 0 };
canvas.addEventListener(
  "pointerdown",
  (e) => (down = { x: e.clientX, y: e.clientY }),
);
canvas.addEventListener("pointerup", (e) => {
  if (!exploring || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12)
    return;
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(
    new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2,
    ),
    camera,
  );
  const hits = ray
    .intersectObjects(pickMeshes, true)
    .filter((h) => h.object.userData.part);
  const hit = hits.find((h) => !h.object.userData.part.xray) || hits[0];
  if (hit) selectPart(PARTS.indexOf(hit.object.userData.part));
});
const rim = new THREE.DirectionalLight(0xe3f0ff, 0);
rim.position.set(-4, 5, -2);
scene.add(rim);
const themeColors = new Map([
  [block, ["#e8735a", "#e99479"]], [head, ["#c78837", "#d9a65f"]],
  [flywheel, ["#648c92", "#9ac8cc"]],
  [crankAxle, ["#725035", "#bc976e"]], [rod, ["#7e9aa8", "#b7cbd4"]],
  [valveIn, ["#49986d", "#86bd96"]], [valveOut, ["#8b72a6", "#bca2d3"]],
]);
const themeQuery = matchMedia("(prefers-color-scheme: dark)");
let themeOverride = null;
function applyTheme() {
  const dark = themeOverride ?? themeQuery.matches;
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  scene.background.set(dark ? "#242321" : "#f7eedd");
  blob.material.color.set(dark ? "#37332f" : "#e4d3b6");
  hemi.intensity = dark ? 1.55 : 1.2;
  rim.intensity = dark ? 1.2 : 0.22;
  for (const [mesh, colors] of themeColors) mesh.material.color.set(colors[dark ? 1 : 0]);
  for (const fin of head.children.filter(m => m.userData.fin)) {
    fin.material.color.set(dark ? "#e6c392" : "#8e592d");
    fin.material.emissive.set(dark ? "#8b734f" : "#000000");
    fin.material.emissiveIntensity = dark ? 0.45 : 0;
  }
  ghosts.get(shell).material.color.set(dark ? "#b2d2df" : "#789baa");
  $("theme").setAttribute("aria-label", dark ? "Use light theme" : "Use dark theme");
  $("theme").setAttribute("aria-pressed", String(dark));
  $("theme").textContent = dark ? "☀" : "☾";
}
$("theme").onclick = () => {
  themeOverride = document.documentElement.dataset.theme !== "dark";
  applyTheme();
};
themeQuery.addEventListener("change", applyTheme);
applyTheme();
const clock = new THREE.Clock();
let lastPlayStroke = -1;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!suspended && !limitsOpen && !exploring && (playing || moving)) {
    cycleT += dt;
    if (moving && cycleT >= runUntil) {
      cycleT = runUntil;
      moving = false;
      lesson = reduceLesson(lesson, { type: "finish" });
      render();
    }
  }
  const mechanism = previewing || moving || curStroke >= 0;
  const ph = previewing
    ? (cycleT / 2) % 4
    : moving
      ? cycleT / 2
      : curStroke >= 0
        ? curStroke + 0.9999
        : 0;
  const stroke = Math.min(3, Math.floor(ph)),
    f = ph - stroke;
  if (mechanism) {
    const angle = ph * Math.PI,
      lateral = CRANK_R * Math.sin(angle);
    piston.position.y =
      crank.position.y +
      CRANK_R * Math.cos(angle) +
      Math.sqrt(ROD_L * ROD_L - lateral * lateral);
    linkage(angle);
    valveIn.position.y =
      3.75 - (stroke === 0 ? Math.sin(f * Math.PI) * 0.3 : 0);
    valveOut.position.y =
      3.75 - (stroke === 3 ? Math.sin(f * Math.PI) * 0.3 : 0);
    const downward = stroke === 0 || stroke === 2;
    pistonMotion.visible = true;
    pistonMotion.position.set(1.10, piston.position.y + (downward ? 0.4 : -0.4), 0.18);
    pistonMotion.setDirection(new THREE.Vector3(0, downward ? -1 : 1, 0));
    const dark = document.documentElement.dataset.theme === "dark";
    pistonMotion.setColor(stroke === 2 ? (dark ? 0xf3ab72 : 0xac4c28) : (dark ? 0x86c5e2 : 0x285f7c));
    arc.material.color.set(dark ? "#c98d51" : "#a5642a");
    arcTip.material.color.copy(arc.material.color);
    crankMotion.visible = true;
    const crown = piston.position.y + 0.36,
      ch = Math.max(0.025, 3.28 - crown);
    boom.position.y = crown + ch / 2;
    boom.scale.set(1, ch, 1);
    boomMat.color.set(
      stroke === 1 ? "#e9943f" : stroke === 2 ? "#ef7837" : "#a9ccd7",
    );
    boomMat.opacity =
      stroke === 1
        ? 0.12 + f * 0.22
        : stroke === 2
          ? 0.25
          : stroke === 0
            ? 0.1
            : 0.06;
    spray.children.forEach((d, i) => {
      const u = (f * 3 + i * 0.18) % 1;
      d.position.set(
        Math.sin(i * 2.4) * u * 0.38,
        3.26 - u * ch * 0.8,
        Math.cos(i * 2.4) * u * 0.38,
      );
      d.material.opacity = stroke === 2 && f < 0.28 ? 0.9 : 0;
    });
    airDots.children.forEach((d, i) => {
      const u = (f + i * 0.16) % 1;
      d.position.set(
        -0.55 + Math.sin(i * 2.1) * 0.15,
        3.9 - u * 0.8,
        Math.cos(i * 1.7) * 0.15,
      );
      d.material.opacity = stroke === 0 ? Math.sin(u * Math.PI) * 0.9 : 0;
    });
    smokeDots.children.forEach((d, i) => {
      const u = (f + i * 0.16) % 1;
      d.position.set(
        0.55 + Math.sin(i * 1.9) * 0.2 + u * 0.5,
        3.4 + u * 1.3,
        Math.cos(i * 2.3) * 0.2,
      );
      d.material.opacity = stroke === 3 ? Math.sin(u * Math.PI) * 0.7 : 0;
      d.scale.setScalar(1 + u * 1.6);
    });
  } else {
    pistonMotion.visible = crankMotion.visible = false;
    piston.position.y = 2.6;
    crank.position.y = 1;
    valveIn.position.y = valveOut.position.y = 3.75;
    linkage(0);
    boomMat.opacity = 0;
    [...airDots.children, ...smokeDots.children, ...spray.children].forEach(
      (d) => (d.material.opacity = 0),
    );
  }
  if (playing && stroke !== lastPlayStroke) {
    lastPlayStroke = stroke;
    render();
  }
  stepSprings(dt);
  controls.update();
  projectPart();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
scene.updateMatrixWorld(true);
teachingBounds = [];
for (const p of PARTS) {
  const b = new THREE.Box3().setFromObject(p.mesh);
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z])
    teachingBounds.push(new THREE.Vector3(x, y, z));
}
render();
fitCamera();
tick();
export function journeyEvidence() {
  return {
    lesson: structuredClone(lesson),
    exploring,
    playing,
    previewing,
    cycleT,
    pistonY: piston.position.y,
    moving,
    selectedPart,
    stage: { ...stageSize },
    distance: camera.position.distanceTo(controls.target),
    fittedDistance,
    camera: camera.position.toArray(),
    target: controls.target.toArray(),
    theme: document.documentElement.dataset.theme,
    valveLift: [3.75 - valveIn.position.y, 3.75 - valveOut.position.y],
    crankAngle: crank.rotation.x,
    rodLength: rodEnds[0].position.distanceTo(rodEnds[1].position),
    partPoints: PARTS.map((p) => {
      const v = new THREE.Box3()
        .setFromObject(p.mesh)
        .getCenter(new THREE.Vector3())
        .project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * stageSize.w,
        y: (-v.y * 0.5 + 0.5) * stageSize.h,
      };
    }),
    pixelAnchors: [["inlet-stem", new THREE.Vector3(-0.62, 3.55, 0.22)],
      ["head-fin", new THREE.Vector3(0.80, 3.85, -0.10)],
      ["flywheel", new THREE.Vector3(-1.2, 1.35, 0.25)]].map(([name, v]) => {
        v.project(camera); return { name, x: (v.x * 0.5 + 0.5) * stageSize.w, y: (-v.y * 0.5 + 0.5) * stageSize.h };
      }),
    parts: PARTS.map((p) => p.name),
  };
}
