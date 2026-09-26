import { themes, regionColors } from "./themes.js";
import { SliceViewer } from "./slices.js";
import { BrainParty } from "./party.js";
import { loadAtlas } from "./atlas.js";
import { snapshot, readSave, restore, writeSave, SAVE_KEY } from "./session.js";
import {
  Scene,
  Color,
  PerspectiveCamera,
  WebGLRenderer,
  SRGBColorSpace,
  HemisphereLight,
  DirectionalLight,
  Group,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  GridHelper,
  RingGeometry,
  MeshBasicMaterial,
  DoubleSide,
  Raycaster,
  Vector2,
  Plane,
  Vector3,
  BufferGeometry,
  BufferAttribute,
  Points,
  PointsMaterial,
  Box3,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  BoxGeometry,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Puzzle } from "./puzzle.js";
import { Physics } from "./physics.js";
import "./style.css";
const $ = (i) => document.getElementById(i),
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
  scene = new Scene();
scene.background = new Color("#080d1c");
const camera = new PerspectiveCamera(42, innerWidth / innerHeight, 0.05, 1800);
let renderer;
try {
  renderer = new WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
} catch (i) {
  throw (
    ($("loading-text").textContent =
      "WebGL could not start. Check graphics acceleration and restart the game."),
    i
  );
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = SRGBColorSpace;
$("viewport").appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.3;
controls.maxDistance = 1e3;
controls.maxPolarAngle = Math.PI * 0.47;
scene.add(new HemisphereLight("#e4f4ff", "#283b40", 2.4));
for (const [i, t, e] of [
  ["#ffffff", 2.7, [15, 30, 20]],
  ["#72cdb7", 1.7, [-20, 15, -10]],
]) {
  const n = new DirectionalLight(i, t);
  (n.position.set(...e), scene.add(n));
}
const meshRoot = new Group(),
  ghostRoot = new Group(),
  floorRoot = new Group(),
  effectRoot = new Group();
scene.add(meshRoot, ghostRoot, floorRoot, effectRoot);
const floorMesh = new Mesh(
  new PlaneGeometry(2500, 2500),
  new MeshStandardMaterial({
    color: "#11232b",
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  }),
);
floorMesh.rotation.x = -Math.PI / 2;
floorRoot.add(floorMesh);
let grid = new GridHelper(600, 120, "#345956", "#1b363d");
floorRoot.add(grid);
floorRoot.visible = false;
const brainRing = new Mesh(
  new RingGeometry(8, 8.035, 128),
  new MeshBasicMaterial({
    color: "#74d2b9",
    side: DoubleSide,
    transparent: true,
    opacity: 0.45,
  }),
);
brainRing.rotation.x = -Math.PI / 2;
floorRoot.add(brainRing);
let screen = "home",
  hasGame = false,
  chosenMode = "easy",
  mode = "easy",
  busy = true,
  paused = false,
  completed = false,
  started = false,
  assisted = false,
  elapsed = 0,
  puzzle,
  physics,
  data,
  seed,
  selected,
  hovered,
  drag = null,
  liftDirection = 0,
  loadToken = 0,
  lastHover = 0,
  snapCandidate = null;
const meshes = /* @__PURE__ */ new Map(),
  bounds = /* @__PURE__ */ new Map(),
  keys = /* @__PURE__ */ new Set(),
  sparks = [],
  raycaster = new Raycaster(),
  pointer = new Vector2(),
  dragPlane = new Plane(),
  hitPoint = new Vector3();
const slices = new SliceViewer(scene, id => { select(id, true); focusSelected(); });
const party = new BrainParty(meshRoot);
const highlights = new Set();
let themeName = "sand", regionPalette = new Map();
slices.highlights = highlights;
let boardBoundary;
function updateBoardBoundary() {
  if(boardBoundary){scene.remove(boardBoundary);boardBoundary.geometry.dispose();boardBoundary.material.dispose();}
  boardBoundary = new LineSegments(new EdgesGeometry(new BoxGeometry(physics.arenaHalf*2,.06,physics.arenaHalf*2)),new LineBasicMaterial({color:'#62ad9f',transparent:true,opacity:.55}));
  boardBoundary.position.y=physics.floor+.05;scene.add(boardBoundary);
  controls.maxDistance=physics.arenaHalf*5;
  floorMesh.geometry.dispose();floorMesh.geometry=new PlaneGeometry(physics.arenaHalf*2,physics.arenaHalf*2);
  floorRoot.remove(grid);grid.geometry.dispose();grid.material.dispose();
  grid=new GridHelper(physics.arenaHalf*2,Math.ceil(physics.arenaHalf),'#345956','#1b363d');grid.position.y=.045;floorRoot.add(grid);
}
let storage;
try {
  storage = window.localStorage;
} catch {}
let savedSession = readSave(storage),
  pendingLoad,
  saveWarned = false;
let tutorialSeen = false,
  tutorialStep = 0;
try {
  tutorialSeen = storage?.getItem("brain-party-tutorial-v1") === "done";
} catch {}
const tutorialSteps = [
  [
    "Start with any neighbors",
    "No piece is fixed. Join any neighboring pair, then move that cluster to the next one. Joined regions keep their anatomical arrangement.",
  ],
  [
    "Choose and move a region",
    "Click a piece or search by name. Drag across the ground; E lifts and Q lowers. On a touch screen, hold the Lift and Lower buttons.",
  ],
  [
    "Look for the golden glow",
    "A nearby correct neighbor glows gold. Release to connect. Height assist handles vertical alignment; a placement guide can show the target.",
  ],
  [
    "Explore inside and come back",
    "Use 2D slices to explore joined regions. Selecting a region highlights it in both views. Your puzzle saves on this browser; shuffle only moves loose pieces.",
  ],
];
function saveSession() {
  if (!hasGame || busy || completed || !puzzle || physics.intro) return;
  const value = snapshot(puzzle, {
    mode,
    seed,
    elapsed,
    started,
    assisted,
    gravity: physics.gravity,
    heightAssist: physics.heightAssist,
    guide: $("guide").checked,
    spotlight: $("spotlight").checked,
    selected,
  });
  if (writeSave(storage, value)) {
    savedSession = value;
    $("save-status").textContent = "Saved on this browser";
  } else {
    $("save-status").textContent = "Saving unavailable in this browser";
    if (!saveWarned) {
      toast(
        "Browser storage is unavailable. Keep this tab open to preserve your puzzle.",
      );
      saveWarned = true;
    }
  }
}
function clearSession() {
  savedSession = null;
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {}
}
function renderTutorial() {
  $("tutorial-count").textContent =
    `QUICK START · ${tutorialStep + 1} / ${tutorialSteps.length}`;
  $("tutorial-title").textContent = tutorialSteps[tutorialStep][0];
  $("tutorial-text").textContent = tutorialSteps[tutorialStep][1];
  $("tutorial-next").textContent =
    tutorialStep === tutorialSteps.length - 1 ? "Let’s play" : "Next →";
}
function showTutorial() {
  if (
    tutorialSeen ||
    $("tutorial-dialog").open ||
    screen !== "play" ||
    busy ||
    physics.intro
  )
    return;
  setPause(true);
  renderTutorial();
  $("tutorial-dialog").showModal();
}
function closeTutorial() {
  tutorialSeen = true;
  try {
    storage?.setItem("brain-party-tutorial-v1", "done");
  } catch {}
  $("tutorial-dialog").close();
  setPause(false);
}
let toastTimer;
function toast(i) {
  (($("toast").textContent = i),
    ($("toast").style.opacity = 1),
    clearTimeout(toastTimer),
    (toastTimer = setTimeout(() => ($("toast").style.opacity = 0), 2800)));
}
function clearGhost() {
  for (const i of ghostRoot.children) i.material.dispose();
  ghostRoot.clear();
}
function clearEffects() {
  for (const i of sparks)
    (i.points.geometry.dispose(), i.points.material.dispose());
  ((sparks.length = 0), effectRoot.clear());
}
function disposeScene() {
  party.reset();
  $("party-banner").hidden=true;
  (clearGhost(), clearEffects());
  for (const i of meshes.values()) (i.geometry.dispose(), i.material.dispose());
  (meshes.clear(), bounds.clear(), meshRoot.clear());
}
function updatePositions() {
  for (const [i, t] of meshes)
    (t.position.fromArray(t.userData.piece.center),
      hasGame && t.position.add(new Vector3(...puzzle.group(i).offset)));
  if(hasGame && puzzle){
    slices.updatePlane();if(completed)party.follow(puzzle.group(data.pieces[0].id).offset);
    for(const ghost of ghostRoot.children){const off=puzzle.group(ghost.userData.targetMember).offset;ghost.position.fromArray(meshes.get(ghost.userData.pieceId).userData.piece.center).add(new Vector3(...off));}
  }
}
function refreshGhost() {
  if ((clearGhost(), !(!puzzle || selected === void 0 || !$("guide").checked)))
    for (const i of puzzle.group(selected).members) {
      const t = meshes.get(i),
        e = new Mesh(
          t.geometry,
          new MeshBasicMaterial({
            color: "#9cffde",
            wireframe: true,
            transparent: true,
            opacity: 0.19,
            depthWrite: false,
          }),
        );
      const group=puzzle.group(selected);
      const target=[...puzzle.groups.values()].filter(g=>g!==group && puzzle.adjacent(group,g)).sort((a,b)=>b.members.size-a.members.size)[0]||group;
      e.userData.targetMember=[...target.members][0];e.userData.pieceId=i;
      (e.position.fromArray(t.userData.piece.center).add(new Vector3(...target.offset)), ghostRoot.add(e));
    }
}
function stylePieces() {
  if(!puzzle)return;
  const group=selected===undefined?null:puzzle.group(selected), neighbors=new Set();
  if(group)for(const id of group.members)for(const n of puzzle.neighbors.get(id))neighbors.add(n);
  for(const [id,mesh] of meshes) {
    const g=puzzle.group(id), chosen=id===selected || highlights.has(id);
    mesh.visible=chosen || !$("spotlight").checked || g===group || neighbors.has(id);
    const faded=$("xray").checked && (group?.members.size>1 || highlights.size>0) && !chosen && !party.active;
    const color=regionPalette.get(id)||mesh.userData.piece.color;
    mesh.userData.displayColor=color;mesh.material.color.set(color);
    mesh.material.transparent=faded;mesh.material.opacity=faded?.035:1;mesh.material.depthWrite=!faded;
    mesh.material.depthTest=!(chosen && $("xray").checked && !party.active);
    mesh.renderOrder=chosen?3:faded?1:0;
    mesh.material.emissive.set(chosen?color:g===snapCandidate?'#816520':id===hovered?'#274955':'#000000');
    mesh.material.emissiveIntensity=chosen?.55:g===snapCandidate?.8:.25;
  }
}
function renderHighlights() {
  $("highlighted-regions").replaceChildren();
  for(const id of highlights){
    const b=document.createElement('button');b.textContent=meshes.get(id).userData.piece.acronym+' ×';
    b.setAttribute('aria-label','Remove highlight: '+meshes.get(id).userData.piece.name);
    b.onclick=()=>{highlights.delete(id);renderHighlights();stylePieces();slices.schedule();};
    $("highlighted-regions").append(b);
  }
  $("clear-highlights").hidden=highlights.size===0;
}
function applyTheme(name) {
  themeName=themes[name]?name:'sand';const theme=themes[themeName];
  document.body.dataset.theme=themeName;
  for(const key of ['background','surface','ink','muted','line','accent'])document.body.style.setProperty('--'+key,theme[key]);
  scene.background.set(theme.background);floorMesh.material.color.set(theme.floor);
  if(boardBoundary)boardBoundary.material.color.set(theme.accent);
  slices.theme=theme;
  if(data)regionPalette=regionColors(data,theme);
  stylePieces();slices.schedule();
  try{storage?.setItem('brain-party-theme',themeName);}catch{}
  updatePreview(chosenMode,false);
}
function updatePreview(mode,animate=false){
  const image=$("difficulty-preview");
  image.src=`./previews/${themeName}-${mode}.${animate&&!reducedMotion?'gif':'png'}`;
  image.alt=`${mode[0].toUpperCase()+mode.slice(1)}: ${{easy:15,medium:324,hard:671}[mode]} brain regions`;
}
function select(i, keepSlice = false) {
  ((selected = i), (snapCandidate = null));
  const t = meshes.get(i).userData.piece,
    e = puzzle.group(i);
  (($("selection-tag").textContent = e.members.size > 1
      ? "CONNECTED CLUSTER \xB7 " + e.members.size + " REGIONS"
      : "SELECTED REGION"),
    ($("region-name").textContent = t.name),
    ($("region-path").textContent = t.path.slice(1).join(" \u203A ")),
    ($("region-detail").textContent =
      t.acronym +
      " \xB7 Allen ID " +
      i +
      " \xB7 " +
      (t.voxels * 0.025 ** 3).toFixed(3) +
      " mm\xB3"),
    ($("height-control").disabled = false),
    stylePieces(),
    refreshGhost());
  slices.select(i, keepSlice);
}
function progress() {
  const i = data.pieces.length,
    t = physics.percent;
  (($("progress").textContent = t + "%"),
    ($("progress-detail").textContent =
      physics.connections +
      " / " +
      physics.requiredConnections +
      " connections"),
    ($("progress-bar").style.width = t + "%"),
    $("completion-track").setAttribute("aria-valuenow", String(t)),
    $("completion-track").setAttribute(
      "aria-valuetext",
      t + " percent complete",
    ),
    ($("docked-count").textContent =
      puzzle.placed + " / " + i + " regions joined"),
    ($("status").textContent = completed
      ? "Brain complete \u2014 every region connected"
      : i -
        puzzle.placed +
        " loose regions \xB7 " +
        puzzle.groups.size +
        " clusters"));
}
function clock(i) {
  let t = Math.floor(i);
  return (
    (t >= 3600 ? Math.floor(t / 3600) + ":" : "") +
    String(Math.floor(t / 60) % 60).padStart(2, "0") +
    ":" +
    String(t % 60).padStart(2, "0")
  );
}
function startTimer() {
  !physics.intro && !completed && (started = true);
}
function finish() {
  if (!puzzle.complete || completed) return;
  ((completed = true), (started = false));
  const i =
    "brain-party-best-" + mode + "-" + (assisted ? "assisted" : "manual");
  let t = 1 / 0;
  try {
    ((t = Number(localStorage.getItem(i)) || 1 / 0),
      elapsed < t && localStorage.setItem(i, String(elapsed)));
  } catch {}
  (($("completion-text").textContent =
    `${data.pieces.length} regions, ${physics.requiredConnections} connections, ${clock(elapsed)}. ${assisted ? "Assisted" : "Manual"} run.${elapsed < t ? " A new personal best!" : ""}`),
    clearSession(),
    progress());
  slices.schedule();
  startParty();
}
function sparkle(i) {
  const t = reducedMotion ? 16 : 56,
    e = new Float32Array(t * 3),
    n = [];
  for (let a = 0; a < t; a++) {
    const o = new Vector3(
      Math.random() - 0.5,
      Math.random() - 0.3,
      Math.random() - 0.5,
    )
      .normalize()
      .multiplyScalar(1.5 + Math.random() * 2);
    n.push(o);
  }
  const r = new BufferGeometry();
  r.setAttribute("position", new BufferAttribute(e, 3));
  const s = new Points(
    r,
    new PointsMaterial({
      color: "#ffe2a0",
      size: 0.1,
      transparent: true,
      depthWrite: false,
      opacity: 1,
    }),
  );
  (s.position.copy(i),
    effectRoot.add(s),
    sparks.push({ points: s, velocities: n, age: 0 }));
}
function updateEffects(i) {
  for (let t = sparks.length - 1; t >= 0; t--) {
    const e = sparks[t];
    e.age += i;
    const n = e.points.geometry.attributes.position;
    for (let r = 0; r < e.velocities.length; r++) {
      const s = e.velocities[r];
      n.setXYZ(r, s.x * e.age, s.y * e.age - 0.5 * e.age * e.age, s.z * e.age);
    }
    ((n.needsUpdate = true),
      (e.points.material.opacity = Math.max(0, 1 - e.age / 1.1)),
      e.age > 1.1 &&
        (effectRoot.remove(e.points),
        e.points.geometry.dispose(),
        e.points.material.dispose(),
        sparks.splice(t, 1)));
  }
}
function snapTolerance() {
  return mode === "easy" ? 0.9 : mode === "medium" ? 0.55 : 0.32;
}
function updateFitCue() {
  ((snapCandidate =
    selected === void 0 ? null : physics.candidate(selected, snapTolerance())),
    ($("fit-cue").hidden = !snapCandidate),
    ($("fit-cue").textContent = snapCandidate
      ? "Correct neighbor nearby \u2014 release to connect"
      : ""),
    stylePieces());
}
function attemptSnap() {
  if (
    !physics ||
    physics.intro ||
    selected === void 0 || party.active
  )
    return;
  const i = physics.snap(selected, snapTolerance());
  (i &&
    (physics.heightAssist && (assisted = true),
    updatePositions(),
    sparkle(meshes.get(selected).position),
    select(selected),
    progress(),
    slices.schedule(),
    $("completion-track").classList.remove("just-snapped"),
    $("completion-track").offsetWidth,
    $("completion-track").classList.add("just-snapped"),
    toast(
      "Correct fit! +" +
        i +
        " connection" +
        (i > 1 ? "s" : "") +
        " \xB7 " +
        physics.percent +
        "% complete",
    ),
    finish()),
    (snapCandidate = null),
    ($("fit-cue").hidden = true),
    stylePieces());
}
function fitAll() {
  const i = new Box3().setFromObject(meshRoot),
    t = i.getCenter(new Vector3()),
    e = i.getSize(new Vector3());
  physics && (t.y = Math.max(physics.floor + 2, t.y));
  const n = Math.max(e.x, e.z, e.y * 1.5, 20);
  (controls.target.copy(t),
    camera.position
      .copy(t)
      .add(new Vector3(0.65, 1, 1).normalize().multiplyScalar(n * 1.75)),
    controls.update());
}
function viewBrain() {
  if (hasGame && selected !== undefined) { focusSelected(); return; }
  (controls.target.set(0, 0, 0),
    camera.position.set(15, 16, 19),
    controls.update());
}
function focusSelected() {
  if (selected === void 0) return;
  const i = meshes.get(selected),
    t = Math.max(i.userData.piece.radius, 0.3);
  (controls.target.copy(i.position),
    camera.position
      .copy(i.position)
      .add(new Vector3(0.7, 1.1, 1).normalize().multiplyScalar(t * 4 + 3)),
    controls.update());
}
function setScreen(i) {
  if(party.active)party.stop();
  if(boardBoundary)boardBoundary.visible=i === "play";
  if(i === "home"){slices.plane.visible=false;$("complete-dialog").close();}
  if (i === "home") saveSession();
  for(const d of document.querySelectorAll("dialog[open]"))d.close();
  document.body.classList.remove("panel-open","slices-open");
  $("panel-toggle").setAttribute("aria-expanded","false");$("slices-toggle").setAttribute("aria-expanded","false");
  ((screen = i),
    document.body.classList.toggle("at-home", i === "home"),
    ($("home-screen").hidden = i !== "home"),
    ($("menu").hidden = i === "home"),
    ($("continue-game").hidden = (!hasGame || completed) && !savedSession),
    (paused = i === "home"),
    ($("paused").hidden = true),
    keys.clear(),
    (liftDirection = 0),
    (drag = null),
    (hovered = void 0),
    ($("tooltip").hidden = true),
    (controls.enabled = i === "play"),
    (floorRoot.visible = i === "play"),
    ($("intro-banner").hidden = i !== "play" || !physics?.intro),
    i === "play" && (meshRoot.rotation.set(0, 0, 0), updatePositions()));
  lastFrame=performance.now();
  if(i === "play"){updateIntro();stylePieces();slices.schedule();fitAll();}
}
function goHome() {
  busy || setScreen("home");
}
function updateIntro() {
  if (!physics.intro && !tutorialSeen && screen === "play")
    queueMicrotask(showTutorial);
  const i = physics.intro;
  (($("intro-banner").hidden = !i || screen !== "play"),
    ($("gravity").disabled = i),
    ($("shuffle").disabled = i),
    ($("height-assist").disabled = i));
  const t = {
    assembled: [
      "Meet the brain",
      "Every region begins in its anatomical place.",
    ],
    separate: [
      "Making room",
      "Regions separate while keeping their relative arrangement.",
    ],
    tornado: ["A little whirlwind", "Mixing the loose pieces above the board."],
    fall: [
      "Finding their footing",
      "Gravity brings each region down to the ground.",
    ],
  };
  (i &&
    (($("intro-title").textContent = t[physics.phase][0]),
    ($("intro-detail").textContent = t[physics.phase][1])),
    (controls.enabled = !paused && screen === "play"));
}
async function newGame(i = mode, t = false, saved = null) {
  const e = ++loadToken;
  $("retry-load").hidden = true;
  $("cancel-load").hidden = true;
  ((busy = true),
    keys.clear(),
    (drag = null),
    ($("loading").hidden = false),
    ($("loading-text").textContent = "Loading " + i + " regions\u2026"));
  try {
    const { data: n, buffer: r } = await loadAtlas(i, (bytes) => {
      if (e === loadToken)
        $("loading-text").textContent =
          `Loading ${i} regions · ${(bytes / 1048576).toFixed(1)} MB received`;
    });
    const restoredPuzzle = saved ? restore(n, saved) : null;
    if (e !== loadToken) return;
    highlights.clear();renderHighlights();
    (disposeScene(),
      (data = n),
      (mode = i),
      (hasGame = !t),
      meshRoot.rotation.set(0, 0, 0),
      (seed = crypto.getRandomValues(new Uint32Array(1))[0]),
      (puzzle = new Puzzle(data, seed)),
      (elapsed = 0),
      (started = false),
      (completed = false),
      (paused = false),
      (assisted = false),
      (selected = void 0),
      (snapCandidate = null));
    for (const s of data.pieces) {
      const a = new BufferGeometry();
      (a.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(r, s.offset, s.vertices * 3), 3),
      ),
        a.setIndex(
          new BufferAttribute(
            new Uint32Array(r, s.offset + s.vertices * 12, s.triangles * 3),
            1,
          ),
        ),
        a.computeVertexNormals(),
        a.computeBoundingSphere(),
        a.computeBoundingBox());
      const o = a.boundingBox;
      bounds.set(s.id, {
        min: o.min.toArray().map((l, u) => l + s.center[u]),
        max: o.max.toArray().map((l, u) => l + s.center[u]),
        area: (o.max.x - o.min.x + 0.8) * (o.max.z - o.min.z + 0.8),
      });
      const c = new Mesh(
        a,
        new MeshStandardMaterial({
          color: s.color,
          roughness: 0.65,
          metalness: 0,
          side: DoubleSide,
        }),
      );
      ((c.userData.piece = s), meshRoot.add(c), meshes.set(s.id, c));
    }
    regionPalette=regionColors(data,themes[themeName]);
    physics = new Physics(puzzle, bounds, seed);
    slices.setData(meshes,bounds,puzzle);updateBoardBoundary();
    ((physics.gravity = true),
      (floorRoot.position.y = physics.floor),
      (grid.position.y = 0.045),
      (brainRing.position.y = 0.05),
      ($("gravity").checked = true),
      ($("height-assist").checked = true),
      ($("guide").checked = false),
      ($("spotlight").checked = false),
      ($("region-search").value = ""),
      $("search-results").replaceChildren(),
      ($("fit-cue").hidden = true),
      !t && reducedMotion && physics.skipIntro(),
      updatePositions(),
      select(
        data.pieces[0].id,
      ),
      progress(),
      ($("timer").textContent = "00:00"),
      ($("level-description").textContent =
        data.pieces.length +
        " pieces \xB7 " +
        { easy: "Easy", medium: "Medium", hard: "Hard" }[mode]),
      ($("seed-label").textContent =
        "SESSION " + seed.toString(16).toUpperCase()),
      (busy = false),
      ($("loading").hidden = true),
      setScreen(t ? "home" : "play"),
      t
        ? viewBrain()
        : (fitAll(),
          reducedMotion ||
            (camera.position.set(23, 25, 30),
            controls.target.set(0, 1, 0),
            controls.update())),
      updateIntro());
    if (restoredPuzzle) {
      physics.skipIntro();
      puzzle = restoredPuzzle;
      physics.puzzle = puzzle;
      slices.puzzle = puzzle;
      for(const g of puzzle.groups.values())g.offset=physics.constrain(g,g.offset);
      physics.velocity.clear();
      seed = saved.seed;
      elapsed = saved.elapsed;
      started = !!saved.started;
      assisted = !!saved.assisted;
      completed = puzzle.complete;
      physics.gravity = saved.gravity !== false;
      physics.heightAssist = saved.heightAssist !== false;
      $("gravity").checked = physics.gravity;
      $("height-assist").checked = physics.heightAssist;
      $("guide").checked = !!saved.guide;
      $("spotlight").checked = !!saved.spotlight;
      select(meshes.has(saved.selected) ? saved.selected : data.pieces[0].id);
      updatePositions();
      progress();
      updateIntro();
      fitAll();
      $("timer").textContent = clock(elapsed);
      $("seed-label").textContent =
        "SESSION " + seed.toString(16).toUpperCase();
      toast("Your saved puzzle is ready. Welcome back.");
    }
    if (!t) saveSession();
  } catch (n) {
    (($("loading-text").textContent =
      "Could not load the atlas: " + n.message + ". Restart to retry."),
      console.error(n));
    busy = false;
    $("retry-load").hidden = false;
    $("cancel-load").hidden = false;
    pendingLoad = { mode: i, saved };
  }
}
function pointerRay(i) {
  const t = renderer.domElement.getBoundingClientRect();
  (pointer.set(
    ((i.clientX - t.left) / t.width) * 2 - 1,
    (-(i.clientY - t.top) / t.height) * 2 + 1,
  ),
    raycaster.setFromCamera(pointer, camera));
}
function pick(i) {
  pointerRay(i);
  const hits=raycaster.intersectObjects([...meshes.values()].filter(m=>m.visible),false);
  if($("xray").checked){
    const highlighted=hits.find(h=>h.object.userData.piece.id===selected || highlights.has(h.object.userData.piece.id));
    if(highlighted)return highlighted;
  }
  return hits[0];
}
function canInteract() {
  return (
    !busy &&
    !paused &&
    !document.querySelector("dialog[open]") &&
    screen === "play" &&
    !physics.intro && !party.active
  );
}
renderer.domElement.addEventListener(
  "pointerdown",
  (i) => {
    if (!canInteract() || i.button !== 0) return;
    const t = pick(i);
    if (t) {
      select(t.object.userData.piece.id);
      ((controls.enabled = false),
        i.stopImmediatePropagation(),
        renderer.domElement.setPointerCapture(i.pointerId),
        dragPlane.setFromNormalAndCoplanarPoint(new Vector3(0, 1, 0), t.point),
        (drag = {
          id: selected,
          start: t.point.clone(),
          offset: [...puzzle.group(selected).offset],
          moved: false,
        }),
        ($("tooltip").hidden = true));
    }
  },
  true,
);
renderer.domElement.addEventListener("pointermove", (i) => {
  if (!canInteract()) return;
  if (drag) {
    if ((pointerRay(i), raycaster.ray.intersectPlane(dragPlane, hitPoint))) {
      const e = hitPoint.clone().sub(drag.start);
      e.length() > 6e-3 &&
        (startTimer(),
        (drag.moved = true),
        physics.move(drag.id, [
          drag.offset[0] + e.x,
          puzzle.group(drag.id).offset[1],
          drag.offset[2] + e.z,
        ]),
        updatePositions(),
        updateFitCue());
    }
    return;
  }
  if (performance.now() - lastHover < 100) return;
  lastHover = performance.now();
  const t = pick(i);
  ((hovered = t?.object.userData.piece.id),
    stylePieces(),
    ($("tooltip").hidden = !t),
    t &&
      (($("tooltip").textContent = t.object.userData.piece.name),
      ($("tooltip").style.left =
        Math.max(8, Math.min(i.clientX + 14, innerWidth - 280)) + "px"),
      ($("tooltip").style.top =
        Math.min(i.clientY + 14, innerHeight - 80) + "px")),
    (renderer.domElement.style.cursor = t ? "grab" : "default"));
});
function endDrag() {
  if (!drag) return;
  const i = drag.moved;
  ((drag = null), (controls.enabled = true), i && attemptSnap());
}
renderer.domElement.addEventListener("pointerup", endDrag);
renderer.domElement.addEventListener("pointercancel", () => {
  ((drag = null), (controls.enabled = true));
});
renderer.domElement.addEventListener("lostpointercapture", endDrag);
renderer.domElement.addEventListener(
  "pointerleave",
  () => ($("tooltip").hidden = true),
);
function setPause(i) {
  if (i) saveSession();
  busy ||
    !hasGame ||
    ((paused = i),
    ($("paused").hidden = !i),
    keys.clear(),
    (liftDirection = 0),
    (drag = null),
    (controls.enabled = !i));
}
$("pause").onclick = () => setPause(true);
$("resume").onclick = () => setPause(false);
$("pause-menu").onclick = $("menu").onclick = $("brand-home").onclick = goHome;
$("continue-game").onclick = () => {
  if (hasGame && !completed) setScreen("play");
  else if (savedSession) newGame(savedSession.mode, false, savedSession);
};
$("start-game").onclick = () => {
  if (busy) return;
  if ((hasGame && !completed) || savedSession) {
    $("restart-dialog").showModal();
    return;
  }
  newGame(chosenMode);
};
$("restart-confirm").onclick=()=>{$("restart-dialog").close();newGame(chosenMode);};
$("restart-cancel").onclick=()=>$("restart-dialog").close();
for (const i of document.querySelectorAll("[data-mode]"))
  i.onclick = () => {
    chosenMode = i.dataset.mode;
    updatePreview(chosenMode,true);
    for (const t of document.querySelectorAll("[data-mode]"))
      (t.classList.toggle("active", t === i),
        t.setAttribute("aria-pressed", String(t === i)));
  };
