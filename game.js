// ============================================================================
// CYBER-CARACAS: HACKER CHASE - OUT RUN 2D ARCADE
// Platanus Hack 26: Caracas Edition
// El Hacker Etico en moto VS El Ciberdelincuente en auto blindado
// Sponsors: YUMMY * CASHEA * KAPSO * ELEVENLABS * VERCEL * RENDER * ANTHROPIC
// ============================================================================

const GW = 800;
const GH = 600;
const rnd = (a, b) => Phaser.Math.Between(a, b);
const FF = 'Courier,monospace';
const STORAGE_KEY = 'cyber_caracas_scores';
const HORIZON_Y = 225;
const ROAD_TW = 130;
const ROAD_BW = 620;

const CABINET_KEYS = {
  P1_U: ['w', 'ArrowUp'],
  P1_D: ['s', 'ArrowDown'],
  P1_L: ['a', 'ArrowLeft'],
  P1_R: ['d', 'ArrowRight'],
  P1_1: ['u', 'j', ' ', 'Control'],
  P1_2: ['i', 'k', 'e', 'x'],
  P1_3: ['o', 'l', 'q', 'c'],
  P1_4: ['j'],
  P1_5: ['k'],
  P1_6: ['l', 'n'],
  P2_U: ['ArrowUp'],
  P2_D: ['ArrowDown'],
  P2_L: ['ArrowLeft'],
  P2_R: ['ArrowRight'],
  P2_1: ['r'],
  P2_2: ['t'],
  P2_3: ['y'],
  P2_4: ['f'],
  P2_5: ['g'],
  P2_6: ['h'],
  START1: ['Enter', '1'],
  START2: ['2'],
};

const KB2ARC = {};
for (const [code, keys] of Object.entries(CABINET_KEYS)) {
  for (const k of keys) {
    const nk = normKey(k);
    if (!KB2ARC[nk]) KB2ARC[nk] = [];
    KB2ARC[nk].push(code);
  }
}

const ALL_PHASES = ['strafe', 'shoot', 'spread', 'shield', 'burst', 'snipe', 'rain', 'charge'];
const WORLDS = [
  {
    id: 1,
    name: 'AUTOPISTA FAJARDO',
    short: 'FAJARDO',
    type: 'fajardo',
    sponsor: 'YUMMY',
    sColor: 0xffd200,
    power: 'Turbo Boost 200cc',
    pDesc: 'Super nitro e invulnerabilidad 1.5s',
    bossHp: 28,
    speed: 380,
    sky: 0x07152d,
    ground: 0x0d2818,
    road: 0x222632,
  },
  {
    id: 2,
    name: 'BOULEVARD SABANA GRANDE',
    short: 'SABANA GDE',
    type: 'boulevard',
    sponsor: 'CASHEA',
    sColor: 0x00e5a3,
    power: 'Escudo Cuota Cero',
    pDesc: 'Escudo que absorbe 1 choque mortal',
    bossHp: 38,
    speed: 410,
    sky: 0x180d28,
    ground: 0x1f1b29,
    road: 0x282333,
  },
  {
    id: 3,
    name: 'LAS MERCEDES & CHACAO',
    short: 'LAS MERCEDES',
    type: 'chacao',
    sponsor: 'KAPSO',
    sColor: 0x25d366,
    power: 'Satelite API Drone',
    pDesc: 'Dron escolta con disparo automatico',
    bossHp: 50,
    speed: 440,
    sky: 0x071b26,
    ground: 0x0d1f2b,
    road: 0x182633,
  },
  {
    id: 4,
    name: 'TORRES PARQUE CENTRAL',
    short: 'P. CENTRAL',
    type: 'parquecentral',
    sponsor: 'ELEVENLABS',
    sColor: 0xffffff,
    power: 'Onda Sonica EMP',
    pDesc: 'Pulso EMP que destruye trampas y aturde',
    bossHp: 65,
    speed: 470,
    sky: 0x150b28,
    ground: 0x110f1c,
    road: 0x1a1824,
  },
  {
    id: 5,
    name: 'TUNEL BOQUERON 1 (LA GUAIRA)',
    short: 'BOQUERON',
    type: 'tunnel',
    sponsor: 'VERCEL',
    sColor: 0x00f0ff,
    power: 'Edge Deploy Warp',
    pDesc: 'Warp adelante para evadir obstaculos',
    bossHp: 80,
    speed: 500,
    sky: 0x05080f,
    ground: 0x0a1018,
    road: 0x121822,
  },
  {
    id: 6,
    name: 'NUBE DE SERVIDORES',
    short: 'DATACENTER',
    type: 'datacenter',
    sponsor: 'RENDER',
    sColor: 0x46e3b7,
    power: 'Auto-Scale Titan',
    pDesc: 'Modo gigante 5s arrasando obstaculos',
    bossHp: 100,
    speed: 530,
    sky: 0x04140c,
    ground: 0x021a0c,
    road: 0x071f12,
  },
  {
    id: 7,
    name: 'EL AVILA - HOTEL HUMBOLDT',
    short: 'HUMBOLDT',
    type: 'humboldt',
    sponsor: 'ANTHROPIC',
    sColor: 0xf59e0b,
    power: 'Claude AI Core',
    pDesc: 'Camara lenta + Hiper-rayo definitivo',
    bossHp: 125,
    speed: 560,
    sky: 0x220c1c,
    ground: 0x160812,
    road: 0x1f101a,
  }
];
WORLDS.forEach(w => {
  w.sHex = '#' + w.sColor.toString(16).padStart(6, '0');
  w.bossPhases = ALL_PHASES.slice(0, w.id + 1);
});

const LETTER_GRID = ['ABCDEFG'.split(''),'HIJKLMN'.split(''),'OPQRSTU'.split(''),'VWXYZ.-'.split(''),['DEL','END']];

// Audio synthesizers (Web Audio API)
let _actx = null;
function gACtx() {
  if (!_actx && (window.AudioContext || window.webkitAudioContext)) {
    _actx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_actx && _actx.state === 'suspended') _actx.resume();
  return _actx;
}
function snd(type) {
  try {
    const ctx = gACtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const play = (freqs, times, gain, wave='sawtooth', rType='exp') => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = wave;
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.setValueAtTime(freqs[0], now);
      for (let i = 1; i < freqs.length; i++) {
        if (rType === 'lin') osc.frequency.linearRampToValueAtTime(freqs[i], now + times[i-1]);
        else osc.frequency.exponentialRampToValueAtTime(freqs[i], now + times[i-1]);
      }
      const dur = times[times.length - 1];
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.start(now); osc.stop(now + dur);
    };
    if (type === 'laser') play([880, 140], [0.1], 0.12);
    else if (type === 'hit') play([220, 40], [0.12], 0.18, 'square');
    else if (type === 'warp') play([180, 1500], [0.22], 0.16, 'sine');
    else if (type === 'boom') play([120, 25], [0.45], 0.25);
    else if (type === 'select') play([540, 540], [0.08], 0.1, 'sine');
    else if (type === 'enemy') play([320, 90], [0.15], 0.08, 'square');
    else if (type === 'skid') play([450, 90], [0.14], 0.09);
    else if (type === 'siren') play([650, 950, 650], [0.1, 0.24], 0.12, 'triangle', 'lin');
    else if (type === 'emp') play([80, 1400, 40], [0.15, 0.4], 0.22, 'square');
    else if (type === 'titan') play([60, 120, 25], [0.1, 0.35], 0.24);
    else if (type === 'powerup') {
      [350, 520, 780].forEach((f, i) => setTimeout(() => {
        try {
          const o = ctx.createOscillator(), gn = ctx.createGain();
          o.type = 'triangle'; o.frequency.value = f; o.connect(gn); gn.connect(ctx.destination);
          gn.gain.setValueAtTime(0.18, ctx.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          o.start(); o.stop(ctx.currentTime + 0.12);
        } catch(e){}
      }, i * 75));
    }
  } catch (e) {}
}


let _engOsc = null, _engGain = null;
function updateEngineAudio(s, speedRatio, turbo) {
  try {
    const ctx = gACtx();
    if (!ctx) return;
    if (s.st.phase !== 'playing') {
      if (_engGain) _engGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      return;
    }
    const now = ctx.currentTime;
    if (!_engOsc) {
      _engOsc = ctx.createOscillator();
      _engGain = ctx.createGain();
      _engOsc.type = 'sawtooth';
      _engOsc.frequency.setValueAtTime(60, now);
      _engGain.gain.setValueAtTime(0.001, now);
      _engOsc.connect(_engGain);
      _engGain.connect(ctx.destination);
      _engOsc.start();
    }
    const baseFreq = turbo ? 180 : (60 + speedRatio * 80);
    const targetGain = turbo ? 0.055 : 0.032;
    _engOsc.frequency.linearRampToValueAtTime(baseFreq, now + 0.05);
    _engGain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
  } catch (e) {}
}

const config = {
  type: Phaser.AUTO,
  width: GW,
  height: GH,
  parent: 'game-root',
  backgroundColor: '#05070e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GW, height: GH },
  scene: { preload, create, update }
};
new Phaser.Game(config);

function preload() {}

function create() {
  const s = this;
  window.__gs = s;
  s.st = {
    phase: 'title',
    worldIdx: 0,
    score: 0,
    highScores: [],
    powers: [],
    powerIdx: 0,
    pwrCd: 0,
    pwrActiveUntil: 0,
    pwrType: null,
    shield: 0,
    lives: 3,
    pInvulnUntil: 0,
    escaping: false,
    nameEntry: { letters: [], row: 0, col: 0, mvCd: 0, lastV: { x: 0, y: 0 } }
  };
  buildTextures(s);
  buildEnvironment(s);
  buildEntities(s);
  buildHud(s);
  buildModals(s);
  setupInput(s);
  loadScores().then(sc => { s.st.highScores = sc; }).catch(() => { s.st.highScores = []; });
  showTitle(s);
}

