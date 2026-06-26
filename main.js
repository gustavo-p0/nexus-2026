import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import data from './nexus_data.json';

// ═══ DATA ═══
const S = data.students;
const N = S.length;
const N_CH = 11;
const CH_NAMES = [
  'BOOT', 'A METODOLOGIA', 'FRAMEWORK G.Q.M.', 'A ORIGEM', 'MERCADO', 'AS STACKS', 'O GAP',
  'MÉTRICAS', 'PARADOXO DA IA', 'ROTA DE FUGA', 'SÍNTESE'
];

// Cores Among Us Crewmates
const FOCUS_HEX = {
  'Back-end':   0x112bcf, // Blue
  'Full-stack': 0x71491e, // Brown
  'Front-end':  0x38fedb, // Cyan
  'Mobile':     0xf07d0d, // Orange
  'Dados':      0x117f2d, // Green
  'Pesquisa':   0xf5f557, // Yellow
  'QA':         0xed54ba, // Pink
  'Gestao':     0x6b2fbb, // Purple
  'Outro':      0xc51111, // Red
};
function getHex(f) { return FOCUS_HEX[f] || 0xffffff; }

// ═══ ARENA LAYOUT ═══
function generateArena() {
  const pos = [];
  const groups = {};
  S.forEach((s, i) => { if (!groups[s.foco]) groups[s.foco] = []; groups[s.foco].push(i); });
  
  const focos = Object.keys(groups);
  let totalAngle = 0;

  focos.forEach((foco) => {
    const idxs = groups[foco];
    idxs.sort((a, b) => S[a].sen - S[b].sen); 
    
    const sliceAngle = (idxs.length / N) * Math.PI * 2;
    const startAngle = totalAngle;
    
    idxs.forEach((idx, k) => {
      const radius = 4.5 + (k / idxs.length) * 16 + (Math.random() * 1.5); 
      const angle = startAngle + (Math.random() * sliceAngle * 0.7) + (sliceAngle * 0.15);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      pos[idx] = [x, 0, z];
    });
    totalAngle += sliceAngle;
  });
  return pos;
}
const ARENA = generateArena();

// ═══ THREE SETUP ═══
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050a); // Deep Space
scene.fog = new THREE.FogExp2(0x02050a, 0.015);

const cam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
cam.position.set(0, 35, 5);

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || innerWidth <= 768;
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('scene').appendChild(renderer.domElement);

const orbit = new OrbitControls(cam, renderer.domElement);
orbit.enableDamping = true; orbit.dampingFactor = 0.05;
orbit.minDistance = 2; orbit.maxDistance = 100;
orbit.target.set(0, 0, 0);
orbit.enabled = false;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, cam));
composer.addPass(new OutputPass()); // Sem Bloom, estética sólida/cartoon

// ═══ GEOMETRIAS COMPARTILHADAS (Among Us) ═══
const GEO_BODY = new THREE.CapsuleGeometry(0.35, 0.4, 16, 16);
const GEO_LEG = new THREE.CapsuleGeometry(0.12, 0.25, 12, 16);
const GEO_PACK = new THREE.BoxGeometry(0.4, 0.55, 0.25, 4, 4, 4);
const GEO_VISOR = new THREE.CapsuleGeometry(0.18, 0.28, 16, 16);

function createAmongUsBody(hexColor) {
  const group = new THREE.Group();
  
  // Material fosco estilo plástico/borracha
  const suitMat = new THREE.MeshStandardMaterial({ 
    color: hexColor, roughness: 0.7, metalness: 0.1
  });
  
  // Visor de vidro azul claro
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x88ccff, roughness: 0.1, metalness: 0.8
  });

  // Corpo
  const body = new THREE.Mesh(GEO_BODY, suitMat);
  body.position.y = 0.7;
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  // Pernas
  const legL = new THREE.Mesh(GEO_LEG, suitMat);
  legL.position.set(-0.15, 0.2, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(GEO_LEG, suitMat);
  legR.position.set(0.15, 0.2, 0);
  legR.castShadow = true;
  group.add(legL, legR);

  // Mochila
  const pack = new THREE.Mesh(GEO_PACK, suitMat);
  pack.position.set(0, 0.65, -0.3);
  pack.castShadow = true;
  group.add(pack);

  // Visor
  const visor = new THREE.Mesh(GEO_VISOR, visorMat);
  visor.rotation.z = Math.PI / 2;
  visor.position.set(0, 0.85, 0.32);
  visor.scale.set(1, 1, 0.4); // achatar
  visor.castShadow = true;
  group.add(visor);

  return { group, materials: [suitMat, visorMat], suitMat, visorMat, legL, legR, body };
}

const arenaGroup = new THREE.Group();
scene.add(arenaGroup);

const nodes = [];
for (let i = 0; i < N; i++) {
  const s = S[i];
  const hex = getHex(s.foco);
  
  const body = createAmongUsBody(hex);
  
  const baseScale = 0.8 + s.sen * 0.2;
  body.group.scale.set(baseScale, baseScale, baseScale);
  
  const [x, y, z] = ARENA[i];
  body.group.position.set(x, y - 10, z); // Starts hidden
  body.group.lookAt(0, body.group.position.y, 0);
  
  arenaGroup.add(body.group);
  nodes.push({
    group: body.group, 
    suitMat: body.suitMat,
    visorMat: body.visorMat,
    legL: body.legL,
    legR: body.legR,
    bodyMesh: body.body,
    idx: i,
    baseX: x, baseY: y, baseZ: z, baseHex: hex,
    baseScale: baseScale,
    bobPhase: Math.random() * Math.PI * 2, 
    bobSpeed: 1.5 + Math.random() * 1.5,
    match: true, 
    isMetricsUser: (i % 2 !== 0 && i % 3 !== 0)
  });
}

// Fix metrics count
let usedCount = nodes.filter(n => n.isMetricsUser).length;
if(usedCount > 23) { nodes.forEach(n => { if(n.isMetricsUser && usedCount > 23) { n.isMetricsUser=false; usedCount--; } }); }
if(usedCount < 23) { nodes.forEach(n => { if(!n.isMetricsUser && usedCount < 23) { n.isMetricsUser=true; usedCount++; } }); }

// ═══ VIDA PRÓPRIA — Personality traits per character ═══
const PERSONALITY_POOL = ['hyper', 'chill', 'nervous', 'curious', 'proud'];
nodes.forEach((n, i) => {
  // Deterministic personality from index so it stays consistent
  n.personality = PERSONALITY_POOL[i % PERSONALITY_POOL.length];
  n.bobAmp  = 0.12 + Math.random() * 0.55;
  n.bobFreq = 0.50 + Math.random() * 1.80;
  n.swayAmp = 0.04 + Math.random() * 0.12;
  n.lifeTimer      = null;
  n.wanderTimer    = null;  // delayed call for next wander target
  n.wanderMoveTween = null; // active position tween (x, z)
  n.wanderLegL     = null;  // leg tween while walking
  n.wanderLegR     = null;
});

// ═══ PROCEDURAL TEXTURES (Chão Metálico) ═══
function createSpaceshipFloorTexture() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Fundo principal (metal base)
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, size, size);

  // Grid de grandes painéis
  const tiles = 8;
  const step = size / tiles;
  
  for (let i = 0; i < tiles; i++) {
    for (let j = 0; j < tiles; j++) {
      const x = i * step; const y = j * step;
      
      // Volume dos painéis (gradiente radial sutil simulando luz/relevo)
      const grad = ctx.createRadialGradient(x + step/2, y + step/2, 0, x + step/2, y + step/2, step);
      grad.addColorStop(0, '#64748b');
      grad.addColorStop(1, '#475569');
      ctx.fillStyle = grad;
      ctx.fillRect(x + 4, y + 4, step - 8, step - 8);
      
      // Detalhes metálicos: Parafusos nos cantos
      ctx.fillStyle = '#1e293b';
      const inset = 16;
      const r = 4;
      ctx.beginPath(); ctx.arc(x + inset, y + inset, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + step - inset, y + inset, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + inset, y + step - inset, r, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + step - inset, y + step - inset, r, 0, Math.PI*2); ctx.fill();
    }
  }

  // Adicionar sujeira/noise (Desgaste da nave)
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8); // Repetir os painéis
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Melhorar textura inclinada
  return tex;
}

function createGrateTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // Linhas da grelha de ventilação
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  for (let i = 0; i < size; i += 24) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

// ═══ ENVIRONMENT (Skeld Cafeteria / Space) ═══
const PLATFORM_R = 26;

// Texturas geradas via Canvas API
const floorTex = createSpaceshipFloorTexture();
const grateTex = createGrateTexture();

// Base inferior da plataforma (dá volume)
const baseGeo = new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R - 2, 4, 64);
const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.2 });
const base = new THREE.Mesh(baseGeo, baseMat);
base.position.y = -2.25;
arenaGroup.add(base);

// Chão principal (Piso com textura detalhada procedural)
const floorGeo = new THREE.CylinderGeometry(PLATFORM_R, PLATFORM_R, 0.5, 64);
const floorMat = new THREE.MeshStandardMaterial({ 
  map: floorTex, bumpMap: floorTex, bumpScale: 0.05, 
  roughness: 0.6, metalness: 0.3 
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.position.y = -0.25;
floor.receiveShadow = true;
arenaGroup.add(floor);

// Borda da plataforma
const borderGeo = new THREE.TorusGeometry(PLATFORM_R, 0.4, 32, 64);
const borderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
const border = new THREE.Mesh(borderGeo, borderMat);
border.rotation.x = Math.PI / 2;
arenaGroup.add(border);

// Grelha central escura (embaixo da mesa - usa textura)
const grateGeo = new THREE.CylinderGeometry(4.0, 4.0, 0.52, 64);
const grateMat = new THREE.MeshStandardMaterial({ map: grateTex, bumpMap: grateTex, bumpScale: 0.02, roughness: 0.8, metalness: 0.2 });
const grate = new THREE.Mesh(grateGeo, grateMat);
grate.position.y = -0.25;
grate.receiveShadow = true;
arenaGroup.add(grate);

// MESA DA REUNIÃO DE EMERGÊNCIA
const tableGroup = new THREE.Group();
// Pedestal
const pedGeo = new THREE.CylinderGeometry(1.0, 1.4, 1.2, 32);
const pedMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.5 });
const ped = new THREE.Mesh(pedGeo, pedMat);
ped.position.y = 0.6;
ped.castShadow = true; ped.receiveShadow = true;
tableGroup.add(ped);
// Tampo da mesa
const topGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.2, 32);
const topMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
const tableTop = new THREE.Mesh(topGeo, topMat);
tableTop.position.y = 1.3;
tableTop.castShadow = true; tableTop.receiveShadow = true;
tableGroup.add(tableTop);
// Botão Vermelho (Emergency Meeting)
const btnGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.2, 32);
const btnMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
const btn = new THREE.Mesh(btnGeo, btnMat);
btn.position.y = 1.45;
tableGroup.add(btn);
// Vidro (Cúpula)
const glassGeo = new THREE.SphereGeometry(0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transparent: true, opacity: 0.3, roughness: 0.1, metalness: 0.1, transmission: 0.9 });
const glass = new THREE.Mesh(glassGeo, glassMat);
glass.position.y = 1.4;
tableGroup.add(glass);

arenaGroup.add(tableGroup);

// Connection lines group (network graph — empty by default, populated externally if needed)
const connGroup = new THREE.Group();
arenaGroup.add(connGroup);

// Fundo estrelado (Space)
const starCount = isMobile ? 800 : 2000;
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(starCount * 3);
for(let i=0; i<starCount; i++) {
  starPos[i*3] = (Math.random() - 0.5) * 200;
  starPos[i*3+1] = (Math.random() - 0.5) * 200;
  starPos[i*3+2] = (Math.random() - 0.5) * 200;
}
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.8 });
const stars = new THREE.Points(starGeo, starMat);
scene.add(stars);

// Luzes
const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(15, 30, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = isMobile ? 512 : 2048;
dirLight.shadow.mapSize.height = isMobile ? 512 : 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.bias = -0.001;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.5);
fillLight.position.set(-15, 10, -20);
scene.add(fillLight);