$("skip-intro").onclick = () => {
  (physics.skipIntro(), updatePositions(), updateIntro(), fitAll());
};
$("gravity").onchange = () => {
  physics.intro ||
    ((physics.gravity = $("gravity").checked),
    physics.velocity.clear(),
    toast(
      physics.gravity
        ? "Gravity on \u2014 loose clusters settle on the ground."
        : "Gravity off \u2014 smaller regions drift upward faster.",
    ));
};
$("height-assist").onchange = () => {
  physics.heightAssist = $("height-assist").checked;
};
$("shuffle").onclick = () => {
  if (!canInteract()) return;
  const i = physics.shuffle(crypto.getRandomValues(new Uint32Array(1))[0]);
  (i && startTimer(),
    updatePositions(),
    fitAll(),
    toast(
      i
        ? i + " loose regions shuffled. Connected clusters preserved."
        : "No unconnected pieces remain.",
    ));
};
$("focus").onclick = focusSelected;
$("overview").onclick = fitAll;
$("brain-view").onclick = viewBrain;
$("next").onclick = () => {
  if (!canInteract()) return;
  const i = data.pieces.filter((e) => puzzle.group(e.id).members.size === 1);
  if (!i.length) return;
  const t = i.findIndex((e) => e.id === selected);
  (select(i[(t + 1) % i.length].id), focusSelected());
};
$("region-search").oninput = (i) => {
  const query=i.target.value.trim().toLowerCase();$("search-results").replaceChildren();
  if(!query || busy || !data)return;
  const matches=data.pieces.filter(p=>(p.name+' '+p.acronym+' '+p.id).toLowerCase().includes(query)).slice(0,35);
  for(const p of matches){
    const b=document.createElement('button');b.textContent=p.name;b.setAttribute('aria-pressed',String(highlights.has(p.id)));
    b.onclick=()=>{if(physics.intro)return;highlights.add(p.id);$("xray").checked=true;select(p.id);renderHighlights();b.setAttribute('aria-pressed','true');focusSelected();};
    $("search-results").append(b);
  }
  if(!matches.length)$("search-results").textContent='No matching region.';
};
$("clear-highlights").onclick=()=>{highlights.clear();renderHighlights();stylePieces();slices.schedule();};
$("guide").onchange = () => {
  ($("guide").checked && (assisted = true), refreshGhost());
};
$("spotlight").onchange = stylePieces;
$("hint").onclick = () => {
  busy ||
    physics.intro ||
    ((assisted = true),
    ($("guide").checked = true),
    refreshGhost(),
    toast("Wireframe aligns your cluster with a connected anatomical neighbor."));
};
$("help").onclick = () => {
  ($("help-dialog").showModal(),
    hasGame && screen === "play" && setPause(true));
};
$("close-help").onclick = $("start-help").onclick = () =>
  $("help-dialog").close();