// ----------------------------------------------------------------------------
// TEXTURES (Authentic Out Run Rear View Sprites)
// ----------------------------------------------------------------------------
function buildTextures(s) {
  // 1. HACKER MOTO (Rear Chase View)
  const mG = s.make.graphics({ x: 0, y: 0, add: false });
  // Shadow
  mG.fillStyle(0x000000, 0.4);
  mG.fillEllipse(32, 68, 52, 14);
  // Wide rear slick tire
  mG.fillStyle(0x181818);
  mG.fillRoundedRect(20, 48, 24, 22, 6);
  mG.fillStyle(0x282828);
  mG.fillRoundedRect(24, 52, 16, 14, 4);
  mG.lineStyle(2, 0x00f0ff, 0.8);
  mG.strokeRoundedRect(20, 48, 24, 22, 6);
  // Twin exhaust pipes spitting nitro
  mG.fillStyle(0x555555);
  mG.fillRect(12, 54, 7, 14);
  mG.fillRect(45, 54, 7, 14);
  mG.fillStyle(0x00f0ff);
  mG.fillRect(13, 64, 5, 8);
  mG.fillRect(46, 64, 5, 8);
  // Bike body / chassis (neon cyber blue)
  mG.fillStyle(0x09224c);
  mG.fillRoundedRect(16, 26, 32, 28, 6);
  mG.fillStyle(0x0e3a7a);
  mG.fillRoundedRect(19, 29, 26, 20, 4);
  // Red tail light
  mG.fillStyle(0xff0044);
  mG.fillRoundedRect(22, 44, 20, 6, 2);
  mG.fillStyle(0xff88a0);
  mG.fillRect(26, 45, 12, 3);
  // Rider shoulders / leather hacker jacket
  mG.fillStyle(0x141e2e);
  mG.fillRoundedRect(10, 16, 44, 18, 5);
  // Cyber crest on jacket
  mG.fillStyle(0x00f0ff);
  mG.fillRect(29, 20, 6, 8);
  // Helmet (rear view)
  mG.fillStyle(0xffffff);
  mG.fillCircle(32, 14, 11);
  mG.fillStyle(0x0f172a);
  mG.fillCircle(32, 14, 8);
  // Cyan visor glow reflection
  mG.fillStyle(0x00f0ff, 0.9);
  mG.fillRoundedRect(24, 8, 16, 5, 2);
  mG.generateTexture('moto', 64, 76);
  mG.destroy();

  // 2. CRIMINAL ARMORED CAR (Rear Chase View)
  const cG = s.make.graphics({ x: 0, y: 0, add: false });
  // Shadow
  cG.fillStyle(0x000000, 0.45);
  cG.fillEllipse(44, 76, 80, 16);
  // Dual wide rear tires
  cG.fillStyle(0x121212);
  cG.fillRoundedRect(4, 50, 18, 26, 4);
  cG.fillRoundedRect(66, 50, 18, 26, 4);
  cG.fillStyle(0xff0044, 0.7);
  cG.fillCircle(13, 63, 5);
  cG.fillCircle(75, 63, 5);
  // Rear bumper & diffuser
  cG.fillStyle(0x1c050c);
  cG.fillRoundedRect(12, 52, 64, 22, 5);
  cG.fillStyle(0x350816);
  cG.fillRoundedRect(16, 55, 56, 15, 3);
  // Aggressive rear spoiler wing
  cG.fillStyle(0x6b0922);
  cG.fillRect(6, 28, 76, 8);
  cG.fillStyle(0xff0044);
  cG.fillRect(8, 29, 72, 3);
  // Spoiler struts
  cG.fillStyle(0x222222);
  cG.fillRect(22, 36, 6, 16);
  cG.fillRect(60, 36, 6, 16);
  // Main chassis / cabin
  cG.fillStyle(0x2b0612);
  cG.fillRoundedRect(18, 14, 52, 42, 6);
  // Rear armored window with glitch skull / cross
  cG.fillStyle(0x091424);
  cG.fillRoundedRect(24, 18, 40, 20, 3);
  cG.lineStyle(2, 0xff0044, 0.9);
  cG.lineBetween(36, 22, 52, 34);
  cG.lineBetween(52, 22, 36, 34);
  // Roof turret
  cG.fillStyle(0x111111);
  cG.fillCircle(44, 12, 7);
  cG.fillStyle(0xff0044);
  cG.fillRect(42, 4, 4, 8);
  // Aggressive rear tail lights
  cG.fillStyle(0xff0033);
  cG.fillRoundedRect(16, 45, 18, 7, 2);
  cG.fillRoundedRect(54, 45, 18, 7, 2);
  cG.fillStyle(0xff99aa);
  cG.fillRect(18, 47, 14, 3);
  cG.fillRect(56, 47, 14, 3);
  // Heavy dual exhausts
  cG.fillStyle(0x444444);
  cG.fillRect(28, 68, 8, 8);
  cG.fillRect(52, 68, 8, 8);
  cG.fillStyle(0xff6600);
  cG.fillRect(29, 72, 6, 6);
  cG.fillRect(53, 72, 6, 6);
  cG.generateTexture('bcar', 88, 84);
  cG.destroy();

  // 3. LASER & MISSILE SPRITES
  const lG = s.make.graphics({ x: 0, y: 0, add: false });
  lG.fillStyle(0x00f0ff);
  lG.fillRoundedRect(0, 0, 6, 22, 3);
  lG.fillStyle(0xffffff, 0.9);
  lG.fillRect(1, 2, 4, 8);
  lG.generateTexture('plaser', 6, 22);
  lG.destroy();

  // Enemy bullet
  const eG = s.make.graphics({ x: 0, y: 0, add: false });
  eG.fillStyle(0xff0044);
  eG.fillCircle(8, 8, 8);
  eG.fillStyle(0xff6600);
  eG.fillCircle(8, 8, 5);
  eG.fillStyle(0xffffff);
  eG.fillCircle(8, 8, 2);
  eG.generateTexture('emis', 16, 16);
  eG.destroy();

  // Sniper laser
  const snG = s.make.graphics({ x: 0, y: 0, add: false });
  snG.fillStyle(0xff6600);
  snG.fillRoundedRect(0, 0, 6, 18, 3);
  snG.fillStyle(0xffcc00);
  snG.fillRect(1, 1, 4, 8);
  snG.generateTexture('snipe', 6, 18);
  snG.destroy();

  // Shield bubble
  const shG = s.make.graphics({ x: 0, y: 0, add: false });
  shG.lineStyle(4, 0x00f0ff, 1);
  shG.strokeCircle(48, 48, 44);
  shG.lineStyle(2, 0xffffff, 0.7);
  shG.strokeCircle(48, 48, 38);
  shG.fillStyle(0x00f0ff, 0.15);
  shG.fillCircle(48, 48, 44);
  shG.generateTexture('bsh', 96, 96);
  shG.destroy();

  // Pothole obstacle
  const hG = s.make.graphics({ x: 0, y: 0, add: false });
  hG.fillStyle(0x04060c);
  hG.fillEllipse(22, 14, 38, 20);
  hG.lineStyle(2, 0xff0044, 0.8);
  hG.strokeEllipse(22, 14, 38, 20);
  hG.fillStyle(0xff0044, 0.3);
  hG.fillEllipse(22, 14, 24, 10);
  hG.generateTexture('hole', 44, 28);
  hG.destroy();

  // Traffic car: Encava Bus (rear view)
  const bG = s.make.graphics({ x: 0, y: 0, add: false });
  bG.fillStyle(0x000000, 0.4);
  bG.fillEllipse(30, 68, 54, 12);
  bG.fillStyle(0xf1f5f9);
  bG.fillRoundedRect(6, 6, 48, 60, 6);
  // Venezuelan stripes on rear
  bG.fillStyle(0xfacc15);
  bG.fillRect(6, 38, 48, 6);
  bG.fillStyle(0x2563eb);
  bG.fillRect(6, 44, 48, 6);
  bG.fillStyle(0xdc2626);
  bG.fillRect(6, 50, 48, 6);
  // Rear glass
  bG.fillStyle(0x0f172a);
  bG.fillRoundedRect(10, 10, 40, 22, 4);
  bG.fillStyle(0x38bdf8, 0.3);
  bG.fillRect(12, 12, 36, 18);
  // Tail lights
  bG.fillStyle(0xff0000);
  bG.fillRect(8, 58, 6, 6);
  bG.fillRect(46, 58, 6, 6);
  bG.generateTexture('encava', 60, 72);
  bG.destroy();

  // Kapso Drone
  const kG = s.make.graphics({ x: 0, y: 0, add: false });
  kG.fillStyle(0x25d366);
  kG.fillCircle(14, 14, 12);
  kG.fillStyle(0xffffff);
  kG.fillCircle(14, 14, 5);
  kG.lineStyle(2, 0x00ff88);
  kG.strokeCircle(14, 14, 12);
  kG.fillStyle(0x25d366, 0.6);
  kG.fillRect(0, 12, 28, 4);
  kG.fillRect(12, 0, 4, 28);
  kG.generateTexture('kdrone', 28, 28);
  kG.destroy();
}