// ═══ PARTICLES (EJECT DISSOLVE) ═══
const dissolveGeo = new THREE.BufferGeometry();
const dissolvePos = new Float32Array(N * 10 * 3);
const dissolveAlpha = new Float32Array(N * 10);
const dissolveVel = new Float32Array(N * 10 * 3);
dissolveGeo.setAttribute('position', new THREE.BufferAttribute(dissolvePos, 3));
dissolveGeo.setAttribute('alpha', new THREE.BufferAttribute(dissolveAlpha, 1));
const dissolveMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float alpha; varying float vAlpha;
    void main() { vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = 8.0 * (100.0 / -mv.z); gl_Position = projectionMatrix * mv; }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() { float d = length(gl_PointCoord - 0.5); if (d > 0.5) discard; gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * (1.0 - d * 2.0)); }
  `,
  transparent: true, blending: THREE.NormalBlending, depthWrite: false
});
const dissolvePoints = new THREE.Points(dissolveGeo, dissolveMat);
arenaGroup.add(dissolvePoints);

const dissolveState = Array.from({ length: N }, () => ({ active: false, t: 0 }));
function triggerDissolve(idx) {
  const ds = dissolveState[idx];
  ds.active = true; ds.t = 0;
  const n = nodes[idx];
  const bx = n.group.position.x, by = n.group.position.y + 1.0, bz = n.group.position.z;
  for (let p = 0; p < 10; p++) {
    const pi = idx * 10 + p;
    dissolvePos[pi*3] = bx + (Math.random()-0.5)*1.0; 
    dissolvePos[pi*3+1] = by + (Math.random()-0.5)*1.0; 
    dissolvePos[pi*3+2] = bz + (Math.random()-0.5)*1.0;
    dissolveVel[pi*3] = (Math.random()-0.5)*0.1; dissolveVel[pi*3+1] = Math.random()*0.1; dissolveVel[pi*3+2] = (Math.random()-0.5)*0.1;
    dissolveAlpha[pi] = 1.0;
  }
}

// ═══ NAVIGATION & CHAPTERS ═══
const nav = { current: -1, transitioning: false, explore: false };

const CH_CAM = [
  { p: [0, 10, 45], l: [0, 0, 0], fov: 40 },    // 0: boot (Among Us Menu Style)
  { p: [15, 20, 15], l: [0, 0, 0], fov: 45 },   // 1: metodologia
  { p: [-15, 15, 25], l: [0, 0, 0], fov: 40 },  // 2: gqm
  { p: [22, 12, 18], l: [0, 0, 0], fov: 45 },   // 3: origem
  { p: [-22, 6, 15], l: [0, 2, 0], fov: 40 },   // 4: emprego
  { p: [0, 5, 30], l: [0, 2, 0], fov: 40 },     // 5: stacks
  { p: [0, 12, 16], l: [0, 0, 0], fov: 60 },    // 6: gap
  { p: [18, 18, -18], l: [0, 0, 0], fov: 45 },  // 7: metricas
  { p: [0, 10, 32], l: [0, 0, 0], fov: 45 },    // 8: IA
  { p: [0, 2, 20], l: [0, 40, 0], fov: 80 },    // 9: fuga (looking highly up at ejected crewmates)
  { p: [0, 18, 30], l: [0, 0, 0], fov: 50 }     // 10: aluno
];

// ═══ VIDA PRÓPRIA — Autonomous per-character behavior loops ═══

let lifeLoopActive = false;

function stopLifeLoops() {
  lifeLoopActive = false;
  nodes.forEach(n => { if (n.lifeTimer) { n.lifeTimer.kill(); n.lifeTimer = null; } });
}

// ── Atomic micro-actions ────────────────────────────────────────

function act_look(n) {
  const angle = (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random() * 1.4);
  gsap.to(n.group.rotation, { y: '+=' + angle, duration: 0.28 + Math.random() * 0.2, ease: 'sine.inOut', yoyo: true, repeat: 1 });
}

function act_jump(n) {
  const h = n.bobAmp * 2.5;
  gsap.to(n.group.position, { y: '+=' + h, duration: 0.16, ease: 'power2.out', yoyo: true, repeat: 1 });
  gsap.to(n.legL.position, { y: 0.55, duration: 0.16, ease: 'power1.out', yoyo: true, repeat: 1 });
  gsap.to(n.legR.position, { y: 0.55, duration: 0.16, ease: 'power1.out', yoyo: true, repeat: 1 });
}

function act_wiggle(n) {
  const reps = (n.personality === 'hyper') ? 5 : 2;
  gsap.to(n.legL.position, { z: 0.28, y: 0.45, duration: 0.11, ease: 'sine.inOut', yoyo: true, repeat: reps * 2 });
  gsap.to(n.legR.position, { z: -0.28, y: 0.45, duration: 0.11, ease: 'sine.inOut', yoyo: true, repeat: reps * 2, delay: 0.11 });
}

function act_spin(n) {
  const dir = Math.random() > 0.5 ? 1 : -1;
  const turns = (n.personality === 'hyper') ? 2 : 1;
  gsap.to(n.group.rotation, { y: '+=' + (dir * Math.PI * 2 * turns), duration: 0.28 + Math.random() * 0.35, ease: 'power1.inOut' });
}

function act_tremble(n) {
  const mag = (n.personality === 'nervous') ? 0.15 : 0.07;
  gsap.fromTo(n.group.rotation, { z: -mag }, { z: mag, duration: 0.055, repeat: 6, yoyo: true, ease: 'none' });
}

function act_sway(n) {
  const angle = n.swayAmp * (1.5 + Math.random());
  gsap.to(n.group.rotation, { z: (Math.random() > 0.5 ? 1 : -1) * angle, duration: 0.55, ease: 'sine.inOut', yoyo: true, repeat: 1 });
}

// ── Personality → action dispatch ──────────────────────────────

function pickAction(n) {
  const r = Math.random();
  switch (n.personality) {
    case 'hyper':   return r < 0.28 ? 'spin'    : r < 0.52 ? 'jump'    : r < 0.72 ? 'wiggle'  : r < 0.88 ? 'look' : 'sway';
    case 'nervous': return r < 0.38 ? 'tremble' : r < 0.62 ? 'look'    : r < 0.78 ? 'jump'    : 'sway';
    case 'curious': return r < 0.42 ? 'look'    : r < 0.62 ? 'wiggle'  : r < 0.78 ? 'jump'    : r < 0.90 ? 'spin' : 'sway';
    case 'proud':   return r < 0.32 ? 'spin'    : r < 0.58 ? 'sway'    : r < 0.76 ? 'look'    : 'jump';
    default:        return r < 0.44 ? 'look'    : r < 0.64 ? 'sway'    : r < 0.80 ? 'wiggle'  : 'jump'; // chill
  }
}

function actionDelay(n) {
  const base = { hyper: 0.6, nervous: 1.1, curious: 1.7, proud: 2.4, chill: 3.2 }[n.personality] || 2;
  return base + Math.random() * base;
}

function executeLife(n) {
  if (!lifeLoopActive) return;
  if (n.match && !nav.transitioning) {
    const action = pickAction(n);
    if      (action === 'spin')    act_spin(n);
    else if (action === 'jump')    act_jump(n);
    else if (action === 'wiggle')  act_wiggle(n);
    else if (action === 'look')    act_look(n);
    else if (action === 'tremble') act_tremble(n);
    else                           act_sway(n);
  }
  n.lifeTimer = gsap.delayedCall(actionDelay(n), () => executeLife(n));
}

function startLifeLoops(delay = 0) {
  lifeLoopActive = true;
  nodes.forEach(n => {
    const start = delay + n.idx * 0.07 + Math.random() * actionDelay(n) * 0.4;
    n.lifeTimer = gsap.delayedCall(start, () => executeLife(n));
  });
}

// ───────────────────────────────────────────────────────────────

// ═══ WANDERING SYSTEM — locomoção autônoma pela arena ═══

let wanderActive = false;

function stopWandering() {
  wanderActive = false;
  nodes.forEach(n => {
    if (n.wanderTimer)     { n.wanderTimer.kill();     n.wanderTimer = null; }
    if (n.wanderMoveTween) { n.wanderMoveTween.kill(); n.wanderMoveTween = null; }
    if (n.wanderLegL)      { n.wanderLegL.kill();      n.wanderLegL = null; }
    if (n.wanderLegR)      { n.wanderLegR.kill();      n.wanderLegR = null; }
  });
}

function doWander(n, opts) {
  if (!wanderActive || !n.match) {
    n.wanderTimer = gsap.delayedCall(0.8 + Math.random(), () => doWander(n, opts));
    return;
  }

  // Escolhe destino aleatório na zona do personagem
  const angle = Math.random() * Math.PI * 2;
  const r     = (0.25 + Math.random() * 0.75) * opts.radius;
  let tx = n.baseX + Math.cos(angle) * r;
  let tz = n.baseZ + Math.sin(angle) * r;

  // Mantém dentro da arena
  const maxR  = PLATFORM_R - 3.5;
  const mag   = Math.sqrt(tx * tx + tz * tz);
  if (mag > maxR) { tx *= maxR / mag; tz *= maxR / mag; }

  // Evita a mesa central (raio 3.5)
  const ctr = Math.sqrt(tx * tx + tz * tz);
  if (ctr < 3.5) { tx *= 3.5 / ctr; tz *= 3.5 / ctr; }

  const dx   = tx - n.group.position.x;
  const dz   = tz - n.group.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 0.5) {
    // Já está perto — aguarda e tenta de novo
    n.wanderTimer = gsap.delayedCall(0.5 + Math.random() * 1.5, () => doWander(n, opts));
    return;
  }

  const moveDur = Math.max(0.6, dist / opts.speed);

  // Vira na direção do destino
  if (opts.faceDir) {
    gsap.to(n.group.rotation, { y: Math.atan2(dx, dz), duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
  }

  // Animação de pernas durante a caminhada (só se o capítulo não controlar)
  if (opts.animateLegs) {
    const stepDur = 0.09 + (1 / n.bobFreq) * 0.07;
    if (n.wanderLegL) n.wanderLegL.kill();
    if (n.wanderLegR) n.wanderLegR.kill();
    n.wanderLegL = gsap.fromTo(n.legL.position, { z: 0.24, y: 0.2 }, { z: -0.12, y: 0.44, duration: stepDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    n.wanderLegR = gsap.fromTo(n.legR.position, { z: -0.24, y: 0.2 }, { z: 0.12, y: 0.44, duration: stepDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: stepDur });
  }

  // Move até o destino — só X e Z (Y é controlado pelo capítulo)
  n.wanderMoveTween = gsap.to(n.group.position, {
    x: tx, z: tz,
    duration: moveDur,
    ease: 'sine.inOut',
    overwrite: 'auto',
    onComplete: () => {
      if (!wanderActive) return;

      // Para pernas durante a pausa
      if (opts.animateLegs) {
        if (n.wanderLegL) { n.wanderLegL.kill(); n.wanderLegL = null; }
        if (n.wanderLegR) { n.wanderLegR.kill(); n.wanderLegR = null; }
        gsap.to(n.legL.position, { z: 0, y: 0.2, duration: 0.15 });
        gsap.to(n.legR.position, { z: 0, y: 0.2, duration: 0.15 });
      }

      // Pausa antes do próximo destino
      const pause = 0.3 + Math.random() * (opts.pauseMax ?? 2.5);
      n.wanderTimer = gsap.delayedCall(pause, () => doWander(n, opts));
    }
  });
}

function startWandering(opts = {}) {
  const options = {
    radius:       opts.radius       ?? 7,
    speed:        opts.speed        ?? 2.8,   // unidades/segundo
    animateLegs:  opts.animateLegs  ?? true,
    faceDir:      opts.faceDir      ?? true,
    initialDelay: opts.initialDelay ?? 0,
    pauseMax:     opts.pauseMax     ?? 2.5,
  };
  wanderActive = true;
  nodes.forEach(n => {
    const delay = options.initialDelay + Math.random() * 2.0;
    n.wanderTimer = gsap.delayedCall(delay, () => doWander(n, options));
  });
}

// ───────────────────────────────────────────────────────────────

function applyChapterVisual(ch) {
  stopLifeLoops();   // halt individual behaviors before chapter transition
  stopWandering();   // halt locomotion before chapter transition

  gsap.killTweensOf(arenaGroup.rotation);
  gsap.to(arenaGroup.rotation, { y: 0, duration: 2.5, ease: 'power3.inOut' });
  
  // Reset nodes cleanly
  nodes.forEach(n => {
    gsap.killTweensOf(n.group.position);
    gsap.killTweensOf(n.group.rotation);
    gsap.killTweensOf(n.group.scale);
    gsap.killTweensOf(n.suitMat.color);
    gsap.killTweensOf(n.legL.position);
    gsap.killTweensOf(n.legR.position);
    gsap.killTweensOf(n.bodyMesh.position);
    
    n.suitMat.color.setHex(n.baseHex);
    n.visorMat.color.setHex(0x88ccff);
    
    if (!nav.explore && n.match) {
      gsap.to(n.suitMat, { opacity: 1.0, duration: 1 });
      gsap.to(n.visorMat, { opacity: 1.0, duration: 1 });
      
      // Reset Transforms
      gsap.to(n.group.scale, { x: n.baseScale, y: n.baseScale, z: n.baseScale, duration: 1.0, ease: 'power2.out' });
      gsap.to(n.group.rotation, { x: 0, y: 0, z: 0, duration: 1.0, ease: 'power2.out' });
      
      // Reset legs and body
      gsap.to(n.legL.position, { y: 0.2, z: 0, duration: 0.5 });
      gsap.to(n.legR.position, { y: 0.2, z: 0, duration: 0.5 });
      gsap.to(n.bodyMesh.position, { y: 0.7, duration: 0.5 });
      
      if (ch !== 0 && ch !== 9) {
        gsap.to(n.group.position, { x: n.baseX, y: n.baseY, z: n.baseZ, duration: 1.5, ease: 'power2.inOut' });
      }
    }
  });

  connGroup.children.forEach(l => gsap.to(l.material, { opacity: 0, duration: 0.5 }));

  // ================= SCENE CHOREOGRAPHIES =================
  if (ch === 0) {
    // Characters fall in from below — each at its own speed/ease by personality
    nodes.forEach(n => {
      n.group.position.y = -15;
      const eases = { hyper:'back.out(2.5)', nervous:'elastic.out(1,0.4)', curious:'back.out(1.8)', proud:'power4.out', chill:'back.out(1.2)' };
      const dur   = { hyper: 1.8, nervous: 2.8, curious: 2.4, proud: 2.0, chill: 3.0 }[n.personality] || 2.5;
      gsap.to(n.group.position, {
        x: n.baseX, y: n.baseY, z: n.baseZ,
        duration: dur, ease: eases[n.personality] || 'back.out(1.5)',
        delay: n.idx * 0.04
      });
    });
    // After everyone lands, start autonomous life + wandering
    gsap.delayedCall(3.2, () => {
      startLifeLoops(0);
      startWandering({ radius: 12, speed: 1.8, animateLegs: true, faceDir: true, pauseMax: 3.5 });
    });
  } 
  else if (ch === 1) {
    // Wandering: capítulo controla as pernas, wandering só move X/Z
    startWandering({ radius: 10, speed: 3.0, animateLegs: false, faceDir: true, initialDelay: 0.6, pauseMax: 1.5 });

    // Walking — each has unique step speed, swing amplitude, and wobble
    nodes.forEach(n => {
      const stepDur  = 0.08 + (1 / n.bobFreq) * 0.14;    // faster personalities step faster
      const legSwing = 0.18 + n.bobAmp * 0.28;
      const bodyBob  = n.bobAmp * 0.45;
      const wobble   = n.swayAmp * 0.8;
      const initDelay = Math.random() * 0.3;

      gsap.fromTo(n.legL.position,   { y: 0.2, z: 0.1 },  { z: legSwing, y: 0.42, duration: stepDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: initDelay });
      gsap.fromTo(n.legR.position,   { y: 0.2, z: -0.1 }, { z: -legSwing, y: 0.42, duration: stepDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: initDelay + stepDur });
      gsap.fromTo(n.bodyMesh.position, { y: 0.7 }, { y: 0.7 + bodyBob, duration: stepDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.fromTo(n.group.position,  { y: n.baseY }, { y: n.baseY + bodyBob * 0.7, duration: stepDur * 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      // Personality-based lateral wobble
      if (n.personality === 'hyper') {
        gsap.fromTo(n.group.rotation, { z: -wobble }, { z: wobble, duration: stepDur, yoyo: true, repeat: -1 });
      } else if (n.personality === 'nervous') {
        gsap.fromTo(n.group.rotation, { y: -0.3 }, { y: 0.3, duration: stepDur * 3, yoyo: true, repeat: -1 });
      }
    });
  } 
  else if (ch === 2) {
    // Wandering lento — parecem caminhar enquanto olham para o centro
    gsap.delayedCall(1.2, () => startWandering({ radius: 5, speed: 1.2, animateLegs: false, faceDir: false, pauseMax: 4 }));

    // Turn to face center — curious ones look back and forth, proud ones stay steady
    nodes.forEach(n => {
      const angle = Math.atan2(n.baseX, n.baseZ);
      gsap.to(n.group.rotation, { y: angle + Math.PI, duration: 0.8 + n.swayAmp * 4, ease: 'power2.out' });
      if (n.personality === 'curious') {
        gsap.fromTo(n.group.rotation, { x: 0 }, { x: 0.35, duration: 0.25, yoyo: true, repeat: -1, delay: Math.random() * 1.5, ease: 'sine.inOut' });
      } else if (n.personality === 'nervous') {
        gsap.fromTo(n.group.rotation, { x: 0 }, { x: 0.2, duration: 0.2, yoyo: true, repeat: -1, delay: Math.random(), ease: 'sine.inOut' });
      } else {
        gsap.fromTo(n.group.rotation, { x: 0 }, { x: 0.15, duration: 0.4, yoyo: true, repeat: -1, delay: Math.random() * 2.5, ease: 'sine.inOut' });
      }
    });
    gsap.delayedCall(2.5, () => startLifeLoops(0));
  } 
  else if (ch === 3) {
    // Celebration dance — each personality has its own style
    gsap.fromTo(arenaGroup.rotation, { y: 0 }, { y: Math.PI * 2, duration: 20, ease: 'none', repeat: -1 });
    nodes.forEach(n => {
      const spinDur   = (1 / n.bobFreq) * 1.2 + 0.4;  // fast chars spin faster
      const jumpH     = n.bobAmp * 3.5;
      const jumpDur   = 0.25 + n.bobAmp * 0.3;
      const legSpread = 0.2 + n.bobAmp * 0.2;

      gsap.fromTo(n.group.rotation, { y: 0 }, { y: Math.PI * 2, duration: spinDur, repeat: -1, ease: 'none' });
      gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH, duration: jumpDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() });
      gsap.fromTo(n.legL.position, { x: -0.15, y: 0.2 }, { y: 0.55, x: -legSpread, duration: jumpDur, yoyo: true, repeat: -1, delay: Math.random() });
      gsap.fromTo(n.legR.position, { x:  0.15, y: 0.2 }, { y: 0.55, x:  legSpread, duration: jumpDur, yoyo: true, repeat: -1, delay: Math.random() });
    });
  } 
  else if (ch === 4) {
    // Wandering por toda a arena enquanto exibem o tamanho
    gsap.delayedCall(2.0, () => startWandering({ radius: 8, speed: 1.6, animateLegs: true, faceDir: true, pauseMax: 3 }));

    // Size by seniority + idle personality behavior after scaling
    nodes.forEach(n => {
      const isSenior = S[n.idx].sen >= 2;
      const isJunior = S[n.idx].sen === 0;
      if (isSenior) {
        gsap.to(n.group.scale, { x: n.baseScale*1.6, y: n.baseScale*1.8, z: n.baseScale*1.6, duration: 1.5, ease: 'elastic.out(1, 0.5)' });
        // Seniors do a proud slow sway
        gsap.delayedCall(1.8, () => {
          gsap.fromTo(n.group.rotation, { z: -n.swayAmp }, { z: n.swayAmp, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        });
      } else if (isJunior) {
        gsap.to(n.group.scale, { x: n.baseScale*0.6, y: n.baseScale*0.5, z: n.baseScale*0.6, duration: 1.5, ease: 'power2.out' });
        // Juniors tremble nervously
        gsap.delayedCall(1.5, () => {
          gsap.fromTo(n.group.rotation, { z: -0.08 }, { z: 0.08, duration: 0.06, yoyo: true, repeat: -1, ease: 'none' });
        });
      } else {
        // Mid-level bob at their own rhythm
        gsap.delayedCall(1.0, () => {
          gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + n.bobAmp, duration: 0.5 / n.bobFreq, yoyo: true, repeat: -1, ease: 'sine.inOut' });
        });
      }
    });
  } 
  else if (ch === 5) {
    // Wandering leve: dançam e ao mesmo tempo se movem pela arena
    startWandering({ radius: 7, speed: 1.5, animateLegs: false, faceDir: false, initialDelay: 0.5, pauseMax: 2 });

    // ★ DANCE PARTY — cada personalidade tem seu estilo próprio
    nodes.forEach(n => {
      const beat  = 0.35 + n.bobAmp * 0.2;   // tempo individual
      const jumpH = n.bobAmp * 2.8;
      const phase = Math.random();             // offset de fase para não ficarem sincronizados

      if (n.personality === 'hyper') {
        // Breakdancer — giro contínuo + salto alto + pernas cruzando
        gsap.fromTo(n.group.rotation, { y: 0 }, { y: Math.PI * 2, duration: 0.45, repeat: -1, ease: 'none' });
        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH * 1.6, duration: beat * 0.45, yoyo: true, repeat: -1, ease: 'power2.out', delay: phase });
        gsap.fromTo(n.legL.position, { z: -0.25, y: 0.2 }, { z: 0.35, y: 0.55, duration: 0.13, yoyo: true, repeat: -1 });
        gsap.fromTo(n.legR.position, { z:  0.25, y: 0.2 }, { z: -0.35, y: 0.55, duration: 0.13, yoyo: true, repeat: -1, delay: 0.13 });

      } else if (n.personality === 'chill') {
        // Head-bop suave — balanço lento e orgânico
        gsap.fromTo(n.group.rotation, { z: -0.28 }, { z: 0.28, duration: beat * 2.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: phase });
        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH * 0.5, duration: beat * 1.1, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: phase });
        gsap.fromTo(n.legL.position, { z:  0.12, y: 0.22 }, { z: -0.12, y: 0.32, duration: beat * 0.9, yoyo: true, repeat: -1, delay: phase });
        gsap.fromTo(n.legR.position, { z: -0.12, y: 0.22 }, { z:  0.12, y: 0.32, duration: beat * 0.9, yoyo: true, repeat: -1, delay: phase + beat * 0.45 });

      } else if (n.personality === 'nervous') {
        // Robot — movimentos mecânicos e abruptos
        gsap.fromTo(n.group.rotation, { y: -Math.PI / 3 }, { y: Math.PI / 3, duration: 0.28, yoyo: true, repeat: -1, ease: 'steps(2)' });
        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH, duration: 0.28, yoyo: true, repeat: -1, ease: 'steps(1)', delay: phase });
        gsap.fromTo(n.legL.position, { y: 0.2, x: -0.15 }, { y: 0.52, x: -0.15, duration: 0.28, yoyo: true, repeat: -1 });
        gsap.fromTo(n.legR.position, { y: 0.52, x:  0.15 }, { y: 0.2,  x:  0.15, duration: 0.28, yoyo: true, repeat: -1 });

      } else if (n.personality === 'curious') {
        // Shuffle — passos laterais rápidos com olhadas
        gsap.fromTo(n.group.rotation, { y: -1.0 }, { y: 1.0, duration: beat * 1.4, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: phase });
        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH * 0.9, duration: beat * 0.6, yoyo: true, repeat: -1, ease: 'power1.out', delay: phase });
        gsap.fromTo(n.legL.position, { z:  0.22, y: 0.2 }, { z: -0.08, y: 0.42, duration: beat * 0.55, yoyo: true, repeat: -1, delay: phase });
        gsap.fromTo(n.legR.position, { z: -0.22, y: 0.2 }, { z:  0.08, y: 0.42, duration: beat * 0.55, yoyo: true, repeat: -1, delay: phase + beat * 0.28 });

      } else {
        // Proud — strut de marchador: peito pra frente, passo alto e orgulhoso
        gsap.fromTo(n.group.rotation, { x: -0.18 }, { x: 0.08, duration: beat * 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: phase });
        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH * 1.1, duration: beat * 0.55, yoyo: true, repeat: -1, ease: 'power2.out', delay: phase });
        gsap.fromTo(n.legL.position, { z:  0.32, y: 0.2, x: -0.15 }, { z: -0.08, y: 0.55, x: -0.15, duration: beat * 0.55, yoyo: true, repeat: -1, delay: phase });
        gsap.fromTo(n.legR.position, { z: -0.32, y: 0.2, x:  0.15 }, { z:  0.08, y: 0.55, x:  0.15, duration: beat * 0.55, yoyo: true, repeat: -1, delay: phase + beat * 0.28 });
      }
    });
  } 
  else if (ch === 6) {
    // ★ CABO DE GUERRA — metade esquerda vs metade direita da arena
    // Ambas as equipes puxam em sentidos opostos com a mesma frequência

    const tugDur = 2.0; // período da corda — igual para todos (mesma frequência)

    nodes.forEach(n => {
      // Divide por X: negativos = Time Esquerdo, positivos = Time Direito
      const isLeft  = n.baseX <= 0;
      const dir     = isLeft ? -1 : 1;
      const pullDist = 3.5 + n.bobAmp * 2.5;

      // Vira para olhar na direção que está puxando (para fora)
      gsap.to(n.group.rotation, { y: isLeft ? -Math.PI / 2 : Math.PI / 2, duration: 0.5, ease: 'power2.out' });

      // Inclina o corpo no eixo Z (lean lateral de esforço)
      const lean = dir * (0.3 + n.swayAmp * 2.0);
      gsap.to(n.group.rotation, { z: lean, duration: 0.7, delay: 0.3, ease: 'power2.out' });

      // Fase oposta entre os dois times: quando esquerdo avança, direito recua
      const phase = isLeft ? 0 : tugDur;

      // Puxada no eixo X — oscila entre base e posição avançada
      gsap.fromTo(n.group.position,
        { x: n.baseX },
        { x: n.baseX + dir * pullDist, duration: tugDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: phase + Math.random() * 0.2 }
      );

      // Pernas cavando o chão (esforço de tração)
      const legDur = 0.12 + n.bobAmp * 0.07;
      gsap.fromTo(n.legL.position, { z:  0.28, y: 0.2 }, { z: -0.1, y: 0.46, duration: legDur, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      gsap.fromTo(n.legR.position, { z: -0.28, y: 0.2 }, { z:  0.1, y: 0.46, duration: legDur, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: legDur });

      // Corpo strainando (leve bob vertical de esforço)
      gsap.fromTo(n.bodyMesh.position, { y: 0.7 }, { y: 0.77, duration: legDur * 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
  } 
  else if (ch === 7) {
    // ★ MÉTRICAS — quem NÃO usa métricas some e reaparece aleatoriamente
    // Quem USA métricas anda pela arena pulando com energia

    // Wandering para os que usam métricas
    startWandering({ radius: 7, speed: 2.2, animateLegs: false, faceDir: true, initialDelay: 0.8, pauseMax: 2 });

    nodes.forEach(n => {
      if (!n.isMetricsUser) {
        // ── INSTÁVEL: some e reaparece em loop ──────────────────
        n.suitMat.transparent = true;
        n.visorMat.transparent = true;

        // Loop recursivo de sumir → pausa → aparecer → pausa → sumir
        function blinkLoop() {
          if (nav.current !== 7) return; // encerra se saiu do capítulo

          const visibleFor = 1.2 + Math.random() * 2.8; // fica visível 1-4s
          const hiddenFor  = 0.4 + Math.random() * 1.6; // fica invisível 0.4-2s
          const disappearDur = { hyper: 0.15, nervous: 0.35, chill: 0.5, curious: 0.25, proud: 0.2 }[n.personality] || 0.3;
          const appearDur    = disappearDur * 1.6;

          gsap.delayedCall(visibleFor, () => {
            if (nav.current !== 7) return;

            // Efeito de dissolve ao sumir
            triggerDissolve(n.idx);

            gsap.to(n.group.scale, {
              x: 0, y: 0, z: 0,
              duration: disappearDur,
              ease: 'back.in(1.8)',
              onComplete: () => {
                if (nav.current !== 7) return;

                gsap.delayedCall(hiddenFor, () => {
                  if (nav.current !== 7) return;

                  // Pop de volta ao aparecer
                  gsap.to(n.group.scale, {
                    x: n.baseScale, y: n.baseScale, z: n.baseScale,
                    duration: appearDur,
                    ease: 'elastic.out(1.3, 0.45)',
                    onComplete: blinkLoop // agenda próxima iteração
                  });
                });
              }
            });
          });
        }

        // Inicia com delay aleatório para não somarem todos ao mesmo tempo
        gsap.delayedCall(Math.random() * 3.5, blinkLoop);

        // Micro-movimento enquanto visível (nervoso de sumir)
        gsap.fromTo(n.group.rotation, { z: -n.swayAmp }, { z: n.swayAmp, duration: 0.4 + n.bobAmp * 0.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });

      } else {
        // ── ESTÁVEL: pula com energia na arena ──────────────────
        const jumpH = n.bobAmp * 2.8;
        const dur   = 0.28 + (1 / n.bobFreq) * 0.22;

        gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH, duration: dur, yoyo: true, repeat: -1, ease: 'power2.out', delay: Math.random() * 0.5 });
        gsap.fromTo(n.legL.position, { y: 0.2 }, { y: 0.55 + n.bobAmp, duration: dur, yoyo: true, repeat: -1 });
        gsap.fromTo(n.legR.position, { y: 0.2 }, { y: 0.55 + n.bobAmp, duration: dur, yoyo: true, repeat: -1, delay: dur * 0.5 });

        // Spin de celebração ocasional
        if (n.personality === 'hyper' || n.personality === 'proud') {
          gsap.to(n.group.rotation, { y: '+=' + Math.PI * 2, duration: 0.8, repeat: -1, ease: 'none', delay: Math.random() * 2 });
        }
      }
    });
  } 
  else if (ch === 8) {
    // ★ ROBÔS — IA transformou todos em máquinas
    // Suit torna-se cinza metálico, visor vira scanner vermelho, movimentos mecânicos (steps)

    startWandering({ radius: 9, speed: 2.5, animateLegs: false, faceDir: true, initialDelay: 0.5, pauseMax: 1.5 });

    nodes.forEach(n => {
      // Paleta metálica
      gsap.to(n.suitMat.color, { r: 0.32, g: 0.36, b: 0.42, duration: 0.9 });
      gsap.to(n.visorMat.color, { r: 0.95, g: 0.08, b: 0.08, duration: 0.9 });

      // Velocidade de marcha por personalidade
      const marchStep = { hyper: 0.14, nervous: 0.20, curious: 0.26, proud: 0.38, chill: 0.50 }[n.personality] || 0.28;

      // Bob vertical mecânico (steps = abruptamente robótico)
      gsap.fromTo(n.group.position,
        { y: n.baseY },
        { y: n.baseY + 0.45 + n.bobAmp * 0.5, duration: marchStep, yoyo: true, repeat: -1, ease: 'steps(1)', delay: Math.random() * 0.4 }
      );

      // Pernas em marcha mecânica
      gsap.fromTo(n.legL.position, { y: 0.2, z: 0 }, { y: 0.52, z:  0.22, duration: marchStep, yoyo: true, repeat: -1, ease: 'steps(1)' });
      gsap.fromTo(n.legR.position, { y: 0.2, z: 0 }, { y: 0.52, z: -0.22, duration: marchStep, yoyo: true, repeat: -1, ease: 'steps(1)', delay: marchStep });

      // Scan rotacional mecânico (cabeça/corpo vira para os lados em degraus)
      gsap.fromTo(n.group.rotation,
        { y: -Math.PI * 0.35 },
        { y:  Math.PI * 0.35, duration: marchStep * 7, yoyo: true, repeat: -1, ease: 'steps(5)', delay: Math.random() * 2 }
      );

      // Glitch periódico: tremor rápido de rotação
      const scheduleGlitch = () => {
        if (nav.current !== 8) return;
        const glitchZ = (Math.random() - 0.5) * 0.55;
        gsap.to(n.group.rotation, { z: glitchZ, duration: 0.05, ease: 'none',
          onComplete: () => gsap.to(n.group.rotation, { z: 0, duration: 0.06 })
        });
        gsap.delayedCall(1.5 + Math.random() * 4, scheduleGlitch);
      };
      gsap.delayedCall(Math.random() * 3, scheduleGlitch);
    });
  } 
  else if (ch === 9) {
    // Ejection — each personality flies differently
    nodes.forEach(n => {
      const spread  = 8 + n.bobAmp * 15;
      const height  = 35 + n.bobAmp * 25;
      const flightDur = { hyper: 6, nervous: 12, curious: 8, proud: 7, chill: 15 }[n.personality] || 10;
      const dx = (Math.random() - 0.5) * spread;
      const dz = (Math.random() - 0.5) * spread;
      const rx = (n.personality === 'hyper')   ? Math.random() * Math.PI * 20 : Math.random() * Math.PI * 6;
      const ry = (n.personality === 'nervous') ? Math.random() * Math.PI * 3  : Math.random() * Math.PI * 12;
      const rz = Math.random() * Math.PI * 8;

      gsap.fromTo(n.group.position,
        { x: n.baseX, y: n.baseY, z: n.baseZ },
        { x: n.baseX + dx, y: n.baseY + height, z: n.baseZ + dz, duration: flightDur, ease: 'power1.out' }
      );
      gsap.to(n.group.rotation, { x: rx, y: ry, z: rz, duration: flightDur, ease: 'none' });
    });
  } 
  else if (ch === 10) {
    // Celebration finale — everyone at their own rhythm
    gsap.fromTo(arenaGroup.rotation, { y: 0 }, { y: Math.PI * 2, duration: 20, ease: 'none', repeat: -1 });
    nodes.forEach(n => {
      const jumpH   = n.bobAmp * 4.0;
      const jumpDur = 0.18 + (1 / n.bobFreq) * 0.25;
      const spinDur = (n.personality === 'hyper') ? 0.4 : (n.personality === 'chill') ? 1.5 : 0.9;

      gsap.fromTo(n.group.position, { y: n.baseY }, { y: n.baseY + jumpH, duration: jumpDur, yoyo: true, repeat: -1, delay: Math.random() * 0.4, ease: 'power2.out' });
      gsap.to(n.group.rotation,     { y: '+=' + Math.PI * 2, duration: spinDur, repeat: -1, ease: 'none' });
      gsap.fromTo(n.legL.position,  { y: 0.2 }, { y: 0.6 + n.bobAmp, duration: jumpDur, yoyo: true, repeat: -1 });
      gsap.fromTo(n.legR.position,  { y: 0.2 }, { y: 0.6 + n.bobAmp, duration: jumpDur, yoyo: true, repeat: -1, delay: jumpDur * 0.5 });
      if (n.personality === 'hyper') {
        gsap.fromTo(n.group.rotation, { z: -0.3 }, { z: 0.3, duration: 0.2, yoyo: true, repeat: -1 });
      }
    });
  }
}
function animateHTML(section) {
  const lines = section.querySelectorAll('.line-anim');
  gsap.fromTo(lines, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05, ease: 'power2.out', clearProps: 'transform' });

  section.querySelectorAll('.stat-val, .paradox-num').forEach(el => {
    const t = parseFloat(el.dataset.target);
    gsap.fromTo(el, { innerHTML: 0 }, { innerHTML: t, duration: 1.5, ease: 'power2.out', snap: { innerHTML: 0.1 }, onUpdate: function() { el.innerHTML = Number(this.targets()[0].innerHTML).toFixed(1); } });
  });

  section.querySelectorAll('.ch-bar-row').forEach(el => {
    const fill = el.querySelector('.bar-fill');
    const pct = parseFloat(el.dataset.pct);
    gsap.fromTo(fill, { width: '0%' }, { width: pct + '%', duration: 1.2, ease: 'power2.out', delay: 0.2 });
  });
}

const camLookTarget = new THREE.Vector3(0,0,0);

function goToChapter(idx) {
  if (nav.transitioning || idx === nav.current) return;
  if (idx < 0 || idx >= N_CH) { if (idx >= N_CH) enterExplore(); return; }
  nav.transitioning = true;
  const from = nav.current, to = idx;

  const chEls = document.querySelectorAll('.chapter');
  document.getElementById('ch-label').textContent = CH_NAMES[to];

  const T = 2.0;
  const tl = gsap.timeline({
    onComplete: () => {
      nav.current = to; nav.transitioning = false;
      document.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === to));
      document.getElementById('arrow-prev').disabled = to === 0;
      document.getElementById('arrow-next').disabled = false;
    }
  });

  if (from >= 0 && chEls[from]) {
    tl.to(chEls[from], { opacity: 0, duration: 0.4, ease: 'power2.inOut' }, 0);
    tl.set(chEls[from], { pointerEvents: 'none' }, 0);
  }
  
  const ct = CH_CAM[to];
  tl.to(cam.position, { x: ct.p[0], y: ct.p[1], z: ct.p[2], duration: T, ease: 'power2.inOut' }, 0);
  tl.to(camLookTarget, { x: ct.l[0], y: ct.l[1], z: ct.l[2], duration: T, ease: 'power2.inOut', onUpdate: () => cam.lookAt(camLookTarget) }, 0);
  tl.to(cam, { fov: ct.fov, duration: T, ease: 'power2.inOut', onUpdate: () => cam.updateProjectionMatrix() }, 0);
  
  const textDelay = from === -1 ? 0.2 : T - 0.4;
  tl.set(chEls[to], { pointerEvents: 'auto' }, textDelay);
  tl.to(chEls[to], { opacity: 1, duration: 0.8, ease: 'power2.out', onStart: () => animateHTML(chEls[to]) }, textDelay);
  
  tl.to({}, { duration: 0.1, onUpdate: () => document.getElementById('prog-fill').style.width = ((to / (N_CH-1)) * 100) + '%' }, 0);

  document.getElementById('arrow-prev').disabled = true; document.getElementById('arrow-next').disabled = true;
  applyChapterVisual(to);
}

// Events
document.getElementById('btn-iniciar').addEventListener('click', () => goToChapter(1));
document.getElementById('arrow-prev').addEventListener('click', () => goToChapter(nav.current - 1));
document.getElementById('arrow-next').addEventListener('click', () => goToChapter(nav.current + 1));
document.addEventListener('keydown', e => {
  if (nav.explore) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goToChapter(nav.current + 1); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); goToChapter(nav.current - 1); }
  if (e.key === 'e' || e.key === 'E') enterExplore();
});

// Touch swipe support for mobile navigation
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  touchStartTime = Date.now();
}, { passive: true });
document.addEventListener('touchend', e => {
  if (nav.explore) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  const dt = Date.now() - touchStartTime;
  const isHorizontalSwipe = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50 && dt < 400;
  if (!isHorizontalSwipe) return;
  if (dx < 0) goToChapter(nav.current + 1);
  else goToChapter(nav.current - 1);
}, { passive: true });
document.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => goToChapter(parseInt(d.dataset.ch))));

// ═══ EXPLORE MODE ═══
function enterExplore() {
  if (nav.explore) return;
  nav.explore = true; nav.transitioning = false;
  gsap.killTweensOf(cam.position); gsap.killTweensOf(camLookTarget); gsap.killTweensOf(arenaGroup.rotation);
  
  nodes.forEach(n => {
    n.suitMat.color.setHex(n.baseHex);
    n.visorMat.color.setHex(0x88ccff);
    gsap.to(n.suitMat, { opacity: 1.0, duration: 1 });
    gsap.to(n.visorMat, { opacity: 1.0, duration: 1 });
    gsap.to(n.group.position, { 
      x: n.baseX, y: n.baseY, z: n.baseZ, duration: 1.5, ease: 'power2.out',
      onComplete: () => {
        gsap.to(n.group.position, { y: n.baseY + 0.3, duration: 1.5, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      }
    });
  });

  orbit.enabled = true; orbit.target.copy(camLookTarget);
  gsap.to('#overlay', { opacity: 0, duration: 0.5, onComplete: () => document.getElementById('overlay').style.display = 'none' });
  gsap.to('#nav-arrows', { opacity: 0, duration: 0.3, onComplete: () => document.getElementById('nav-arrows').style.display = 'none' });
  gsap.to('#prog-bar', { opacity: 0, duration: 0.3, onComplete: () => document.getElementById('prog-bar').style.display = 'none' });
  document.getElementById('ch-label').textContent = 'EXPLORE';
  document.getElementById('sidebar-toggle').style.display = 'flex';
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-toggle').classList.add('open');
  
  gsap.to(cam.position, { x: 0, y: 20, z: 35, duration: 2.0, ease: 'power2.out' });
  gsap.to(camLookTarget, { x: 0, y: 0, z: 0, duration: 2.0, ease: 'power2.out', onUpdate: () => cam.lookAt(camLookTarget) });
  gsap.to(cam, { fov: 45, duration: 2.0, onUpdate: () => cam.updateProjectionMatrix() });
  gsap.to(arenaGroup.rotation, { y: 0, duration: 2.0 });
}

// ═══ FILTERS ═══
const VIEWS = [
  { id: 'origem', label: 'I · ORIGEM', filters: { foco: { label: 'FOCO', values: ['Back-end', 'Full-stack', 'Mobile', 'Front-end', 'Dados', 'QA'] } } },
  { id: 'prof', label: 'II · PROFISSIONAL', filters: { sen: { label: 'SENIORIDADE', values: ['0', '1', '2', '3'] }, emp: { label: 'STATUS', values: ['empregado', 'ja_atuou', 'primeiro_emprego'] } } },
  { id: 'stacks', label: 'III · STACKS', filters: { stacks: { label: 'TECNOLOGIA', values: ['JS/TS', 'Python', 'Java', 'C#/.NET', 'SQL/BD', 'Cloud', 'Kotlin/Swift', 'Go'] } } },
  { id: 'ia', label: 'IV · IA & FUTURO', filters: { ia: { label: 'RELAÇÃO COM IA', values: ['impacto_positivo', 'medo_substituicao'] }, obj: { label: 'OBJETIVO', values: ['exterior', 'migrar', 'promocao', 'empreender'] } } }
];

const filterState = { foco: new Set(), sen: new Set(), stacks: new Set(), obj: new Set(), ia: new Set(), emp: new Set(), anyActive: false };
const LABEL_MAP = { exterior: 'Exterior', migrar: 'Migrar', promocao: 'Promoção', empreender: 'Empreender', primeiro_emprego: '1º Emprego', impacto_positivo: 'Impacto +', medo_substituicao: 'Medo Subst.', empregado: 'Empregado', ja_atuou: 'Já Atuou' };
const SEN_LBL = ['Estágio', 'Júnior', 'Pleno', 'Sênior'];

function studentMatch(i) {
  const s = S[i];
  if (filterState.foco.size > 0 && !filterState.foco.has(s.foco)) return false;
  if (filterState.sen.size > 0 && !filterState.sen.has(String(s.sen))) return false;
  if (filterState.emp.size > 0 && !filterState.emp.has(s.emp)) return false;
  if (filterState.stacks.size > 0 && !s.stacks.some(st => filterState.stacks.has(st))) return false;
  if (filterState.obj.size > 0 && !filterState.obj.has(s.obj)) return false;
  if (filterState.ia.size > 0) {
    let m = false;
    if (filterState.ia.has('impacto_positivo') && s.ia_pos) m = true;
    if (filterState.ia.has('medo_substituicao') && s.fear_subst) m = true;
    if (!m) return false;
  }
  return true;
}

function applyFilter() {
  filterState.anyActive = ['foco','sen','stacks','obj','ia','emp'].some(k => filterState[k].size > 0);
  let active = 0;
  for (let i = 0; i < N; i++) {
    const match = filterState.anyActive ? studentMatch(i) : true;
    const n = nodes[i];
    if (match !== n.match) {
      if (!match) {
        triggerDissolve(i);
        gsap.to(n.group.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'back.in(1.5)' });
      } else {
        gsap.to(n.group.scale, { x: n.baseScale, y: n.baseScale, z: n.baseScale, duration: 0.8, ease: 'elastic.out(1, 0.5)' });
      }
      n.match = match;
    }
    if (match) active++;
  }
  document.getElementById('filter-info').textContent = filterState.anyActive ? `[ ${active}/${N} CREWMATES ]` : `[ ${N} CREWMATES ]`;
}

function buildSidebar() {
  const cont = document.getElementById('sidebar-content');
  const tabBar = document.createElement('div'); tabBar.id = 'sb-tabs'; cont.appendChild(tabBar);
  const panels = document.createElement('div'); panels.id = 'sb-panels'; cont.appendChild(panels);

  VIEWS.forEach((view, vi) => {
    const tab = document.createElement('button');
    tab.className = 'sb-tab' + (vi === 0 ? ' active' : ''); tab.textContent = view.label;
    tabBar.appendChild(tab);
    const panel = document.createElement('div');
    panel.className = 'sb-panel' + (vi === 0 ? ' visible' : ''); panels.appendChild(panel);
    
    Object.entries(view.filters).forEach(([key, def]) => {
      const h = document.createElement('h3'); h.textContent = def.label; panel.appendChild(h);
      const grp = document.createElement('div'); grp.className = 'fgroup';
      def.values.forEach(val => {
        const btn = document.createElement('button'); btn.className = 'fbtn';
        btn.textContent = key === 'sen' ? SEN_LBL[parseInt(val)] : (LABEL_MAP[val] || val);
        btn.addEventListener('click', () => {
          if (filterState[key].has(val)) { filterState[key].delete(val); btn.classList.remove('active'); }
          else { filterState[key].add(val); btn.classList.add('active'); }
          applyFilter();
        });
        grp.appendChild(btn);
      });
      panel.appendChild(grp);
    });

    tab.addEventListener('click', () => {
      tabBar.querySelectorAll('.sb-tab').forEach((t, ti) => t.classList.toggle('active', ti === vi));
      panels.querySelectorAll('.sb-panel').forEach((p, pi) => p.classList.toggle('visible', pi === vi));
    });
  });

  const clear = document.createElement('button'); clear.className = 'fclear'; clear.textContent = 'Limpar Filtros';
  clear.addEventListener('click', () => {
    cont.querySelectorAll('.fbtn').forEach(b => b.classList.remove('active'));
    ['foco','sen','stacks','obj','ia','emp'].forEach(k => filterState[k].clear());
    applyFilter();
  });
  cont.appendChild(clear);
  const info = document.createElement('div'); info.className = 'filter-info'; info.id = 'filter-info'; cont.appendChild(info);
}
buildSidebar();
document.getElementById('sidebar-toggle').addEventListener('click', (e) => {
  const sb = document.getElementById('sidebar');
  e.currentTarget.classList.toggle('open');
  sb.classList.toggle('open');
});

// ═══ ANIMATION LOOP ═══
function animate(t) {
  requestAnimationFrame(animate);
  const T = t * 0.001;

  if (nav.current === 8 && !nav.transitioning && !nav.explore) {
    arenaGroup.rotation.y = T * 0.1;
  }

  // Bobbing and manual pos animations are entirely handled by GSAP now.
  // DO NOT mutate n.group.position.y manually here to avoid GSAP overwrite lock!
  
  // Stars subtle rotation
  stars.rotation.y = T * 0.02;

  // Dissolve particles
  let dissolveUpdate = false;
  for (let i = 0; i < N; i++) {
    const ds = dissolveState[i];
    if (!ds.active) continue;
    ds.t += 0.03; dissolveUpdate = true;
    for (let p = 0; p < 10; p++) {
      const k = i * 10 + p;
      dissolvePos[k*3] += dissolveVel[k*3]; 
      dissolvePos[k*3+1] += dissolveVel[k*3+1] + 0.02; 
      dissolvePos[k*3+2] += dissolveVel[k*3+2];
      dissolveAlpha[k] = Math.max(0, 1.0 - ds.t * 1.5);
    }
    if (ds.t > 1.0) ds.active = false;
  }
  if (dissolveUpdate) { dissolveGeo.attributes.position.needsUpdate = true; dissolveGeo.attributes.alpha.needsUpdate = true; }

  if (orbit.enabled) orbit.update();
  composer.render();
}
animate(0);

setTimeout(() => goToChapter(0), 100);

window.addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