$("play-again").onclick = () => {
  ($("complete-dialog").close(), goHome());
};
$("inspect-complete").onclick = () => {
  ($("complete-dialog").close(), fitAll());
};
for (const [i, t] of [
  ["lift-up", 1],
  ["lift-down", -1],
]) {
  $(i).addEventListener("pointerdown", (n) => {
    canInteract() &&
      (n.preventDefault(),
      (liftDirection = t),
      $(i).setPointerCapture(n.pointerId));
  });
  const e = () => {
    liftDirection && ((liftDirection = 0), attemptSnap());
  };
  ($(i).addEventListener("pointerup", e),
    $(i).addEventListener("pointercancel", () => (liftDirection = 0)),
    $(i).addEventListener("lostpointercapture", e));
}
window.addEventListener("keydown", (i) => {
  if (
    i.target?.matches?.("input,select,textarea") ||
    document.querySelector("dialog[open]") ||
    !canInteract()
  )
    return;
  const t = i.key.toLowerCase();
  ([
    "q",
    "e",
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "shift",
  ].includes(t) && (i.preventDefault(), keys.add(t)),
    t === "f" && focusSelected(),
    t === "enter" && attemptSnap());
});
window.addEventListener("keyup", (i) => {
  keys.delete(i.key.toLowerCase()) &&
    i.key !== "Shift" &&
    canInteract() &&
    attemptSnap();
});
window.addEventListener("blur", () => {
  (keys.clear(),
    (liftDirection = 0),
    hasGame && screen === "play" && setPause(true));
});
document.addEventListener("visibilitychange", () => {
  document.hidden && hasGame && screen === "play" && setPause(true);
});
function resize() {
  ((camera.aspect = innerWidth / innerHeight),
    camera.setViewOffset(
      innerWidth,
      innerHeight,
      -(innerWidth > 1100 ? 0 : innerWidth > 760 ? 120 : 0),
      0,
      innerWidth,
      innerHeight,
    ),
    camera.updateProjectionMatrix(),
    renderer.setSize(innerWidth, innerHeight));
}
window.addEventListener("resize", resize);
resize();
let lastFrame = performance.now();
let slowFrames = 0;
function animate(i) {
  requestAnimationFrame(animate);
  const t = (i - lastFrame) / 1e3,
    e = Math.min(t, 0.1);
  if (((lastFrame = i), busy)) return;
  // Lower only the drawing resolution when sustained rendering is slow.
  // CSS coordinates, picking, and anatomical mesh detail remain unchanged.
  if (!paused && t > .08 && t < 5) slowFrames++;
  else slowFrames = 0;
  if (slowFrames >= 3 && renderer.getPixelRatio() > .5) {
    renderer.setPixelRatio(Math.max(.5, renderer.getPixelRatio() * .7));
    slowFrames = 0;
  }
  if (screen === "home") {
    (!hasGame && !reducedMotion && (meshRoot.rotation.y += e * 0.035),
      renderer.render(scene, camera));
    return;
  }
  if (paused) return;
  started &&
    !completed &&
    !physics.intro &&
    ((elapsed += t), ($("timer").textContent = clock(elapsed)));
  const n = physics.intro,
    r = keys.size || liftDirection;
  if (
    !physics.intro &&
    r &&
    selected !== void 0 && !party.active
  ) {
    const a = (keys.has("shift") ? 0.4 : 3) * e,
      o = new Vector3(),
      c = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    ((c.y = 0), c.normalize());
    const l = new Vector3(-c.z, 0, c.x);
    ((keys.has("e") || liftDirection === 1) && (o.y += a),
      (keys.has("q") || liftDirection === -1) && (o.y -= a),
      keys.has("arrowleft") && o.addScaledVector(c, -a),
      keys.has("arrowright") && o.addScaledVector(c, a),
      keys.has("arrowup") && o.addScaledVector(l, -a),
      keys.has("arrowdown") && o.addScaledVector(l, a),
      o.lengthSq() &&
        (startTimer(),
        physics.move(
          selected,
          puzzle.group(selected).offset.map((u, d) => u + o.getComponent(d)),
        ),
        updateFitCue()));
  }
  // Keep camera navigation within reach of the bounded board as well.
  controls.target.x=Math.max(-physics.arenaHalf,Math.min(physics.arenaHalf,controls.target.x));
  controls.target.z=Math.max(-physics.arenaHalf,Math.min(physics.arenaHalf,controls.target.z));
  const s = /* @__PURE__ */ new Set();
  if (
    (drag && s.add(drag.id),
    r && s.add(selected),
    !party.active && physics.tick(e, s),
    updatePositions(),
    n)
  ) {
    if ((updateIntro(), physics.age > 5.6)) {
      const a =
          25 +
          Math.max(
            ...[...physics.targets.values()].map((l) => Math.hypot(l[0], l[2])),
          ) *
            1.65,
        c = new Vector3(0.65, 1, 1).normalize().multiplyScalar(a);
      camera.position.lerp(c, Math.min(1, e * 1.8));
    }
    physics.intro ||
      (fitAll(),
      toast(
        "Drag across the ground. E lifts, Q lowers. Nearby correct neighbors glow.",
      ));
  }
  party.tick(t);
  if(party.active)slices.plane.visible=false;
  (updateEffects(e), controls.update(), renderer.render(scene, camera));
}
function startParty() {
  $("complete-dialog").close();
  $("party-banner").hidden=false;
  $("guide").checked=false;$("xray").checked=false;refreshGhost();
  party.initialOffset=null;
  party.start(physics.floor,reducedMotion,()=>{
    $("party-banner").hidden=true;
    updatePositions();stylePieces();slices.schedule();fitAll();
    $("complete-dialog").showModal();
  });
  stylePieces();fitAll();
}
$("stop-party").onclick=()=>{party.stop();$("complete-dialog").close();};
$("replay-party").onclick=startParty;
$("xray").onchange=()=>{stylePieces();slices.schedule();};
$("slices-toggle").onclick=()=>{
  const open=document.body.classList.toggle('slices-open');
  if(open){document.body.classList.remove("panel-open");$("panel-toggle").setAttribute("aria-expanded","false");}
  $("slices-toggle").setAttribute('aria-expanded',String(open));slices.schedule();
};
requestAnimationFrame(animate);
busy = false;
$("loading").hidden = true;
$("continue-game").hidden = !savedSession;