// ----------------------------------------------------------------------------
// ENVIRONMENT (Caracas Skylines & Pseudo-3D Perspective Road)
// ----------------------------------------------------------------------------
function buildEnvironment(s) {
  // Sky background
  s.skyBg = s.add.rectangle(GW / 2, GH / 2, GW, GH, 0x07152d);
  // Landmarks graphics (above horizon)
  s.bgLm = s.add.graphics();
  // Road & roadside graphics
  s.roadG = s.add.graphics();
  s._roadOff = 0;

  // Roadside scrolling elements (billboards & lampposts)
  s.scenery = [];
  for (let i = 0; i < 6; i++) {
    s.scenery.push({
      side: i % 2 === 0 ? -1 : 1, // -1=left, 1=right
      z: (i / 6),                 // 0 = horizon, 1 = camera
      type: i % 3 === 0 ? 'sponsor' : 'post'
    });
  }
  s.sceneryG = s.add.graphics();

  // Cable car wire & cabin for Humboldt
  s.cableG = s.add.graphics();

  // Speed particles (sparks / road wind)
  s.ptcls = [];
  for (let i = 0; i < 24; i++) {
    s.ptcls.push({
      x: rnd(0, GW),
      y: rnd(HORIZON_Y, GH),
      sp: rnd(6, 14),
      sz: rnd(1, 3),
      alpha: Phaser.Math.FloatBetween(0.2, 0.6)
    });
  }
  s.ptclG = s.add.graphics();

  // Central alert / escape banner
  s.banner = s.add.text(GW / 2, 280, '', {
    fontFamily: FF,
    fontSize: '18px',
    color: '#ffd200',
    backgroundColor: '#040914dd',
    padding: { x: 24, y: 12 },
    fontStyle: 'bold',
    align: 'center',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5).setVisible(false).setDepth(100);

  // Boss shield sprite
  s.bossShieldSpr = s.add.sprite(400, 320, 'bsh').setVisible(false).setDepth(7);

  // Player shield aura
  s.playerShieldSpr = s.add.sprite(400, 510, 'bsh').setVisible(false).setScale(0.8).setDepth(6);

  // Dedicated graphics for smoke, sparks, and explosion particles
  s.smokeG = s.add.graphics().setDepth(7);
  s.smokeParticles = [];

  // Speed streaks graphics (Nitro & high velocity)
  s.speedLinesG = s.add.graphics().setDepth(14);

  // CRT Scanlines retro arcade overlay
  s.crtG = s.add.graphics().setDepth(25);
  s.crtG.fillStyle(0x000000, 0.055);
  for (let y = 0; y < GH; y += 4) {
    s.crtG.fillRect(0, y, GW, 2);
  }
}

// ----------------------------------------------------------------------------
// ENTITIES
// ----------------------------------------------------------------------------
function buildEntities(s) {
  // Player Motorcycle (positioned at bottom of the road)
  s.player = s.physics.add.sprite(400, 510, 'moto').setDepth(8);
  s.player.setCollideWorldBounds(true);
  s.player.body.setSize(38, 54).setOffset(13, 10);
  s.pSpeed = 330;
  s.pShootCd = 0;

  // Criminal Car (positioned on the road ahead of player: Y = 320)
  s.boss = s.physics.add.sprite(400, 320, 'bcar').setDepth(6);
  s.boss.body.setSize(60, 58).setOffset(14, 12);
  s.bDir = 1;
  s.bAtkCd = 0;
  s.bHp = 20;
  s.bMaxHp = 20;
  s.bShieldHp = 0;
  s.bPhaseTimer = 0;
  s.bCurrentPhase = 'strafe';
  s.bPhaseIdx = 0;

  // Kapso Companion Drone
  s.kdrone = s.add.sprite(350, 510, 'kdrone').setVisible(false).setDepth(9);
  s.kdroneShootCd = 0;

  s.pLasers = s.physics.add.group();
  s.eLasers = s.physics.add.group();
  s.obstacles = s.physics.add.group();

  s.physics.add.overlap(s.pLasers, s.boss, onLaserHitBoss, null, s);
  s.physics.add.overlap(s.pLasers, s.obstacles, onLaserHitObs, null, s);
  s.physics.add.overlap(s.player, s.obstacles, onPlayerHitObs, null, s);
  s.physics.add.overlap(s.player, s.boss, onPlayerHitBoss, null, s);
  s.physics.add.overlap(s.player, s.eLasers, onPlayerHitELaser, null, s);
  s.motoHpG = s.add.graphics().setDepth(12);
}

// ----------------------------------------------------------------------------
// HUD & PROGRESS ROUTE (Linea Superior)
// ----------------------------------------------------------------------------
function buildHud(s) {
  s.hud = {};

  // Top HUD Bar
  s.hud.topBar = s.add.rectangle(GW / 2, 34, GW, 68, 0x030814, 0.96).setDepth(15);
  s.hud.topBar.setStrokeStyle(1, 0x1e3a5f, 1);

  // Player 1 Status (Left side)
  s.hud.playerLabel = s.add.text(14, 8, 'HACKER ETICO [MOTO]', {
    fontFamily: FF, fontSize: '11px', color: '#00f0ff', fontStyle: 'bold'
  }).setDepth(16);

  s.hud.playerBarBg = s.add.rectangle(14, 25, 170, 10, 0x111111).setOrigin(0, 0.5).setDepth(16);
  s.hud.playerBarBg.setStrokeStyle(1, 0x00f0ff, 0.7);
  s.hud.playerBarFg = s.add.rectangle(14, 25, 170, 10, 0x00f0ff).setOrigin(0, 0.5).setDepth(17);
  s.hud.playerBarSh = s.add.rectangle(14, 25, 0, 10, 0x00e5a3).setOrigin(0, 0.5).setDepth(18);

  s.hud.playerHpTxt = s.add.text(14, 36, 'BLINDAJE: 100% [|||]', {
    fontFamily: FF, fontSize: '10px', color: '#00f0ff', fontStyle: 'bold'
  }).setDepth(16);

  s.hud.score = s.add.text(14, 49, 'SCORE: 000000', {
    fontFamily: FF, fontSize: '11px', color: '#94a3b8'
  }).setDepth(16);

  // Sector title & World Name (Center of Top Bar)
  s.hud.sector = s.add.text(GW / 2, 7, 'MUNDO 1/7', {
    fontFamily: FF, fontSize: '10px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5, 0).setDepth(16);

  s.hud.worldName = s.add.text(GW / 2, 20, 'AUTOPISTA FAJARDO', {
    fontFamily: FF, fontSize: '13px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5, 0).setDepth(16);

  // Boss HP & Phase Text (Right side)
  s.hud.bossLabel = s.add.text(GW - 14, 8, 'CIBERDELINCUENTE', {
    fontFamily: FF, fontSize: '11px', color: '#ff0044', fontStyle: 'bold'
  }).setOrigin(1, 0).setDepth(16);

  s.hud.bossBarBg = s.add.rectangle(GW - 184, 25, 170, 10, 0x111111).setOrigin(0, 0.5).setDepth(16);
  s.hud.bossBarBg.setStrokeStyle(1, 0xff0044, 0.7);
  s.hud.bossBarFg = s.add.rectangle(GW - 184, 25, 170, 10, 0xff0044).setOrigin(0, 0.5).setDepth(17);
  s.hud.bossBarSh = s.add.rectangle(GW - 184, 25, 0, 10, 0x00f0ff).setOrigin(0, 0.5).setDepth(18);

  s.hud.phaseText = s.add.text(GW - 14, 36, 'PERSIGUIENDO', {
    fontFamily: FF, fontSize: '10px', color: '#ff4466', fontStyle: 'bold'
  }).setOrigin(1, 0).setDepth(16);

  s.hud.bossHpTxt = s.add.text(GW - 14, 49, 'AUTO: 100% HP', {
    fontFamily: FF, fontSize: '10px', color: '#94a3b8'
  }).setOrigin(1, 0).setDepth(16);

  // GPS Route Line (Center of Top Bar, beneath World Name)
  s.hud.routeG = s.add.graphics().setDepth(16);
  s.hud.routeNodes = [];
  const sx = 210, stepX = 63, ly = 43;
  for (let i = 0; i < WORLDS.length; i++) {
    const nx = sx + i * stepX;
    const txt = s.add.text(nx, ly + 9, WORLDS[i].short, {
      fontFamily: FF, fontSize: '8px', color: '#4a6080', align: 'center'
    }).setOrigin(0.5).setDepth(16);
    s.hud.routeNodes.push({ x: nx, y: ly, text: txt });
  }

  // Player & Criminal markers on the route line
  s.hud.motoMark = s.add.text(sx, ly - 8, '[M]', {
    fontFamily: FF, fontSize: '9px', color: '#00f0ff', fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(19);

  s.hud.carMark = s.add.text(sx + 32, ly - 8, '[X]', {
    fontFamily: FF, fontSize: '9px', color: '#ff0044', fontStyle: 'bold'
  }).setOrigin(0.5).setDepth(19);

  // Bottom HUD Bar (Powers & Controls)
  s.hud.btmBar = s.add.rectangle(GW / 2, GH - 14, GW, 28, 0x030814, 0.95).setDepth(15);
  s.hud.btmBar.setStrokeStyle(1, 0x1e3a5f, 1);

  s.hud.livesText = s.add.text(12, GH - 22, 'VIDAS: ♥ ♥ ♥', {
    fontFamily: FF, fontSize: '12px', color: '#00f0ff', fontStyle: 'bold'
  }).setDepth(16);

  s.hud.pwrTxt = s.add.text(140, GH - 22, 'PODER: Bloqueado (Derrota al jefe)', {
    fontFamily: FF, fontSize: '11px', color: '#ffd200'
  }).setDepth(16);

  s.hud.ctrlHint = s.add.text(GW - 12, GH - 22, '[B1 / Espacio]: Laser  |  [B2 / E]: Poder  |  [B3 / Q]: Cambiar', {
    fontFamily: FF, fontSize: '10px', color: '#7e93b0'
  }).setOrigin(1, 0).setDepth(16);
}

function refreshHud(s) {
  const wi = s.st.worldIdx;
  const w = WORLDS[wi] || WORLDS[0];

  s.hud.sector.setText('MUNDO ' + w.id + '/7').setColor(w.sHex);
  s.hud.worldName.setText(w.name).setColor(w.sHex);
  s.hud.score.setText('SCORE: ' + String(s.st.score).padStart(6, '0'));

  // Player HP Bar & Text
  const pL = Math.max(0, s.st.lives);
  const pPct = pL / 3;
  s.hud.playerBarFg.width = 170 * pPct;
  if (pL === 3) {
    s.hud.playerBarFg.setFillStyle(0x00f0ff);
    s.hud.playerHpTxt.setText('BLINDAJE: 100% [|||]').setColor('#00f0ff');
  } else if (pL === 2) {
    s.hud.playerBarFg.setFillStyle(0xffd200);
    s.hud.playerHpTxt.setText('BLINDAJE: 66% [|| ] AVISO').setColor('#ffd200');
  } else if (pL === 1) {
    const pulseCol = (Math.floor(s.time.now / 150) % 2 === 0) ? 0xff0044 : 0xff6600;
    s.hud.playerBarFg.setFillStyle(pulseCol);
    s.hud.playerHpTxt.setText('BLINDAJE: 33% [|  ] PELIGRO!').setColor('#ff0044');
  } else {
    s.hud.playerBarFg.width = 0;
    s.hud.playerHpTxt.setText('BLINDAJE: 0% [   ] DESTRUIDA').setColor('#888888');
  }
  s.hud.playerBarSh.width = s.st.shield > 0 ? 170 : 0;
  if (s.st.shield > 0) {
    s.hud.playerHpTxt.setText('BLINDAJE: [ESCUDO ACTIVO]').setColor('#00e5a3');
  }

  // Floating moto health pips above player
  if (s.motoHpG) {
    s.motoHpG.clear();
    if (s.player && s.player.visible && s.player.active && s.st.phase === 'playing') {
      const mx = s.player.x;
      const my = s.player.y - 44;
      s.motoHpG.fillStyle(0x030814, 0.85);
      s.motoHpG.fillRoundedRect(mx - 24, my - 5, 48, 10, 3);
      s.motoHpG.lineStyle(1, 0x00f0ff, 0.7);
      s.motoHpG.strokeRoundedRect(mx - 24, my - 5, 48, 10, 3);
      for (let i = 0; i < 3; i++) {
        const bx = mx - 17 + i * 13;
        if (i < pL) {
          const col = pL === 3 ? 0x00f0ff : pL === 2 ? 0xffd200 : 0xff0044;
          s.motoHpG.fillStyle(col, 1);
          s.motoHpG.fillRect(bx, my - 2, 9, 4);
        } else {
          s.motoHpG.fillStyle(0x222d3d, 0.8);
          s.motoHpG.fillRect(bx, my - 2, 9, 4);
        }
      }
    }
  }

  // Boss HP Bar
  const hpPct = Phaser.Math.Clamp(s.bHp / s.bMaxHp, 0, 1);
  s.hud.bossBarFg.width = 170 * hpPct;
  const shPct = s.bShieldHp > 0 ? Phaser.Math.Clamp(s.bShieldHp / 15, 0, 1) : 0;
  s.hud.bossBarSh.width = 170 * shPct;
  s.hud.bossHpTxt.setText('AUTO: ' + Math.max(0, s.bHp) + '/' + s.bMaxHp + ' HP');

  const phNames = { strafe:'PERSIGUIENDO', shoot:'DISPARANDO', spread:'RAFAGA VIRAL', shield:'ESCUDO', burst:'TRIPLE', snipe:'SNIPER', rain:'LLUVIA', charge:'CARGA!' };
  s.hud.phaseText.setText(phNames[s.bCurrentPhase] || s.bCurrentPhase);

  // Lives
  let lTxt = 'VIDAS: ' + ('♥ '.repeat(pL)).trim();
  if (s.st.shield > 0) lTxt += ' [+ESCUDO]';
  s.hud.livesText.setText(lTxt).setColor(pL >= 3 ? '#00f0ff' : pL === 2 ? '#ffd200' : '#ff0055');

  // Route Line Drawing
  const g = s.hud.routeG;
  g.clear();
  const sx = 210, stepX = 63, ly = 43;
  // Background track
  g.lineStyle(3, 0x1e2e48, 1);
  g.lineBetween(sx, ly, sx + 6 * stepX, ly);

  // Completed path
  const cx = sx + wi * stepX;
  g.lineStyle(3, w.sColor, 0.9);
  g.lineBetween(sx, ly, cx, ly);

  // Milestone nodes
  for (let i = 0; i < WORLDS.length; i++) {
    const nd = s.hud.routeNodes[i];
    if (i < wi) {
      g.fillStyle(0x00ff88, 1);
      g.fillCircle(nd.x, nd.y, 4);
      nd.text.setColor('#00ff88');
    } else if (i === wi) {
      g.fillStyle(w.sColor, 1);
      g.fillCircle(nd.x, nd.y, 6);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(nd.x, nd.y, 8);
      nd.text.setColor(w.sHex);
    } else {
      g.fillStyle(0x283548, 1);
      g.fillCircle(nd.x, nd.y, 3);
      nd.text.setColor('#4a6080');
    }
  }

  // Smooth tracker markers
  s.hud.motoMark.x = cx;
  s.hud.carMark.x = Math.min(cx + 36, sx + 6 * stepX);

  // Bottom Sponsor Power Display
  if (s.st.powers.length === 0) {
    s.hud.pwrTxt.setText('PODER: Bloqueado (Derrota al jefe)');
    s.hud.pwrTxt.setColor('#ffd200');
  } else {
    const p = s.st.powers[s.st.powerIdx];
    const rdy = s.time.now >= s.st.pwrCd;
    const status = rdy ? '[LISTO: B2 / E]' : '[RECARGA...]';
    s.hud.pwrTxt.setText('[' + p.sponsor + ': ' + p.power + '] ' + status);
    s.hud.pwrTxt.setColor(rdy ? p.sHex : '#607890');
  }
}

// ----------------------------------------------------------------------------
// MODALS (Title, Sponsor Unlock, Grand Finale Victory, Game Over)
// ----------------------------------------------------------------------------
function buildModals(s) {
  s.mods = {};

  // 1. TITLE SCREEN
  const tc = s.add.container(0, 0).setDepth(30);
  const tbg = s.add.rectangle(GW / 2, GH / 2, 780, 560, 0x030814, 0.98).setStrokeStyle(3, 0x00f0ff, 1);
  const tTop = s.add.rectangle(GW / 2, 60, 780, 56, 0x061836, 1);
  const tHdr = s.add.text(GW / 2, 42, 'PLATANUS HACK 26: CARACAS EDITION', {
    fontFamily: FF, fontSize: '17px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);

  const tTit = s.add.text(GW / 2, 116, 'CYBER-CARACAS\nHACKER CHASE', {
    fontFamily: FF, fontSize: '38px', color: '#00f0ff',
    align: 'center', fontStyle: 'bold', stroke: '#002244', strokeThickness: 4
  }).setOrigin(0.5);

  const tStBox = s.add.rectangle(GW / 2, 245, 710, 120, 0x08172c, 0.92).setStrokeStyle(1, 0x1d3a60);
  const tSt = s.add.text(GW / 2, 245,
    '¡El Ciberdelincuente huye por Caracas! Persiguelo por 7 sectores reales:\n\n' +
    'Autopista Fajardo * Sabana Grande * Las Mercedes * Parque Central\n' +
    'Tunel Boqueron * Datacenter * El Avila / Hotel Humboldt', {
      fontFamily: FF, fontSize: '12px', color: '#b8d0ee', align: 'center', lineSpacing: 4
    }).setOrigin(0.5);

  const tSpBox = s.add.rectangle(GW / 2, 332, 710, 42, 0x061122, 0.92).setStrokeStyle(1, 0x1d3050);
  const tSp = s.add.text(GW / 2, 332,
    'SPONSORS: YUMMY * CASHEA * KAPSO * ELEVENLABS * VERCEL * RENDER * ANTHROPIC', {
      fontFamily: FF, fontSize: '11px', color: '#ffd200', fontStyle: 'bold'
    }).setOrigin(0.5);

  const tWarn = s.add.text(GW / 2, 385,
    'El delincuente lanza virus, minas y activa escudos. Derrotalo para adquirir el poder de cada sponsor!', {
      fontFamily: FF, fontSize: '11px', color: '#ff9900', align: 'center'
    }).setOrigin(0.5);

  const tPrmt = s.add.text(GW / 2, 442, '>> PRESIONA [ENTER / START] PARA JUGAR <<', {
    fontFamily: FF, fontSize: '18px', color: '#00ff88', fontStyle: 'bold'
  }).setOrigin(0.5);
  s.tweens.add({ targets: tPrmt, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 });

  const tCtrl = s.add.text(GW / 2, 498,
    'ARCADE: Palanca: Mover | B1: Laser | B2: Poder | B3: Cambiar | START: Jugar\n(PC: WASD/Flechas | Espacio: Laser | E: Poder | Q: Cambiar)', {
      fontFamily: FF, fontSize: '10px', color: '#7ea2ce', align: 'center'
    }).setOrigin(0.5);

  tc.add([tbg, tTop, tHdr, tTit, tStBox, tSt, tSpBox, tSp, tWarn, tPrmt, tCtrl]);
  s.mods.title = tc;

  // 2. WORLD COMPLETE & SPONSOR POWER UNLOCKED
  const wc = s.add.container(0, 0).setVisible(false).setDepth(30);
  const wcBg = s.add.rectangle(GW / 2, GH / 2, 740, 520, 0x020712, 0.98).setStrokeStyle(3, 0xffd200, 1);
  const wcTop = s.add.rectangle(GW / 2, 88, 740, 76, 0x061f14, 1);
  const wcTit = s.add.text(GW / 2, 78, '[!] SECTOR CARACAS ASEGURADO [!]', {
    fontFamily: FF, fontSize: '24px', color: '#00ff88', fontStyle: 'bold'
  }).setOrigin(0.5);
  const wcSub = s.add.text(GW / 2, 108, 'El Ciberdelincuente huye al siguiente sector...', {
    fontFamily: FF, fontSize: '12px', color: '#6ee7b7'
  }).setOrigin(0.5);

  const wcCard = s.add.rectangle(GW / 2, 255, 680, 195, 0x07152b, 1).setStrokeStyle(2, 0xffd200, 0.9);
  const wcSpTxt = s.add.text(GW / 2, 185, '!PODER ADQUIRIDO GRACIAS A YUMMY!', {
    fontFamily: FF, fontSize: '22px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);

  const wcPn = s.add.text(GW / 2, 230, 'TURBO BOOST 200cc', {
    fontFamily: FF, fontSize: '26px', color: '#00f0ff', fontStyle: 'bold'
  }).setOrigin(0.5);

  const wcPd = s.add.text(GW / 2, 275, 'Descripcion del poder adquirido', {
    fontFamily: FF, fontSize: '13px', color: '#b0d0f0', align: 'center', wordWrap: { width: 600 }
  }).setOrigin(0.5);

  const wcInst = s.add.text(GW / 2, 320, '¡Poder instalado en tu moto! Activalo durante la carrera con [B2 / E].', {
    fontFamily: FF, fontSize: '11px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);

  const wcPwrLbl = s.add.text(GW / 2, 380, 'ARSENAL DE SPONSORS DESBLOQUEADOS:', {
    fontFamily: FF, fontSize: '11px', color: '#7a8fa8', fontStyle: 'bold'
  }).setOrigin(0.5);

  const wcPwrList = s.add.text(GW / 2, 405, '', {
    fontFamily: FF, fontSize: '12px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);

  const wcPrmt = s.add.text(GW / 2, 460, '>> PRESIONA [ENTER / START] PARA CONTINUAR <<', {
    fontFamily: FF, fontSize: '16px', color: '#00ff88', fontStyle: 'bold'
  }).setOrigin(0.5);
  s.tweens.add({ targets: wcPrmt, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });

  wc.add([wcBg, wcTop, wcTit, wcSub, wcCard, wcSpTxt, wcPn, wcPd, wcInst, wcPwrLbl, wcPwrList, wcPrmt]);
  s.mods.wc = { cont: wc, sp: wcSpTxt, pn: wcPn, pd: wcPd, bg: wcBg, pwrList: wcPwrList };

  // 3. VICTORY GRAND FINALE
  const vc = s.add.container(0, 0).setVisible(false).setDepth(30);
  const vBg = s.add.rectangle(GW / 2, GH / 2, 770, 560, 0x020610, 0.99).setStrokeStyle(4, 0xffd200, 1);
  const vTop = s.add.rectangle(GW / 2, 55, 770, 68, 0x1c1202, 1);
  const vTit = s.add.text(GW / 2, 44, '*** CARACAS SALVADA - VICTORIA TOTAL ***', {
    fontFamily: FF, fontSize: '25px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);
  const vSub = s.add.text(GW / 2, 72, 'EL CIBERDELINCUENTE HA SIDO ARRESTADO EN EL HOTEL HUMBOLDT!', {
    fontFamily: FF, fontSize: '11px', color: '#00ff88'
  }).setOrigin(0.5);

  // Prominent Sponsor Appreciation
  const vTkBox = s.add.rectangle(GW / 2, 175, 730, 136, 0x07152b, 0.98).setStrokeStyle(2, 0x00f0ff, 0.8);
  const vTk = s.add.text(GW / 2, 175,
    '¡UN ENORME AGRADECIMIENTO A PLATANUS HACK 26: CARACAS!\n' +
    'Y A TODOS LOS EXTRAORDINARIOS SPONSORS:\n\n' +
    '  ANTHROPIC * YUMMY * CASHEA * ELEVENLABS * KAPSO * VERCEL * RENDER  \n\n' +
    '  ¡GRACIAS POR IMPULSAR EL TALENTO Y LA TECNOLOGIA EN VENEZUELA!  ', {
      fontFamily: FF, fontSize: '12px', color: '#c4ddff', align: 'center', fontStyle: 'bold', lineSpacing: 4
    }).setOrigin(0.5);

  const vSc = s.add.text(GW / 2, 275, 'PUNTAJE FINAL: 000000', {
    fontFamily: FF, fontSize: '20px', color: '#00f0ff', fontStyle: 'bold'
  }).setOrigin(0.5);

  const vNl = s.add.text(GW / 2, 310, 'INGRESA TUS INICIALES PARA EL RECORD ARCADE:', {
    fontFamily: FF, fontSize: '12px', color: '#ffd200'
  }).setOrigin(0.5);

  const vNv = s.add.text(GW / 2, 342, '_ _ _', {
    fontFamily: FF, fontSize: '26px', color: '#ffffff', fontStyle: 'bold'
  }).setOrigin(0.5);

  // Letter selection grid
  const gl = [];
  const gsx = 228, gsy = 390;
  for (let r = 0; r < LETTER_GRID.length; r++) {
    for (let c = 0; c < LETTER_GRID[r].length; c++) {
      const val = LETTER_GRID[r][c];
      const cw = val.length > 1 ? 56 : 36;
      const gx = gsx + c * 50;
      const gy = gsy + r * 25;
      const cell = s.add.rectangle(gx, gy, cw, 20, 0x09172c).setStrokeStyle(1, 0x1d3a5e);
      const lbl = s.add.text(gx, gy, val, {
        fontFamily: FF, fontSize: '11px', color: '#88a6cb'
      }).setOrigin(0.5);
      gl.push({ row: r, col: c, cell, lbl, v: val });
    }
  }

  const vSt = s.add.text(GW / 2, 520, 'Palanca / Flechas: Mover  |  ESPACIO / ENTER: Seleccionar Letra', {
    fontFamily: FF, fontSize: '11px', color: '#4a6080'
  }).setOrigin(0.5);

  vc.add([vBg, vTop, vTit, vSub, vTkBox, vTk, vSc, vNl, vNv, vSt]);
  for (const it of gl) vc.add([it.cell, it.lbl]);
  s.mods.vic = { cont: vc, sc: vSc, nv: vNv, st: vSt, gl };

  // 4. GAME OVER
  const gc = s.add.container(0, 0).setVisible(false).setDepth(30);
  const gBg = s.add.rectangle(GW / 2, GH / 2, 640, 360, 0x0d0208, 0.98).setStrokeStyle(3, 0xff0044, 1);
  const gTop = s.add.rectangle(GW / 2, 150, 640, 70, 0x1c000a, 1);
  const gTit = s.add.text(GW / 2, 142, '[!] MOTO DESTRUIDA [!]', {
    fontFamily: FF, fontSize: '28px', color: '#ff0055', fontStyle: 'bold'
  }).setOrigin(0.5);
  const gSub = s.add.text(GW / 2, 210, 'El Ciberdelincuente escapo con la base de datos de Caracas...', {
    fontFamily: FF, fontSize: '13px', color: '#b08090'
  }).setOrigin(0.5);
  const gPrm = s.add.text(GW / 2, 280, '>> PRESIONA [ENTER / START] PARA REINTENTAR <<', {
    fontFamily: FF, fontSize: '16px', color: '#ffd200', fontStyle: 'bold'
  }).setOrigin(0.5);
  s.tweens.add({ targets: gPrm, alpha: 0.25, duration: 550, yoyo: true, repeat: -1 });

  gc.add([gBg, gTop, gTit, gSub, gPrm]);
  s.mods.go = gc;
}

// ----------------------------------------------------------------------------
// INPUT
// ----------------------------------------------------------------------------
function setupInput(s) {
  s.ctrl = { held: {}, pressed: {} };
  s.input.keyboard.on('keydown', ev => {
    const list = KB2ARC[normKey(ev.key)];
    if (list) {
      for (const c of list) {
        if (!s.ctrl.held[c]) s.ctrl.pressed[c] = true;
        s.ctrl.held[c] = true;
      }
    }
  });
  s.input.keyboard.on('keyup', ev => {
    const list = KB2ARC[normKey(ev.key)];
    if (list) {
      for (const c of list) s.ctrl.held[c] = false;
    }
  });
}
function held(s, c) { return s.ctrl.held[c] === true; }
function consume(s, c) {
  if (s.ctrl.pressed[c]) { s.ctrl.pressed[c] = false; return true; }
  return false;
}
function normKey(k) {
  if (!k || k.length === 0) return '';
  if (k === ' ') return 'space';
  return k.toLowerCase();
}

// ----------------------------------------------------------------------------
// STATE MANAGEMENT & WORLD TRANSITIONS
// ----------------------------------------------------------------------------
function showTitle(s) {
  s.st.phase = 'title';
  s.mods.title.setVisible(true);
  s.mods.wc.cont.setVisible(false);
  s.mods.vic.cont.setVisible(false);
  s.mods.go.setVisible(false);
  s.player.setVisible(false);
  s.boss.setVisible(false);
  s.banner.setVisible(false);
  s.bossShieldSpr.setVisible(false);
  s.playerShieldSpr.setVisible(false);
  if (s.motoHpG) s.motoHpG.clear();
}

function startGame(s) {
  s.st.phase = 'playing';
  s.st.worldIdx = 0;
  s.st.score = 0;
  s.st.lives = 3;
  s.st.pInvulnUntil = 0;
  s.st.powers = [];
  s.st.powerIdx = 0;
  s.st.pwrCd = 0;
  s.st.shield = 0;
  s.st.escaping = false;
  s.st.pwrType = null;
  s.st.pwrActiveUntil = 0;

  s.mods.title.setVisible(false);
  s.mods.wc.cont.setVisible(false);
  s.mods.vic.cont.setVisible(false);
  s.mods.go.setVisible(false);
  s.banner.setVisible(false);

  s.player.setVisible(true).setPosition(400, 510).setScale(1.2).clearTint().setAngle(0);
  s.boss.setVisible(true);
  loadWorld(s, 0);
  snd('warp');
}

function loadWorld(s, idx) {
  if (idx >= WORLDS.length) {
    triggerGrandFinale(s);
    return;
  }
  s.st.worldIdx = idx;
  s.st.escaping = false;
  const w = WORLDS[idx];

  s.mods.wc.cont.setVisible(false);
  s.mods.go.setVisible(false);
  s.skyBg.setFillStyle(w.sky);
  renderLandmark(s, w);

  s.banner.setVisible(false);

  s.bMaxHp = w.bossHp;
  s.bHp = w.bossHp;
  s.bShieldHp = 0;
  s.bDir = 1;
  s.bAtkCd = 0;
  s.bPhaseTimer = 0;
  s.bCurrentPhase = w.bossPhases[0];
  s.bPhaseIdx = 0;

  // Boss placed ON THE ROAD ahead of player
  s.boss.setPosition(400, 320).setVelocity(0, 0).setVisible(true).clearTint().setScale(1.1).setAngle(0);
  s.bossShieldSpr.setVisible(false);

  s.obstacles.clear(true, true);
  s.pLasers.clear(true, true);
  s.eLasers.clear(true, true);

  const hasK = s.st.powers.some(p => p.sponsor === 'KAPSO');
  s.kdrone.setVisible(hasK);
  refreshHud(s);
}

// ----------------------------------------------------------------------------
// MAIN GAME LOOP
// ----------------------------------------------------------------------------
function update(time, delta) {
  const s = this;
  if (s.st.phase !== 'playing') {
    updateEngineAudio(s, 0, false);
  }
  if (s.st.phase === 'title') {
    if (consume(s, 'START1') || consume(s, 'P1_1')) { snd('select'); startGame(s); }
    return;
  }
  if (s.st.phase === 'world_complete') {
    if (consume(s, 'START1') || consume(s, 'P1_1') || consume(s, 'P1_2')) {
      snd('select');
      s.mods.wc.cont.setVisible(false);
      s.st.phase = 'playing';
      loadWorld(s, s.st.worldIdx + 1);
    }
    return;
  }
  if (s.st.phase === 'game_won') {
    handleNameEntry(s, time);
    return;
  }
  if (s.st.phase === 'game_over') {
    if (consume(s, 'START1') || consume(s, 'P1_1')) { snd('select'); startGame(s); }
    return;
  }
  if (s.st.phase === 'playing') {
    updateRoad(s, delta, time);
    movePlayer(s, delta, time);
    moveBoss(s, delta, time);
    updateKapsoDrone(s, time);
    updateSmoke(s, delta);

    const isMovingY = held(s, 'P1_U') || held(s, 'P1_D');
    updateEngineAudio(s, isMovingY ? 0.9 : 0.4, s.st.pwrType === 'YUMMY');

    // Continuous smoke billowing if boss has taken damage
    if (s.boss && s.boss.active && !s.st.escaping) {
      const dmgRatio = 1 - (s.bHp / s.bMaxHp);
      if (dmgRatio > 0.2) {
        // Light grey engine smoke
        if (Math.random() < 0.38) {
          spawnSmoke(s, s.boss.x + rnd(-14, 14), s.boss.y + 14, 0x555555, 1, false);
        }
      }
      if (dmgRatio > 0.5) {
        // Thick charcoal smoke + fiery embers
        spawnSmoke(s, s.boss.x + rnd(-12, 12), s.boss.y + 16, 0x181818, 1, true);
        if (Math.random() < 0.35) {
          s.smokeParticles.push({
            x: s.boss.x + rnd(-8, 8),
            y: s.boss.y + 18,
            vx: rnd(-30, 30),
            vy: rnd(50, 110),
            size: 3,
            growth: -2,
            alpha: 1,
            decay: 3.0,
            color: Math.random() < 0.5 ? 0xff4400 : 0xffaa00,
            isSpark: true
          });
        }
      }
    }

    cleanEntities(s);
    refreshHud(s);
  }
}

// ----------------------------------------------------------------------------
// AUTHENTIC OUT RUN PSEUDO-3D ROAD SYSTEM
// ----------------------------------------------------------------------------
function updateRoad(s, delta, time) {
  const w = WORLDS[s.st.worldIdx] || WORLDS[0];
  const spd = (w.speed * delta) / 1000;
  s._roadOff = (s._roadOff + spd * 50) % 100;
  const g = s.roadG;
  g.clear();

  // 1. Draw Ground sides (grass, city pavement, or tunnel rock)
  g.fillStyle(w.ground, 1);
  g.fillRect(0, HORIZON_Y, GW, GH - HORIZON_Y);

  // Roadside terrain styling
  if (w.type === 'boulevard') {
    g.fillStyle(0x352b45, 0.45);
    for (let gy = HORIZON_Y + 4; gy < GH; gy += 16) {
      g.fillRect(0, gy, 110, 8);
      g.fillRect(GW - 110, gy, 110, 8);
    }
  } else if (w.type === 'datacenter') {
    g.lineStyle(1, 0x46e3b7, 0.35);
    for (let gy = HORIZON_Y + 12; gy < GH; gy += 24) {
      g.lineBetween(0, gy, 95, gy);
      g.lineBetween(GW - 95, gy, GW, gy);
    }
  }

  // 2. Draw 3D road strips (curving trapezoids with perspective)
  const strips = 26;
  for (let i = 0; i < strips; i++) {
    const t0 = i / strips;
    const t1 = (i + 1) / strips;

    // Quadratic perspective projection
    const y0 = HORIZON_Y + (t0 * t0) * (GH - HORIZON_Y);
    const y1 = HORIZON_Y + (t1 * t1) * (GH - HORIZON_Y);

    const rw0 = ROAD_TW + t0 * (ROAD_BW - ROAD_TW);
    const rw1 = ROAD_TW + t1 * (ROAD_BW - ROAD_TW);

    const lx0 = (GW - rw0) / 2;
    const lx1 = (GW - rw1) / 2;
    const rx0 = (GW + rw0) / 2;
    const rx1 = (GW + rw1) / 2;

    // Alternating asphalt shade
    const segOff = Math.floor((s._roadOff / 100 * strips + i)) % 6;
    let rCol = w.road;
    if (segOff < 3) {
      const c = Phaser.Display.Color.IntegerToColor(w.road);
      rCol = Phaser.Display.Color.GetColor(
        Math.min(c.red + 18, 255),
        Math.min(c.green + 18, 255),
        Math.min(c.blue + 22, 255)
      );
    }

    // Road polygon
    g.fillStyle(rCol, 1);
    g.fillPoints([{ x: lx0, y: y0 }, { x: rx0, y: y0 }, { x: rx1, y: y1 }, { x: lx1, y: y1 }], true);

    // Rumble strips (red / white alternating on trapezoid edges)
    const rumbleW0 = 6 + t0 * 16;
    const rumbleW1 = 6 + t1 * 16;
    const rmbCol = (segOff < 3) ? 0xef4444 : 0xffffff;
    g.fillStyle(rmbCol, 0.9);
    // Left rumble strip
    g.fillPoints([
      { x: lx0 - rumbleW0, y: y0 },
      { x: lx0, y: y0 },
      { x: lx1, y: y1 },
      { x: lx1 - rumbleW1, y: y1 }
    ], true);
    // Right rumble strip
    g.fillPoints([
      { x: rx0, y: y0 },
      { x: rx0 + rumbleW0, y: y0 },
      { x: rx1 + rumbleW1, y: y1 },
      { x: rx1, y: y1 }
    ], true);

    // Dashed center lane lines
    if (i > 3 && segOff < 3) {
      const lw = 1.5 + t0 * 3.5;
      g.fillStyle(0xffffff, 0.6);
      const lane1X0 = lx0 + rw0 * 0.33;
      const lane1X1 = lx1 + rw1 * 0.33;
      const lane2X0 = lx0 + rw0 * 0.67;
      const lane2X1 = lx1 + rw1 * 0.67;
      g.fillPoints([
        { x: lane1X0 - lw / 2, y: y0 }, { x: lane1X0 + lw / 2, y: y0 },
        { x: lane1X1 + lw / 2, y: y1 }, { x: lane1X1 - lw / 2, y: y1 }
      ], true);
      g.fillPoints([
        { x: lane2X0 - lw / 2, y: y0 }, { x: lane2X0 + lw / 2, y: y0 },
        { x: lane2X1 + lw / 2, y: y1 }, { x: lane2X1 - lw / 2, y: y1 }
      ], true);
    }
  }

  // 3. Roadside elements (street lamps & sponsor cyber signs scrolling towards camera)
  const scG = s.sceneryG;
  scG.clear();
  for (const obj of s.scenery) {
    obj.z += spd * 0.0035;
    if (obj.z > 1) {
      obj.z = 0;
      obj.side = Math.random() < 0.5 ? -1 : 1;
    }
    const t = obj.z;
    const y = HORIZON_Y + (t * t) * (GH - HORIZON_Y);
    const rw = ROAD_TW + t * (ROAD_BW - ROAD_TW);
    const edgeX = (GW / 2) + obj.side * (rw / 2 + 18 + t * 45);
    const scale = 0.3 + t * 1.0;

    if (obj.type === 'post') {
      // Cyber street lamp
      scG.fillStyle(0x475569, 0.9);
      scG.fillRect(edgeX - 2 * scale, y - 60 * scale, 4 * scale, 60 * scale);
      // Glowing lamp arm
      scG.fillStyle(w.sColor, 0.85);
      scG.fillRect(edgeX + (obj.side > 0 ? -12 : 0) * scale, y - 64 * scale, 12 * scale, 4 * scale);
      scG.fillCircle(edgeX + (obj.side > 0 ? -12 : 12) * scale, y - 62 * scale, 5 * scale);
    } else {
      // Sponsor cyber billboard
      const bw = 55 * scale;
      const bh = 32 * scale;
      scG.fillStyle(0x0f172a, 0.95);
      scG.fillRect(edgeX - bw / 2, y - bh - 24 * scale, bw, bh);
      scG.lineStyle(Math.max(1, 2 * scale), w.sColor, 1);
      scG.strokeRect(edgeX - bw / 2, y - bh - 24 * scale, bw, bh);
      // Billboard post
      scG.fillStyle(0x334155);
      scG.fillRect(edgeX - 3 * scale, y - 24 * scale, 6 * scale, 24 * scale);
      // Glow light
      scG.fillStyle(w.sColor, 0.8);
      scG.fillRect(edgeX - bw / 2 + 4 * scale, y - bh - 20 * scale, bw - 8 * scale, 6 * scale);
    }
  }

  // Humboldt Cable Car
  if (w.type === 'humboldt') {
    s.cableG.clear();
    s.cableG.lineStyle(2, 0x94a3b8, 0.7);
    s.cableG.lineBetween(0, 110, GW, 185);
    const tx = Phaser.Math.Wrap(time * 0.05, 0, GW);
    const ty = 110 + (tx / GW) * 75;
    s.cableG.fillStyle(0xef4444, 1);
    s.cableG.fillRoundedRect(tx - 12, ty, 24, 16, 3);
    s.cableG.fillStyle(0x38bdf8, 0.9);
    s.cableG.fillRect(tx - 9, ty + 3, 18, 8);
  } else {
    s.cableG.clear();
  }

  // Speed particles
  s.ptclG.clear();
  for (const p of s.ptcls) {
    p.y += p.sp + spd * 14;
    if (p.y > GH) {
      p.y = HORIZON_Y + 4;
      p.x = rnd(GW / 2 - ROAD_TW / 2, GW / 2 + ROAD_TW / 2);
    }
    s.ptclG.fillStyle(w.sColor, p.alpha);
    s.ptclG.fillRect(p.x, p.y, p.sz, p.sz * 4);
  }

  // Speed streaks graphics (Turbo & high speed)
  if (s.speedLinesG) {
    s.speedLinesG.clear();
    const isTurbo = s.st.pwrType === 'YUMMY';
    if (isTurbo || (s.st.phase === 'playing' && w.id >= 5)) {
      s.speedLinesG.lineStyle(isTurbo ? 3 : 2, isTurbo ? 0xffd200 : w.sColor, isTurbo ? 0.75 : 0.35);
      for (let i = 0; i < 8; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const ly = HORIZON_Y + 15 + ((time * 0.45 + i * 45) % (GH - HORIZON_Y - 20));
        const len = 35 + i * 8;
        const lx = (GW / 2) + side * (ROAD_TW / 2 + ((ly - HORIZON_Y) / (GH - HORIZON_Y)) * 280);
        s.speedLinesG.lineBetween(lx, ly, lx + side * len, ly + 15);
      }
    }
  }
}

// ----------------------------------------------------------------------------
// CARACAS LANDMARKS (Rendered authentically above Horizon)
// ----------------------------------------------------------------------------
function renderLandmark(s, w) {
  const g = s.bgLm;
  g.clear();

  // 1. DYNAMIC SYNTHWAVE / DUSK SKY GRADIENT (All open-air worlds)
  if (w.type !== 'tunnel' && w.type !== 'datacenter') {
    const skyBands = [
      { y: 0, h: 45, c: 0x050918 },
      { y: 45, h: 45, c: 0x110d29 },
      { y: 90, h: 45, c: 0x22103a },
      { y: 135, h: 45, c: 0x361642 },
      { y: 180, h: 45, c: 0x4d1e42 }
    ];
    for (const b of skyBands) {
      g.fillStyle(b.c, 1);
      g.fillRect(0, b.y, GW, b.h);
    }
    // Horizon glow reflection tinted with sponsor color & sunset gold
    g.fillStyle(w.sColor, 0.18);
    g.fillRect(0, HORIZON_Y - 45, GW, 45);
    g.fillStyle(0xffa500, 0.12);
    g.fillRect(0, HORIZON_Y - 18, GW, 18);

    // Deep twinkling starfield with cross glints
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 73 + 19) % (GW - 24)) + 12;
      const sy = ((i * 31 + 11) % (HORIZON_Y - 95)) + 8;
      g.fillStyle(0xffffff, (i % 2 === 0) ? 0.95 : 0.65);
      g.fillRect(sx, sy, (i % 4 === 0) ? 2 : 1, (i % 4 === 0) ? 2 : 1);
      if (i % 6 === 0) {
        g.fillStyle(w.sColor, 0.65);
        g.fillRect(sx - 2, sy, 5, 1);
        g.fillRect(sx, sy - 2, 1, 5);
      }
    }
  }

  // 2. EL AVILA MOUNTAIN (Waraira Repano) - 2 Layers + Neon Rim + Radiant Cruz del Avila
  if (w.type === 'fajardo' || w.type === 'boulevard' || w.type === 'chacao' || w.type === 'parquecentral' || w.type === 'humboldt') {
    // Back High Ridge (Naiguata, Silla, Oriental)
    g.fillStyle(0x0c1328, 1);
    g.beginPath();
    g.moveTo(0, HORIZON_Y);
    g.lineTo(0, 160);
    g.lineTo(120, 115); // Pico Naiguata (2765m)
    g.lineTo(230, 145);
    g.lineTo(390, 80);  // Silla de Caracas (2630m)
    g.lineTo(460, 112);
    g.lineTo(580, 92);  // Pico Oriental (2640m)
    g.lineTo(700, 138);
    g.lineTo(800, 150);
    g.lineTo(800, HORIZON_Y);
    g.closePath();
    g.fillPath();

    // Foreground Foothill Slopes (Mountainous mass & depth)
    g.fillStyle(0x060b17, 1);
    g.beginPath();
    g.moveTo(0, HORIZON_Y);
    g.lineTo(0, 175);
    g.lineTo(160, 142);
    g.lineTo(320, 165);
    g.lineTo(490, 135);
    g.lineTo(650, 158);
    g.lineTo(800, 168);
    g.lineTo(800, HORIZON_Y);
    g.closePath();
    g.fillPath();

    // Mountain Crest Neon Rim Lighting (Cover Synthwave Look)
    g.lineStyle(2, w.sColor, 0.85);
    g.beginPath();
    g.moveTo(0, 160);
    g.lineTo(120, 115);
    g.lineTo(230, 145);
    g.lineTo(390, 80);
    g.lineTo(460, 112);
    g.lineTo(580, 92);
    g.lineTo(700, 138);
    g.lineTo(800, 150);
    g.strokePath();

    // LA CRUZ DEL AVILA (Radiant golden beacon atop Silla peak x=390)
    g.fillStyle(0xfff59d, 0.18);
    g.fillCircle(390, 75, 26);
    g.fillStyle(0xfde047, 0.38);
    g.fillCircle(390, 75, 14);
    g.fillStyle(0xffffff, 1);
    g.fillRect(388, 64, 4, 22);
    g.fillRect(381, 71, 18, 4);
    g.lineStyle(1, 0xfde047, 0.4);
    g.lineBetween(390, 52, 390, 98);
    g.lineBetween(368, 75, 412, 75);

    // Radio Transmission Towers with red blinking beacons
    g.fillStyle(0x94a3b8, 0.9);
    g.fillRect(120, 96, 2, 19);
    g.fillRect(580, 74, 2, 18);
    g.fillStyle(0xff0044, 1);
    g.fillCircle(121, 95, 3.5);
    g.fillCircle(581, 73, 3.5);
  }

  // 3. CARACAS DENSE CITY SKYLINE (Multilevel Skyscrapers with Neon Windows)
  if (w.type === 'fajardo' || w.type === 'boulevard' || w.type === 'chacao' || w.type === 'parquecentral') {
    for (let i = 0; i < 20; i++) {
      const bx = i * 40 + 2;
      const bw = 34 + (i % 3) * 3;
      const bh = 54 + ((i * 17) % 42);
      const by = HORIZON_Y - bh;

      g.fillStyle(0x091222, 0.96);
      g.fillRect(bx, by, bw, bh);
      g.lineStyle(1, 0x1a2942, 0.8);
      g.strokeRect(bx, by, bw, bh);

      // Lit neon windows matrix (Amber, Cyan, Magenta)
      for (let wy = by + 6; wy < HORIZON_Y - 6; wy += 8) {
        for (let wx = bx + 4; wx < bx + bw - 4; wx += 6) {
          if (((wx * 11 + wy * 7 + i) % 7) > 2) {
            const wc = (wx + wy) % 5 === 0 ? 0x00f0ff : (i % 2 === 0 ? 0xffea75 : 0xff3b94);
            g.fillStyle(wc, 0.85);
            g.fillRect(wx, wy, 3, 3.5);
          }
        }
      }
      if (i % 2 === 0) {
        g.fillStyle(w.sColor, 0.9);
        g.fillRect(bx + 3, by - 2, bw - 6, 2);
      }
    }
  }

  // 4. AUTHENTIC SECTOR LANDMARKS (Matching User Photos)
  if (w.type === 'fajardo') {
    // La Esfera de Soto (Iconic orange kinetic sphere on Autopista Fajardo)
    const ex = 685, ey = 172;
    g.fillStyle(0xff6600, 0.25);
    g.fillCircle(ex, ey, 28);
    g.lineStyle(2, 0xff7700, 0.95);
    g.strokeCircle(ex, ey, 25);
    g.strokeCircle(ex, ey, 17);
    g.strokeCircle(ex, ey, 9);
    for (let a = -21; a <= 21; a += 7) {
      g.lineBetween(ex - 23, ey + a, ex + 23, ey + a);
    }
    g.lineStyle(1, 0x94a3b8, 0.7);
    g.lineBetween(ex, ey - 30, ex, 105);
    g.lineBetween(ex - 24, ey + 25, ex - 12, HORIZON_Y);
    g.lineBetween(ex + 24, ey + 25, ex + 12, HORIZON_Y);

    // Highway Gantry Billboard: VEPACO / YUMMY (From Fajardo photo)
    const bbX = 85, bbY = 138;
    g.fillStyle(0x0f1f38, 1);
    g.fillRect(bbX, bbY, 82, 34);
    g.lineStyle(2, 0xffd200, 1);
    g.strokeRect(bbX, bbY, 82, 34);
    g.fillStyle(0x64748b, 1);
    g.fillRect(bbX + 16, bbY + 34, 4, HORIZON_Y - (bbY + 34));
    g.fillRect(bbX + 62, bbY + 34, 4, HORIZON_Y - (bbY + 34));
    g.fillStyle(0xffd200, 1);
    g.fillRect(bbX + 8, bbY + 8, 66, 8);
    g.fillStyle(0x00f0ff, 1);
    g.fillRect(bbX + 12, bbY + 20, 58, 6);
  }

  if (w.type === 'boulevard') {
    // Torre La Previsora (Pyramid glass tower with giant circular clock)
    const px = 110, py = 42;
    g.fillStyle(0x0d1c33, 1);
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px + 48, HORIZON_Y);
    g.lineTo(px - 48, HORIZON_Y);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x00e5a3, 0.95);
    g.strokePath();

    // Giant Illuminated Clock Face
    g.fillStyle(0xfff59d, 1);
    g.fillCircle(px, py + 52, 16);
    g.fillStyle(0x030814, 1);
    g.fillCircle(px, py + 52, 13);
    g.fillStyle(0xffffff, 1);
    g.fillRect(px - 1, py + 42, 2, 11);
    g.fillRect(px - 1, py + 52, 8, 2);
    g.fillStyle(0xff0055, 1);
    g.fillCircle(px, py - 3, 4);

    // Boulevard Cafe Parasols (From Sabana Grande photo)
    const umbrellas = [240, 290, 560, 620];
    for (const ux of umbrellas) {
      g.fillStyle(0xffffff, 0.95);
      g.fillTriangle(ux, 192, ux - 15, 204, ux + 15, 204);
      g.fillStyle(0x64748b, 1);
      g.fillRect(ux - 1, 204, 2, HORIZON_Y - 204);
    }
  }

  if (w.type === 'chacao') {
    // Plaza Alfredo Sadel Monument (Tripod canopy with flying saucer deck from photo)
    const ax = 400, ay = 148;
    g.lineStyle(4, 0x94a3b8, 1);
    g.lineBetween(320, HORIZON_Y, ax - 25, ay);
    g.lineBetween(480, HORIZON_Y, ax + 25, ay);
    g.lineBetween(ax + 85, HORIZON_Y, ax + 10, ay - 35);
    g.fillStyle(0x334155, 1);
    g.fillEllipse(ax, ay, 135, 24);
    g.lineStyle(3, 0x25d366, 1);
    g.strokeEllipse(ax, ay, 135, 24);
    g.lineStyle(1, 0xffffff, 0.8);
    for (let r = ax - 55; r <= ax + 55; r += 11) {
      g.lineBetween(r, ay - 8, r, ay);
    }
    g.lineStyle(2, 0xe2e8f0, 1);
    g.lineBetween(ax + 10, ay - 35, ax + 55, 45);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(ax + 56, 43, 4);
  }

  if (w.type === 'parquecentral') {
    // Giant Full Moon (From Parque Central photo)
    g.fillStyle(0xfffbeb, 0.2);
    g.fillCircle(125, 62, 36);
    g.fillStyle(0xfffbeb, 0.95);
    g.fillCircle(125, 62, 24);
    g.fillStyle(0xe2e8f0, 0.7);
    g.fillCircle(120, 58, 6);
    g.fillCircle(132, 68, 5);

    // Twin Towers of Parque Central (225m brutalist octagonal skyscrapers)
    const tws = [220, 530];
    for (const tx of tws) {
      g.fillStyle(0x101a29, 1);
      g.fillRect(tx, 32, 76, HORIZON_Y - 32);
      g.lineStyle(2, 0x64748b, 1);
      g.strokeRect(tx, 32, 76, HORIZON_Y - 32);

      g.fillStyle(0xffd200, 0.9);
      for (let wy = 42; wy < HORIZON_Y - 8; wy += 10) {
        g.fillRect(tx + 8, wy, 15, 5);
        g.fillRect(tx + 30, wy, 16, 5);
        g.fillRect(tx + 53, wy, 15, 5);
      }
      g.fillStyle(0xcccccc, 1);
      g.fillRect(tx + 36, 8, 4, 24);
      g.fillStyle(0xff0044, 1);
      g.fillCircle(tx + 38, 7, 4.5);
    }
  }

  if (w.type === 'tunnel') {
    // Green lush mountain slopes framing the tunnel (From Boqueron photo)
    g.fillStyle(0x0a2416, 1);
    g.fillRect(0, 0, GW, HORIZON_Y);
    g.fillStyle(0x133822, 1);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(300, 0); g.lineTo(150, 75); g.lineTo(0, 75); g.fillPath();
    g.beginPath();
    g.moveTo(500, 0); g.lineTo(800, 0); g.lineTo(800, 75); g.lineTo(650, 75); g.fillPath();

    // Massive Concrete Portal Facade (Túnel Boquerón 1)
    g.fillStyle(0x94a3b8, 1);
    g.fillRect(140, 70, 520, HORIZON_Y - 70);
    g.lineStyle(4, 0x475569, 1);
    g.strokeRect(140, 70, 520, HORIZON_Y - 70);

    // Embossed header "BOQUERON - 1 -"
    g.fillStyle(0x0f172a, 1);
    g.fillRect(250, 88, 300, 28);
    g.lineStyle(2, 0x00f0ff, 1);
    g.strokeRect(250, 88, 300, 28);

    // Tricolor Venezuelan Flag on parapet
    const fx = 385, fy = 48;
    g.fillStyle(0xffcc00, 1); g.fillRect(fx, fy, 30, 6);
    g.fillStyle(0x003399, 1); g.fillRect(fx, fy + 6, 30, 6);
    g.fillStyle(0xcc0000, 1); g.fillRect(fx, fy + 12, 30, 6);

    // Dark Tunnel Entrance with Yellow/Black Safety Chevrons
    g.fillStyle(0x020408, 1);
    g.fillRoundedRect(190, 126, 420, HORIZON_Y - 126, 18);
    g.lineStyle(5, 0xfacc15, 1);
    g.strokeRoundedRect(190, 126, 420, HORIZON_Y - 126, 18);

    // Traffic lane lights (Green arrows / Red Xs)
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(280, 120, 5);
    g.fillCircle(520, 120, 5);
    g.fillStyle(0xef4444, 1);
    g.fillCircle(400, 120, 5);

    // Sodium overhead strip lamps inside tunnel
    g.fillStyle(0xf59e0b, 0.95);
    for (let x = 230; x <= 570; x += 42) {
      g.fillRect(x, 132, 16, 5);
    }
  }

  if (w.type === 'datacenter') {
    // Cyber Datacenter (From Nube de Servidores photo)
    g.fillStyle(0x020812, 1);
    g.fillRect(0, 0, GW, HORIZON_Y);

    // Flanking Giant Server Racks with Blinking LEDs
    const racks = [0, 590];
    for (const rx of racks) {
      g.fillStyle(0x071526, 1);
      g.fillRect(rx, 0, 210, HORIZON_Y);
      for (let y = 6; y < HORIZON_Y; y += 16) {
        g.fillStyle(0x0c223c, 1);
        g.fillRect(rx + 8, y, 194, 11);
        g.fillStyle(0x22c55e, 1);
        g.fillCircle(rx + 22, y + 5.5, 3);
        g.fillCircle(rx + 34, y + 5.5, 3);
        g.fillStyle(0x00f0ff, 0.9);
        g.fillRect(rx + 50, y + 3, 75, 5);
      }
    }
    // Overhead Cable Trays
    g.lineStyle(2, 0x334155, 1);
    for (let y = 15; y < 75; y += 18) {
      g.lineBetween(210, y, 590, y);
    }
    // Glowing Neon Circuit Map of Venezuela at horizon (From Datacenter photo)
    g.lineStyle(2, 0x46e3b7, 0.85);
    g.beginPath();
    g.moveTo(320, 175);
    g.lineTo(370, 135);
    g.lineTo(440, 135);
    g.lineTo(490, 155);
    g.lineTo(470, 205);
    g.lineTo(410, 215);
    g.lineTo(350, 200);
    g.closePath();
    g.strokePath();
    const nodes = [[370, 135], [440, 135], [490, 155], [410, 175], [350, 200]];
    for (const [nx, ny] of nodes) {
      g.fillStyle(0x00ff88, 1);
      g.fillCircle(nx, ny, 3.5);
    }
  }

  if (w.type === 'humboldt') {
    // Summit view above rolling clouds (From Humboldt photo)
    g.fillStyle(0x160815, 1);
    g.fillRect(0, 0, GW, HORIZON_Y);

    g.fillStyle(0x200b20, 1);
    g.beginPath();
    g.moveTo(0, HORIZON_Y);
    g.lineTo(150, 140);
    g.lineTo(400, 88);
    g.lineTo(650, 140);
    g.lineTo(800, HORIZON_Y);
    g.closePath();
    g.fillPath();

    // Rolling Sunset Cloud Sea (Fluffy billows hugging slopes)
    g.fillStyle(0xfae8ff, 0.35);
    for (let cx = 30; cx <= 770; cx += 60) {
      g.fillCircle(cx, 165 + ((cx * 7) % 18), 38);
    }
    g.fillStyle(0xf3e8ff, 0.55);
    for (let cx = 10; cx <= 790; cx += 50) {
      g.fillCircle(cx, 185 + ((cx * 5) % 15), 32);
    }

    // Hotel Humboldt Circular Glass Tower (From photo)
    const hx = 400, hy = 24;
    g.fillStyle(0x38bdf8, 0.95);
    g.fillRect(hx - 15, hy, 30, 78);
    g.lineStyle(2, 0x0284c7, 1);
    g.strokeRect(hx - 15, hy, 30, 78);
    for (let y = hy + 6; y < hy + 76; y += 7) {
      g.lineBetween(hx - 15, y, hx + 15, y);
    }
    g.fillStyle(0xf59e0b, 1);
    g.fillEllipse(hx, hy + 24, 52, 14);
    g.lineStyle(2, 0xffffff, 1);
    g.strokeEllipse(hx, hy + 24, 52, 14);

    g.lineStyle(2, 0xe2e8f0, 1);
    g.lineBetween(hx, hy, hx, hy - 14);
    g.fillStyle(0xff0044, 1);
    g.fillCircle(hx, hy - 15, 4);

    // Blazing Cruz del Avila beside the hotel
    g.fillStyle(0xfff59d, 0.4);
    g.fillCircle(hx + 110, 82, 22);
    g.fillStyle(0xffffff, 1);
    g.fillRect(hx + 108, 72, 4, 20);
    g.fillRect(hx + 102, 78, 16, 4);
  }
}

// ----------------------------------------------------------------------------
// PLAYER CONTROLS & SPONSOR POWERS
// ----------------------------------------------------------------------------
function movePlayer(s, delta, time) {
  let vx = 0, vy = 0;
  if (!s.st.escaping) {
    if (held(s, 'P1_L')) vx -= s.pSpeed;
    if (held(s, 'P1_R')) vx += s.pSpeed;
    if (held(s, 'P1_U')) vy -= s.pSpeed * 0.6;
    if (held(s, 'P1_D')) vy += s.pSpeed * 0.6;
  } else {
    vy = -600;
  }
  s.player.setVelocity(vx, vy);
  s.player.setAngle(vx < 0 ? -12 : vx > 0 ? 12 : 0);

  // Keep player on the road trapezoid
  const py = s.player.y;
  const t = Phaser.Math.Clamp((py - HORIZON_Y) / (GH - HORIZON_Y), 0, 1);
  const halfW = (ROAD_TW + t * (ROAD_BW - ROAD_TW)) / 2;
  const minX = (GW / 2) - halfW + 30;
  const maxX = (GW / 2) + halfW - 30;

  if (s.player.x < minX) s.player.x = minX;
  if (s.player.x > maxX) s.player.x = maxX;
  if (s.player.y < 420) s.player.y = 420;
  if (s.player.y > GH - 36) s.player.y = GH - 36;

  // Tire skid SFX on sharp turns
  if (Math.abs(vx) > 0 && Math.random() < 0.05 && (!s._lastSkid || time > s._lastSkid + 380)) {
    snd('skid');
    s._lastSkid = time;
    spawnSmoke(s, s.player.x + (vx > 0 ? -14 : 14), s.player.y + 26, 0x888888, 1, false);
  }

  // Player Shield Sprite follows player
  if (s.st.shield > 0) {
    s.playerShieldSpr.setVisible(true).setPosition(s.player.x, s.player.y);
    s.playerShieldSpr.setAlpha(0.6 + Math.sin(time / 200) * 0.3);
  } else {
    s.playerShieldSpr.setVisible(false);
  }

  // Laser Firing (B1 / B4 / ESPACIO / U / J)
  if (!s.st.escaping && (held(s, 'P1_1') || held(s, 'P1_4')) && time >= s.pShootCd) {
    firePlayerLaser(s);
    s.pShootCd = time + 140;
  }

  // Activate Sponsor Power (B2 / B5 / E / I / K)
  if (!s.st.escaping && (consume(s, 'P1_2') || consume(s, 'P1_5'))) {
    activateSponsorPower(s, time);
  }

  // Switch Active Power (B3 / B6 / Q / O / L)
  if ((consume(s, 'P1_3') || consume(s, 'P1_6')) && s.st.powers.length > 1) {
    s.st.powerIdx = (s.st.powerIdx + 1) % s.st.powers.length;
    snd('select');
  }

  // Reset timed powers
  if (s.st.pwrType && time > s.st.pwrActiveUntil) {
    if (s.st.pwrType === 'RENDER') s.player.setScale(1.2);
    s.st.pwrType = null;
  }
}

function firePlayerLaser(s) {
  // Dual laser bolts from bike
  const l1 = s.pLasers.create(s.player.x - 12, s.player.y - 24, 'plaser');
  const l2 = s.pLasers.create(s.player.x + 12, s.player.y - 24, 'plaser');
  l1.setVelocityY(-720);
  l2.setVelocityY(-720);
  l1.body.setSize(6, 22);
  l2.body.setSize(6, 22);
  snd('laser');
}

function activateSponsorPower(s, time) {
  if (s.st.powers.length === 0 || time < s.st.pwrCd) return;
  const p = s.st.powers[s.st.powerIdx];
  if (!p) return;

  s.st.pwrCd = time + 3000;
  snd('powerup');
  flashScreen(s, p.sColor, 120);

  if (p.sponsor === 'YUMMY') {
    // Turbo 200cc: Dash forward with shockwave & speed streaks
    s.st.pwrType = 'YUMMY';
    s.st.pwrActiveUntil = time + 1600;
    s.tweens.add({
      targets: s.player,
      y: s.player.y - 140,
      duration: 250,
      yoyo: true,
      ease: 'Quad.easeOut'
    });
    if (Math.abs(s.player.x - s.boss.x) < 140 && !s.st.escaping) {
      damageBoss(s, 8);
    }
    s.cameras.main.shake(200, 0.01);
  } else if (p.sponsor === 'CASHEA') {
    // Escudo Cuota Cero
    s.st.shield = 1;
    s.banner.setText('ESCUDO CASHEA ACTIVADO!').setVisible(true);
    s.time.delayedCall(1200, () => { s.banner.setVisible(false); });
  } else if (p.sponsor === 'KAPSO') {
    // API Shot: 5-way spread fan
    for (let i = -2; i <= 2; i++) {
      const l = s.pLasers.create(s.player.x + i * 16, s.player.y - 24, 'plaser');
      l.setVelocity(i * 120, -700);
    }
  } else if (p.sponsor === 'ELEVENLABS') {
    // Onda Sonica EMP: Wipes all bullets & stuns boss
    s.eLasers.clear(true, true);
    s.obstacles.clear(true, true);
    damageBoss(s, 6);
    s.bShieldHp = 0;
    s.bossShieldSpr.setVisible(false);
    s.cameras.main.shake(350, 0.015);
    snd('emp');
  } else if (p.sponsor === 'VERCEL') {
    // Edge Deploy Warp: Instant forward teleport
    s.player.y = Math.max(s.player.y - 160, 420);
    snd('warp');
    flashScreen(s, 0x00f0ff, 150);
  } else if (p.sponsor === 'RENDER') {
    // Auto-Scale Titan: Giant bike
    s.st.pwrType = 'RENDER';
    s.st.pwrActiveUntil = time + 5000;
    s.player.setScale(2.2);
    snd('titan');
    s.cameras.main.shake(250, 0.01);
  } else if (p.sponsor === 'ANTHROPIC') {
    // Claude AI Core: Hyper laser strike
    damageBoss(s, 22);
    s.cameras.main.shake(450, 0.02);
    flashScreen(s, 0xf59e0b, 200);
  }
}

function updateKapsoDrone(s, time) {
  if (!s.st.powers.some(p => p.sponsor === 'KAPSO')) {
    s.kdrone.setVisible(false);
    return;
  }
  s.kdrone.setVisible(true);
  s.kdrone.x = s.player.x - 38 + Math.sin(time / 180) * 14;
  s.kdrone.y = s.player.y - 10 + Math.cos(time / 180) * 14;

  if (!s.kdroneShootCd || time > s.kdroneShootCd) {
    s.kdroneShootCd = time + 480;
    const d = s.pLasers.create(s.kdrone.x, s.kdrone.y - 14, 'plaser');
    d.setScale(0.8).setVelocityY(-680);
  }
}

function flashScreen(s, color, dur) {
  const r = s.add.rectangle(GW / 2, GH / 2, GW, GH, color, 0.4).setDepth(45);
  s.tweens.add({ targets: r, alpha: 0, duration: dur, onComplete: () => r.destroy() });
}

// ----------------------------------------------------------------------------
// CRIMINAL BOSS AI & ROAD COMBAT
// ----------------------------------------------------------------------------
function moveBoss(s, delta, time) {
  if (s.st.escaping) return;
  const w = WORLDS[s.st.worldIdx] || WORLDS[0];
  const phases = w.bossPhases;

  // Rotate phases periodically
  if (time > s.bPhaseTimer) {
    s.bPhaseTimer = time + 5500;
    s.bPhaseIdx = (s.bPhaseIdx + 1) % phases.length;
    s.bCurrentPhase = phases[s.bPhaseIdx];
  }

  // Force harder phases at low HP
  const hpPct = s.bHp / s.bMaxHp;
  if (hpPct < 0.45 && phases.length >= 3) {
    s.bCurrentPhase = phases[Math.max(phases.length - 2, 1)];
  }
  if (hpPct < 0.2) {
    s.bCurrentPhase = phases[phases.length - 1];
  }

  // Lateral movement on the road
  const bspd = s.bCurrentPhase === 'charge' ? 320 : 185;
  s.boss.x += s.bDir * bspd * (delta / 1000);

  // Road trapezoid constraints at Y = 320
  const t = (320 - HORIZON_Y) / (GH - HORIZON_Y);
  const halfW = (ROAD_TW + t * (ROAD_BW - ROAD_TW)) / 2;
  const minX = (GW / 2) - halfW + 35;
  const maxX = (GW / 2) + halfW - 35;

  if (s.boss.x > maxX) { s.boss.x = maxX; s.bDir = -1; }
  if (s.boss.x < minX) { s.boss.x = minX; s.bDir = 1; }

  // Charge behavior
  if (s.bCurrentPhase === 'charge') {
    s.boss.y += 110 * (delta / 1000);
    if (s.boss.y > 380) s.boss.y = 380;
  } else {
    if (s.boss.y > 320) s.boss.y -= 70 * (delta / 1000);
    if (s.boss.y < 300) s.boss.y = 300;
  }

  // Shield Phase
  if (s.bCurrentPhase === 'shield' && s.bShieldHp <= 0) {
    s.bShieldHp = 14;
    s.bossShieldSpr.setVisible(true);
  }
  if (s.bShieldHp > 0) {
    s.bossShieldSpr.setPosition(s.boss.x, s.boss.y + 4).setAlpha(0.7 + Math.sin(time / 250) * 0.3);
  }

  // Attack timer
  const interval = Math.max(1200 - w.id * 80, 420);
  if (time >= s.bAtkCd) {
    s.bAtkCd = time + interval;
    bossAttack(s, w);
  }
}

function bossAttack(s, w) {
  const ph = s.bCurrentPhase;

  // Drop road obstacles behind the criminal car
  if (Math.random() < 0.45) {
    // Encava bus traffic or pothole
    if (Math.random() < 0.5) {
      const bus = s.obstacles.create(s.boss.x, s.boss.y + 45, 'encava');
      bus.body.setSize(48, 62);
      bus.setVelocityY(230 + w.id * 18);
    } else {
      const h = s.obstacles.create(s.boss.x + rnd(-40, 40), s.boss.y + 35, 'hole');
      h.body.setSize(38, 22);
      h.setVelocityY(260 + w.id * 18);
    }
  }

  // Weapon attacks
  if (ph === 'shoot' || ph === 'burst' || ph === 'snipe' || ph === 'rain' || ph === 'charge') {
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, 0, 320 + w.id * 16);
  }
  if (ph === 'spread') {
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, -90, 290 + w.id * 14);
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, 90, 290 + w.id * 14);
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, 0, 320 + w.id * 14);
  }
  if (ph === 'burst') {
    s.time.delayedCall(120, () => {
      if (s.bHp > 0 && !s.st.escaping) fireEnemyBullet(s, s.boss.x, s.boss.y + 25, -50, 310 + w.id * 14);
    });
    s.time.delayedCall(240, () => {
      if (s.bHp > 0 && !s.st.escaping) fireEnemyBullet(s, s.boss.x, s.boss.y + 25, 50, 310 + w.id * 14);
    });
  }
  if (ph === 'snipe') {
    const dx = s.player.x - s.boss.x;
    const dy = s.player.y - s.boss.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const sp = 400 + w.id * 18;
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, (dx / len) * sp, (dy / len) * sp, true);
  }
  if (ph === 'rain') {
    for (let i = 0; i < 3; i++) {
      s.time.delayedCall(i * 110, () => {
        if (s.bHp > 0 && !s.st.escaping) {
          const rx = rnd(260, 540);
          fireEnemyBullet(s, rx, s.boss.y + 20, rnd(-50, 50), 320 + w.id * 14);
        }
      });
    }
  }
  if (ph === 'charge') {
    snd('siren');
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, -40, 360 + w.id * 16);
    fireEnemyBullet(s, s.boss.x, s.boss.y + 25, 40, 360 + w.id * 16);
  }
}

function fireEnemyBullet(s, x, y, vx, vy, snipe) {
  const tex = snipe ? 'snipe' : 'emis';
  const m = s.eLasers.create(x, y, tex);
  m.body.setSize(snipe ? 6 : 14, snipe ? 14 : 14);
  m.setVelocity(vx, vy);
  snd('enemy');
}

// ----------------------------------------------------------------------------
// SMOKE, SPARK & EXPLOSION EFFECTS
// ----------------------------------------------------------------------------
function spawnSmoke(s, x, y, color, count, isThick) {
  for (let i = 0; i < count; i++) {
    s.smokeParticles.push({
      x: x + rnd(-14, 14),
      y: y + rnd(-6, 6),
      vx: rnd(-35, 35),
      vy: rnd(45, 115),
      size: isThick ? rnd(8, 16) : rnd(5, 9),
      growth: rnd(18, 28),
      alpha: isThick ? 0.85 : 0.6,
      decay: Phaser.Math.FloatBetween(0.8, 1.3),
      color: color || 0x222222,
      isSpark: false
    });
  }
}

function spawnHitFX(s, x, y) {
  // Orange / Yellow fiery sparks
  for (let i = 0; i < 6; i++) {
    s.smokeParticles.push({
      x: x + rnd(-6, 6),
      y: y + rnd(-6, 6),
      vx: rnd(-100, 100),
      vy: rnd(-50, 90),
      size: rnd(2, 4),
      growth: -2,
      alpha: 1.0,
      decay: 3.5,
      color: Math.random() < 0.5 ? 0xffea00 : 0xff3b00,
      isSpark: true
    });
  }
  // Smoke puff
  spawnSmoke(s, x, y, 0x444444, 2, false);
}

function updateSmoke(s, delta) {
  const g = s.smokeG;
  g.clear();
  const dt = delta / 1000;

  for (let i = s.smokeParticles.length - 1; i >= 0; i--) {
    const p = s.smokeParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.size += p.growth * dt;
    p.alpha -= p.decay * dt;

    if (p.alpha <= 0 || p.size <= 0) {
      s.smokeParticles.splice(i, 1);
      continue;
    }

    if (p.isSpark) {
      g.fillStyle(p.color, p.alpha);
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    } else {
      g.fillStyle(p.color, p.alpha);
      g.fillCircle(p.x, p.y, Math.max(1, p.size));
    }
  }
}

// ----------------------------------------------------------------------------
// COLLISIONS & DAMAGE
// ----------------------------------------------------------------------------
function onLaserHitBoss(a, b) {
  const s = this;
  if (!s || s.st.escaping) return;

  // Accurately separate laser from boss (prevent accidental boss destruction!)
  const laser = (a && a.texture && a.texture.key === 'plaser') ? a : (b && b.texture && b.texture.key === 'plaser') ? b : null;
  const boss = (laser === a) ? b : a;

  if (laser && laser.active) {
    spawnHitFX(s, laser.x, boss ? boss.y + 15 : laser.y);
    laser.destroy();
  }

  if (!boss || !boss.active) return;

  if (s.bShieldHp > 0) {
    s.bShieldHp -= 1;
    flashScreen(s, 0x00f0ff, 60);
    spawnSmoke(s, boss.x, boss.y, 0x00f0ff, 3, false);
    if (s.bShieldHp <= 0) {
      s.bossShieldSpr.setVisible(false);
      s.bCurrentPhase = 'shoot';
      flashScreen(s, 0xffffff, 200);
      spawnSmoke(s, boss.x, boss.y, 0xffffff, 8, true);
      snd('warp');
    }
    snd('hit');
    return;
  }

  damageBoss(s, 1);
  snd('hit');
}

function onLaserHitObs(a, b) {
  const s = this;
  const laser = (a && a.texture && a.texture.key === 'plaser') ? a : (b && b.texture && b.texture.key === 'plaser') ? b : null;
  const obs = (laser === a) ? b : a;
  if (laser && laser.active) {
    spawnHitFX(s, laser.x, laser.y);
    laser.destroy();
  }
  if (obs && obs.active) {
    spawnSmoke(s, obs.x, obs.y, 0x222222, 4, true);
    obs.destroy();
  }
  s.st.score += 50;
  snd('hit');
}

function onPlayerHitObs(a, b) {
  const s = this;
  if (!s || s.st.escaping) return;
  const obs = (a === s.player) ? b : a;
  if (obs && obs.active) {
    spawnSmoke(s, obs.x, obs.y, 0x222222, 6, true);
    obs.destroy();
  }
  playerDamage(s);
}

function onPlayerHitBoss(a, b) {
  const s = this;
  if (!s || s.st.escaping) return;
  if (s.st.pwrType === 'RENDER') {
    damageBoss(s, 10);
    return;
  }
  playerDamage(s);
}

function onPlayerHitELaser(a, b) {
  const s = this;
  if (!s || s.st.escaping) return;
  const emis = (a === s.player) ? b : a;
  if (emis && emis.active) {
    spawnHitFX(s, emis.x, emis.y);
    emis.destroy();
  }
  playerDamage(s);
}

function playerDamage(s) {
  if (s.st.phase !== 'playing' || s.st.escaping || s.st.pwrType === 'RENDER') return;
  if (s.st.pInvulnUntil && s.time.now < s.st.pInvulnUntil) return;
  if (s.st.shield > 0) {
    s.st.shield = 0;
    s.st.pInvulnUntil = s.time.now + 800;
    flashScreen(s, 0x00e5a3, 200);
    snd('warp');
    s.banner.setText('ESCUDO CASHEA: IMPACTO ABSORBIDO!').setVisible(true);
    s.time.delayedCall(1400, () => { s.banner.setVisible(false); });
    return;
  }

  s.st.lives--;
  s.st.pInvulnUntil = s.time.now + 1300;
  snd('boom');
  flashScreen(s, 0xff0044, 200);
  s.cameras.main.shake(200, 0.015);

  if (s.st.lives <= 0) {
    s.st.phase = 'game_over';
    s.mods.wc.cont.setVisible(false);
    s.mods.vic.cont.setVisible(false);
    s.mods.go.setVisible(true);
  } else {
    s.banner.setText('ALERTA: IMPACTO! QUEDAN ' + s.st.lives + ' VIDAS').setVisible(true);
    s.time.delayedCall(1200, () => { s.banner.setVisible(false); });
    s.player.setAlpha(0.25);
    s.tweens.add({ targets: s.player, alpha: 1, duration: 110, repeat: 6 });
  }
}

function damageBoss(s, amt) {
  if (s.st.escaping || !s.boss || !s.boss.active) return;
  s.bHp -= amt;
  s.st.score += 25 * amt;

  // Boss recoil shake on hit
  s.boss.x += rnd(-4, 4);

  // Red flash tint
  s.boss.setTint(0xff3344);
  s.time.delayedCall(80, () => {
    if (s.boss && s.boss.active) s.boss.clearTint();
  });

  // Always spawn smoke and sparks on hit!
  spawnHitFX(s, s.boss.x + rnd(-10, 10), s.boss.y + 15);
  spawnSmoke(s, s.boss.x, s.boss.y + 10, 0x222222, 2, true);

  if (s.bHp <= 0) onBossDefeated(s);
}

function cleanEntities(s) {
  s.pLasers.children.each(c => { if (c && c.y < HORIZON_Y - 20) c.destroy(); });
  [s.eLasers, s.obstacles].forEach(g => g.children.each(c => { if (c && (c.y > GH + 40 || c.x < -30 || c.x > GW + 30)) c.destroy(); }));
}

// ----------------------------------------------------------------------------
// BOSS DEFEAT, ESCAPE SEQUENCE & SPONSOR UNLOCK
// ----------------------------------------------------------------------------
function onBossDefeated(s) {
  if (s.st.phase !== 'playing' || s.st.escaping) return;
  s.st.escaping = true;
  const wi = s.st.worldIdx;
  const w = WORLDS[wi];

  snd('boom');
  s.st.score += 1500 * (wi + 1);
  s.cameras.main.shake(350, 0.02);
  s.bossShieldSpr.setVisible(false);
  s.bShieldHp = 0;
  s.eLasers.clear(true, true);
  s.obstacles.clear(true, true);
  s.player.setVelocity(0, 0);

  // Big explosion of smoke and fire at boss position!
  for (let i = 0; i < 18; i++) {
    spawnSmoke(s, s.boss.x + rnd(-25, 25), s.boss.y + rnd(-15, 15), 0x111111, 1, true);
    s.smokeParticles.push({
      x: s.boss.x + rnd(-20, 20),
      y: s.boss.y + rnd(-15, 15),
      vx: rnd(-120, 120),
      vy: rnd(-60, 120),
      size: rnd(3, 6),
      growth: -3,
      alpha: 1.0,
      decay: 2.0,
      color: Math.random() < 0.6 ? 0xff4400 : 0xffcc00,
      isSpark: true
    });
  }

  // Register unlocked sponsor power
  const already = s.st.powers.some(p => p.sponsor === w.sponsor);
  if (!already) {
    s.st.powers.push(w);
    s.st.powerIdx = s.st.powers.length - 1;
  }

  if (wi >= WORLDS.length - 1) {
    // Final Boss Defeated in Hotel Humboldt!
    s.boss.setVelocity(0, 0);
    s.tweens.add({
      targets: s.boss,
      angle: 720,
      alpha: 0.5,
      duration: 1600,
      onComplete: () => triggerGrandFinale(s)
    });
    s.banner.setText('CIBERDELINCUENTE CAPTURADO EN EL HOTEL HUMBOLDT!').setVisible(true);
  } else {
    // Boss escapes towards horizon with hyper thrusters leaving a continuous trail of smoke and fire
    const nextW = WORLDS[wi + 1];
    s.banner.setText('EL DELINCUENTE ESCAPA HACIA ' + nextW.short + '!').setVisible(true);

    // Continuous rocket exhaust smoke trail
    s.time.addEvent({
      delay: 50,
      repeat: 20,
      callback: () => {
        if (s.boss && s.boss.active) {
          spawnSmoke(s, s.boss.x, s.boss.y + 15, 0x1a1a1a, 2, true);
          s.smokeParticles.push({
            x: s.boss.x + rnd(-8, 8),
            y: s.boss.y + 20,
            vx: rnd(-20, 20),
            vy: 90,
            size: 4,
            growth: -2,
            alpha: 1,
            decay: 2.5,
            color: 0x00f0ff,
            isSpark: true
          });
        }
      }
    });

    s.tweens.add({
      targets: s.boss,
      y: HORIZON_Y + 10,
      scaleX: 0.25,
      scaleY: 0.25,
      duration: 1300,
      ease: 'Quad.easeIn',
      onComplete: () => {
        s.boss.setVisible(false);
      }
    });
    snd('warp');

    s.time.delayedCall(1600, () => {
      if (s.st.phase !== 'playing') return;
      s.st.escaping = false;
      s.banner.setVisible(false);
      s.st.phase = 'world_complete';

      const m = s.mods.wc;
      m.sp.setText('!PODER ADQUIRIDO GRACIAS A ' + w.sponsor + '!').setColor(w.sHex);
      m.pn.setText(w.power.toUpperCase());
      m.pd.setText(w.pDesc);
      m.bg.setStrokeStyle(3, w.sColor, 1);

      // Display accumulated sponsor tags
      const listStr = s.st.powers.map(p => '[' + p.sponsor + ': ' + p.power + ']').join('  *  ');
      m.pwrList.setText(listStr);

      s.mods.go.setVisible(false);
      m.cont.setVisible(true);
      snd('powerup');
    });
  }
}

function triggerGrandFinale(s) {
  s.banner.setVisible(false);
  s.player.setVisible(false);
  s.boss.setVisible(false);
  s.bossShieldSpr.setVisible(false);
  s.playerShieldSpr.setVisible(false);
  s.kdrone.setVisible(false);
  s.eLasers.clear(true, true);
  s.obstacles.clear(true, true);
  s.pLasers.clear(true, true);

  s.st.phase = 'game_won';
  s.mods.wc.cont.setVisible(false);
  s.mods.go.setVisible(false);
  s.mods.vic.cont.setVisible(true);
  s.mods.vic.sc.setText('PUNTAJE FINAL: ' + String(s.st.score).padStart(6, '0'));
  s.st.nameEntry.letters = [];
  s.st.nameEntry.row = 0;
  s.st.nameEntry.col = 0;
  refreshName(s);
  updateLetterGrid(s);
  snd('powerup');
}

// ----------------------------------------------------------------------------
// VICTORY NAME ENTRY & LEADERBOARDS
// ----------------------------------------------------------------------------
function handleNameEntry(s, time) {
  let ax = 0, ay = 0;
  if (held(s, 'P1_L')) ax = -1;
  if (held(s, 'P1_R')) ax = 1;
  if (held(s, 'P1_U')) ay = -1;
  if (held(s, 'P1_D')) ay = 1;

  const e = s.st.nameEntry;
  if (time >= e.mvCd && (ax !== 0 || ay !== 0) && (e.lastV.x !== ax || e.lastV.y !== ay)) {
    e.mvCd = time + 150;
    if (ay !== 0) {
      e.row = Phaser.Math.Wrap(e.row + ay, 0, LETTER_GRID.length);
      e.col = Math.min(e.col, LETTER_GRID[e.row].length - 1);
    }
    if (ax !== 0) {
      e.col = Phaser.Math.Wrap(e.col + ax, 0, LETTER_GRID[e.row].length);
    }
    updateLetterGrid(s);
    snd('select');
  }
  e.lastV = (ax === 0 && ay === 0) ? { x: 0, y: 0 } : { x: ax, y: ay };

  if (consume(s, 'P1_1') || consume(s, 'START1')) {
    const val = LETTER_GRID[e.row][e.col];
    if (val === 'DEL') {
      if (e.letters.length > 0) e.letters.pop();
      refreshName(s);
      snd('select');
    } else if (val === 'END' || e.letters.length >= 3) {
      finishScoreEntry(s);
    } else {
      e.letters.push(val);
      refreshName(s);
      snd('select');
      if (e.letters.length >= 3) {
        s.time.delayedCall(400, () => finishScoreEntry(s));
      }
    }
  }
}

function refreshName(s) {
  const l = s.st.nameEntry.letters;
  let str = '';
  for (let i = 0; i < 3; i++) {
    str += (l[i] ? l[i] : '_') + ' ';
  }
  s.mods.vic.nv.setText(str.trim());
}

function updateLetterGrid(s) {
  const e = s.st.nameEntry;
  for (const it of s.mods.vic.gl) {
    const act = (it.row === e.row && it.col === e.col);
    it.cell.setFillStyle(act ? 0x00f0ff : 0x09172c);
    it.lbl.setColor(act ? '#000000' : '#88a6cb');
  }
}

function finishScoreEntry(s) {
  const initials = (s.st.nameEntry.letters.join('') || 'AAA').slice(0, 3);
  saveScore(initials, s.st.score).then(() => {
    s.mods.vic.st.setText('RECORD GUARDADO! PRESIONA [ENTER] PARA VOLVER AL MENU');
    s.time.delayedCall(1200, () => {
      s.input.keyboard.once('keydown', () => {
        showTitle(s);
      });
    });
  });
}

// ----------------------------------------------------------------------------
// ARCADE PERSISTENT STORAGE
// ----------------------------------------------------------------------------
async function loadScores() {
  try {
    if (window.platanusArcadeStorage) {
      const res = await window.platanusArcadeStorage.get(STORAGE_KEY);
      if (res && res.found && Array.isArray(res.value)) return res.value;
    }
  } catch (e) {}
  return [];
}

async function saveScore(name, score) {
  try {
    const list = await loadScores();
    list.push({ name, score, date: Date.now() });
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 5);
    if (window.platanusArcadeStorage) {
      await window.platanusArcadeStorage.set(STORAGE_KEY, top);
    }
    return top;
  } catch (e) {}
  return [];
}