$("tutorial-next").onclick = () => {
  if (++tutorialStep === tutorialSteps.length) closeTutorial();
  else renderTutorial();
};
$("tutorial-skip").onclick = closeTutorial;
$("tutorial-dialog").addEventListener("cancel", (event) => {
  event.preventDefault();
  closeTutorial();
});
$("retry-load").onclick = () =>
  newGame(pendingLoad.mode, false, pendingLoad.saved);
$("cancel-load").onclick = () => {
  $("loading").hidden = true;
  setScreen("home");
};
$("panel-toggle").onclick = () => {
  const open = document.body.classList.toggle("panel-open");
  if(open){document.body.classList.remove("slices-open");$("slices-toggle").setAttribute("aria-expanded","false");}
  $("panel-toggle").setAttribute("aria-expanded", String(open));
};
setInterval(saveSession, 5000);
window.addEventListener("pagehide", saveSession);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveSession();
});
if (import.meta.env.DEV && new URLSearchParams(location.search).has("test")) {
  window.__TEST__ = {
    get puzzle() {
      return puzzle;
    },
    get physics() {
      return physics;
    },
    get camera() {
      return camera;
    },
    get meshes() {
      return meshes;
    },
    get selected() {
      return selected;
    },
    get busy() {
      return busy;
    },
    get elapsed() {
      return elapsed;
    },
    get completed() {
      return completed;
    },
    select,
    attemptSnap,
    updatePositions,
    saveSession,
    get slices(){return slices;},
    get party(){return party;},
    get highlights(){return highlights;},
    get theme(){return themeName;},
  };
}

$("theme").onchange=e=>applyTheme(e.target.value);
try{themeName=storage?.getItem('brain-party-theme')||'sand';}catch{}
applyTheme(themeName);$("theme").value=themeName;
for(const button of document.querySelectorAll('[data-mode]')){
  button.onpointerenter=button.onfocus=()=>updatePreview(button.dataset.mode,true);
  button.onpointerleave=button.onblur=()=>updatePreview(chosenMode,false);
}
let previewCycle;
$("difficulty-label").onpointerenter=()=>{let n=0;updatePreview('easy',true);previewCycle=setInterval(()=>updatePreview(['easy','medium','hard'][++n%3],true),1600);};
$("difficulty-label").onpointerleave=()=>{clearInterval(previewCycle);updatePreview(chosenMode,false);};
// Preserve the session when the GPU context is interrupted; restore UI state
// after Three.js recreates its resources instead of leaving a frozen canvas.
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();saveSession();setPause(true);toast('Graphics paused. Your puzzle is saved.');});
renderer.domElement.addEventListener('webglcontextrestored',()=>{resize();if(hasGame){updatePositions();stylePieces();fitAll();}toast('Graphics restored. Resume when ready.');});
