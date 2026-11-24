import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import {
  buildBarrierModel,
  buildHujurCharacter,
  buildPowerUpPickup,
  buildRuhulCharacter,
  buildTrackSegment,
  buildTrainModel,
  CharacterRig,
} from './models';
import { createGameTextureSet, GameTextureSet } from './textures';
import {
  ActivePowerUpState,
  GameHudState,
  GamePhase,
  LANE_POSITIONS,
  LANE_WIDTH,
  LaneIndex,
  ObstacleKind,
  PowerUpType,
} from './types';

interface ObstacleEntity {
  kind: ObstacleKind;
  lane: LaneIndex;
  z: number;
  speedOffset: number; // > 0 for oncoming trains
  halfLen: number;
  height: number;
  group: THREE.Group;
  hornPlayed: boolean;
  hitSide: boolean;
}

interface CoinEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  phase: number;
}

interface PowerUpEntity {
  type: PowerUpType;
  lane: LaneIndex;
  y: number;
  z: number;
  group: THREE.Group;
  collected: boolean;
}

interface ParticleEntity {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

const BEST_SCORE_KEY = 'ruhul_vs_hujur_best_score_v1';
const SEGMENT_LENGTH = 30;
const SEGMENT_COUNT = 6;
const MAX_COINS = 150;
const MAX_PARTICLES = 120;

// Reusable module-scope math objects (zero-GC inside render loop)
const _dummy = new THREE.Object3D();
const _vec3 = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _color = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class TrackChaseEngine {
  private container: HTMLElement;
  private onHudChange: (hud: GameHudState) => void;
  private sound = new SoundEngine();

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private textures: GameTextureSet;

  private hujur!: CharacterRig;
  private ruhul!: CharacterRig;
  private segments: THREE.Group[] = [];
  private obstacles: ObstacleEntity[] = [];
  private powerUpPickups: PowerUpEntity[] = [];

  private coins: CoinEntity[] = [];
  private coinMesh!: THREE.InstancedMesh;
  private particles: ParticleEntity[] = [];
  private particleMesh!: THREE.InstancedMesh;

  private frameId = 0;
  private disposed = false;
  private lastTime = 0;
  private simTime = 0;
  private hudSyncTimer = 0;

  // Game state
  private phase: GamePhase = 'title';
  private score = 0;
  private bestScore = 0;
  private coinCount = 0;
  private distance = 0;
  private worldSpeed = 19;
  private caughtReason = '';

  // Player state
  private lane: LaneIndex = 1;
  private prevLane: LaneIndex = 1;
  private playerX = 0;
  private playerY = 0;
  private playerVy = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private rollTimer = 0;
  private fastDrop = false;
  private invulnTimer = 0;
  private laneTilt = 0;
  private runCycle = 0;

  // Chase & feedback state
  private chaseDistance = 2.8;
  private stumbleTimer = 0; // > 0 means Ruhul is right on Hujur's heels
  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private spawnZCursor = -42;

  // Power-ups
  private magnetTimer = 0;
  private jetpackTimer = 0;
  private multiplierTimer = 0;
  private sneakersTimer = 0;
  private jetpackCoinCooldown = 0;

  // Input tracking
  private heldKeys = new Set<string>();
  private touchStartX = 0;
  private touchStartY = 0;
  private touchActive = false;

  constructor(container: HTMLElement, onHudChange: (hud: GameHudState) => void) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || '0') || 0;

    this.isSoftwareGl = detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    // Scene & Golden-Hour Horizon Fog
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0xe6be9a);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 42, 138);

    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.2, 200);
    this.camera.position.set(3.4, 2.3, -6.2);

    // Mandatory studio environment map
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createGameTextureSet(maxAniso);

    this.setupLighting();
    this.setupWorld();
    this.setupActors();
    this.setupPools();
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.emitHud();
    this.lastTime = performance.now();
    this.scheduleNextFrame();
  }

  private setupLighting(): void {
    // Cool sky / warm earth hemisphere fill
    const hemi = new THREE.HemisphereLight(0x9fd3ff, 0x614b38, 0.9);
    this.scene.add(hemi);

    // Warm golden-hour directional key light
    const key = new THREE.DirectionalLight(0xffe7c7, 1.85);
    key.position.set(16, 26, 14);
    key.castShadow = !this.isSoftwareGl;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 70;
    const d = 22;
    key.shadow.camera.left = -d;
    key.shadow.camera.right = d;
    key.shadow.camera.top = d;
    key.shadow.camera.bottom = -d;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    // Subtle cool rim light from ahead
    const rim = new THREE.DirectionalLight(0xbbe0ff, 0.55);
    rim.position.set(-10, 10, -24);
    this.scene.add(rim);
  }

  private setupWorld(): void {
    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const seg = buildTrackSegment(SEGMENT_LENGTH, this.textures, i % 2 === 0);
      seg.position.z = 15 - i * SEGMENT_LENGTH;
      this.scene.add(seg);
      this.segments.push(seg);
    }
  }

  private setupActors(): void {
    this.hujur = buildHujurCharacter(this.textures);
    this.scene.add(this.hujur.root);

    this.ruhul = buildRuhulCharacter(this.textures);
    this.ruhul.root.position.set(0, 0, 2.8);
    this.scene.add(this.ruhul.root);
  }

  private setupPools(): void {
    // Coins pool (InstancedMesh)
    const coinGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 18);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.22,
      roughness: 0.2,
      metalness: 0.88,
    });
    this.coinMesh = new THREE.InstancedMesh(coinGeo, coinMat, MAX_COINS);
    this.coinMesh.frustumCulled = false;
    this.scene.add(this.coinMesh);
    for (let i = 0; i < MAX_COINS; i++) {
      this.coins.push({ active: false, x: 0, y: -50, z: 0, phase: 0 });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.coinMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.coinMesh.instanceMatrix.needsUpdate = true;

    // Particles pool (InstancedMesh)
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleMesh.frustumCulled = false;
    this.scene.add(this.particleMesh);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 1,
        color: new THREE.Color(0xfacc15),
      });
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, _color.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    this.sound.unlock();

    if (e.code === 'KeyM' && !e.repeat) {
      this.toggleMute();
      return;
    }

    if (this.phase === 'title') {
      if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
        this.startNewRun();
      }
      return;
    }

    if (this.phase === 'gameover') {
      if ((e.code === 'Enter' || e.code === 'Space') && !e.repeat) {
        this.startNewRun();
      }
      return;
    }

    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (this.phase === 'playing') this.pauseGame();
      else if (this.phase === 'paused') this.resumeGame();
      return;
    }

    if (this.phase !== 'playing' || e.repeat) return;
    this.heldKeys.add(e.code);

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      this.switchLane(-1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      this.switchLane(1);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
      this.jumpBufferTimer = 0.14;
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      this.triggerRollOrDrop();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleWindowBlur = (): void => {
    this.heldKeys.clear();
    if (this.phase === 'playing') {
      this.pauseGame();
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.phase !== 'playing') return;
    if (e.touches.length > 0) {
      this.sound.unlock();
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
      this.touchActive = true;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.touchActive || this.phase !== 'playing' || e.touches.length === 0) return;
    const dx = e.touches[0].clientX - this.touchStartX;
    const dy = e.touches[0].clientY - this.touchStartY;
    const threshold = 26;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      this.touchActive = false;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.switchLane(dx < 0 ? -1 : 1);
      } else if (dy < 0) {
        this.jumpBufferTimer = 0.14;
      } else {
        this.triggerRollOrDrop();
      }
    }
  };

  private handleTouchEnd = (): void => {
    this.touchActive = false;
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    dom.addEventListener('touchmove', this.handleTouchMove, { passive: true });
    dom.addEventListener('touchend', this.handleTouchEnd, { passive: true });
  }

  public startNewRun(): void {
    this.sound.unlock();
    this.sound.stopCaughtClip();
    this.clearObstaclesAndPickups();

    this.phase = 'playing';
    this.score = 0;
    this.coinCount = 0;
    this.distance = 0;
    this.worldSpeed = 19.5;
    this.caughtReason = '';

    this.lane = 1;
    this.prevLane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVy = 0;
    this.grounded = true;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.rollTimer = 0;
    this.fastDrop = false;
    this.invulnTimer = 0;
    this.laneTilt = 0;

    this.chaseDistance = 2.5;
    this.stumbleTimer = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;
    this.spawnZCursor = -42;

    this.magnetTimer = 0;
    this.jetpackTimer = 0;
    this.multiplierTimer = 0;
    this.sneakersTimer = 0;

    // Pre-populate initial waves down the track
    while (this.spawnZCursor > -135) {
      this.spawnNextWave();
    }

    this.emitHud();
  }

  public pauseGame(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.emitHud();
    }
  }

  public resumeGame(): void {
    if (this.phase === 'paused') {
      this.lastTime = performance.now();
      this.phase = 'playing';
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.sound.stopCaughtClip();
    this.clearObstaclesAndPickups();
    this.phase = 'title';
    this.lane = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.chaseDistance = 2.7;
    this.rollTimer = 0;
    this.emitHud();
  }

  public toggleMute(): void {
    this.sound.toggleMute();
    this.emitHud();
  }

  public replayCaughtClip(): void {
    this.sound.unlock();
    this.sound.playCaughtClip();
  }

  private clearObstaclesAndPickups(): void {
    for (const obs of this.obstacles) {
      this.scene.remove(obs.group);
    }
    this.obstacles = [];

    for (const pu of this.powerUpPickups) {
      this.scene.remove(pu.group);
    }
    this.powerUpPickups = [];

    for (let i = 0; i < MAX_COINS; i++) {
      this.coins[i].active = false;
      _dummy.position.set(0, -50, 0);
      _dummy.scale.setScalar(0);
      _dummy.updateMatrix();
      this.coinMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  private switchLane(dir: -1 | 1): void {
    const next = Math.max(0, Math.min(2, this.lane + dir)) as LaneIndex;
    if (next !== this.lane) {
      this.prevLane = this.lane;
      this.lane = next;
      this.laneTilt = -dir * 0.34;
      this.sound.playLaneSwitch();
    }
  }

  private triggerRollOrDrop(): void {
    if (this.jetpackTimer > 0) return;
    if (this.grounded) {
      this.rollTimer = 0.64;
      this.sound.playRoll();
      this.spawnBurst(this.playerX, this.playerY + 0.25, 0.2, 0xd6d3d1, 8, 2.5);
    } else {
      // Fast slam down + roll on land
      this.fastDrop = true;
      this.playerVy = Math.min(this.playerVy, -26);
      this.rollTimer = 0.55;
      this.sound.playRoll();
    }
  }

  private executeJump(): void {
    this.grounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.rollTimer = 0;
    this.fastDrop = false;
    const superJump = this.sneakersTimer > 0;
    this.playerVy = superJump ? 17.6 : 13.8;
    this.sound.playJump(superJump);
    this.spawnBurst(this.playerX, this.playerY + 0.1, 0.2, 0xe2e8f0, 7, 2.2);
  }

  private spawnCoin(x: number, y: number, z: number): void {
    for (let i = 0; i < MAX_COINS; i++) {
      if (!this.coins[i].active) {
        this.coins[i].active = true;
        this.coins[i].x = x;
        this.coins[i].y = y;
        this.coins[i].z = z;
        this.coins[i].phase = z * 0.35;
        return;
      }
    }
  }

  private spawnCoinLine(lane: LaneIndex, zStart: number, count: number, spacing: number, yBase: number, arc = false): void {
    const x = LANE_POSITIONS[lane];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const y = arc ? yBase + Math.sin(t * Math.PI) * 1.45 : yBase;
      this.spawnCoin(x, y, zStart - i * spacing);
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    hex: number,
    count: number,
    spreadSpeed: number
  ): void {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.3;
        p.y = y + (Math.random() - 0.5) * 0.3;
        p.z = z + (Math.random() - 0.5) * 0.3;
        p.vx = (Math.random() - 0.5) * spreadSpeed;
        p.vy = Math.random() * spreadSpeed * 0.9 + 1.4;
        p.vz = (Math.random() - 0.5) * spreadSpeed;
        p.life = 0;
        p.maxLife = 0.28 + Math.random() * 0.24;
        p.scale = 0.8 + Math.random() * 0.7;
        p.color.setHex(hex);
        spawned++;
      }
    }
  }

  private spawnObstacle(kind: ObstacleKind, lane: LaneIndex, z: number): void {
    let group: THREE.Group;
    let halfLen = 0.6;
    let height = 1.05;
    let speedOffset = 0;

    if (kind === 'train_static' || kind === 'train_ramp' || kind === 'train_moving') {
      const variant = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      const withRamp = kind === 'train_ramp';
      group = buildTrainModel(variant, this.textures, withRamp);
      halfLen = withRamp ? 6.8 : 6.75;
      height = 3.38;
      if (kind === 'train_moving') {
        speedOffset = 14.5 + Math.min(8, (this.worldSpeed - 19) * 0.5);
      }
    } else {
      group = buildBarrierModel(kind, this.textures);
      halfLen = 0.45;
      height = kind === 'low_barrier' ? 1.02 : kind === 'high_gate' ? 2.7 : 2.45;
    }

    group.position.set(LANE_POSITIONS[lane], 0, z);
    this.scene.add(group);
    this.obstacles.push({
      kind,
      lane,
      z,
      speedOffset,
      halfLen,
      height,
      group,
      hornPlayed: false,
      hitSide: false,
    });
  }

  private spawnNextWave(): void {
    const z = this.spawnZCursor;
    const difficulty = Math.min(1, this.distance / 1400);
    const lanes: LaneIndex[] = [0, 1, 2];
    // Shuffle lanes so guaranteed open path is random
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = lanes[i];
      lanes[i] = lanes[j];
      lanes[j] = tmp;
    }

    const openLane = lanes[0];
    const laneB = lanes[1];
    const laneC = lanes[2];

    const roll = Math.random();
    if (roll < 0.28) {
      // Barrier trio with 1 clear lane + 1 jumpable/slideable
      const k1: ObstacleKind = Math.random() < 0.5 ? 'low_barrier' : 'high_gate';
      const k2: ObstacleKind = Math.random() < 0.4 ? 'tall_barrier' : 'low_barrier';
      this.spawnObstacle(k1, laneB, z);
      this.spawnObstacle(k2, laneC, z);
      if (k1 === 'low_barrier') {
        this.spawnCoinLine(laneB, z + 2.2, 5, 1.1, 1.0, true);
      } else {
        this.spawnCoinLine(openLane, z + 2, 5, 1.5, 0.75, false);
      }
      this.spawnZCursor -= 19 - difficulty * 2.5;
    } else if (roll < 0.62) {
      // Static train + ramp train + open lane
      const rampLane = laneB;
      this.spawnObstacle('train_ramp', rampLane, z - 4);
      if (Math.random() < 0.65) {
        this.spawnObstacle('train_static', laneC, z - 4);
      } else {
        this.spawnObstacle('high_gate', laneC, z + 1);
      }
      // Coins along the ramp & roof!
      this.spawnCoinLine(rampLane, z + 2.5, 6, 1.7, 3.95, false);
      this.spawnCoinLine(openLane, z + 1, 5, 1.8, 0.75, false);
      this.spawnZCursor -= 27 - difficulty * 3.0;
    } else if (roll < 0.84) {
      // Oncoming moving train in 1 lane + barrier in another, 1 clean open lane!
      this.spawnObstacle('train_moving', laneB, z - 14);
      if (Math.random() < 0.7) {
        this.spawnObstacle(Math.random() < 0.5 ? 'low_barrier' : 'high_gate', laneC, z);
      }
      this.spawnCoinLine(openLane, z + 2, 6, 1.7, 0.75, false);
      this.spawnZCursor -= 26 - difficulty * 2.5;
    } else {
      // Double static trains forcing open lane or barrier weave
      this.spawnObstacle('train_static', laneB, z - 4);
      this.spawnObstacle('train_static', laneC, z - 4);
      this.spawnObstacle(Math.random() < 0.5 ? 'low_barrier' : 'high_gate', openLane, z - 7);
      this.spawnCoinLine(openLane, z + 2, 5, 1.6, 0.75, false);
      this.spawnZCursor -= 28 - difficulty * 3.0;
    }

    // Occasional power-up pickup in the open lane or on train roof
    if (Math.random() < 0.24) {
      const types: PowerUpType[] = ['magnet', 'jetpack', 'multiplier', 'sneakers'];
      const pType = types[Math.floor(Math.random() * types.length)];
      const group = buildPowerUpPickup(pType);
      const puY = 1.05;
      const puZ = z - 7;
      group.position.set(LANE_POSITIONS[openLane], puY, puZ);
      this.scene.add(group);
      this.powerUpPickups.push({
        type: pType,
        lane: openLane,
        y: puY,
        z: puZ,
        group,
        collected: false,
      });
    }
  }

  private triggerStumble(reason: string): void {
    if (this.invulnTimer > 0 || this.jetpackTimer > 0) return;

    if (this.stumbleTimer > 0) {
      // Already in danger window -> Ruhul catches Hujur!
      this.triggerGameOver(reason);
      return;
    }

    this.stumbleTimer = 6.5;
    this.invulnTimer = 0.85;
    this.hitstopTimer = 0.055;
    this.shakeIntensity = 0.45;
    this.sound.playStumble();
    this.spawnBurst(this.playerX, this.playerY + 1.0, 0, 0xf97316, 16, 5.5);
  }

  private triggerGameOver(reason: string): void {
    this.phase = 'gameover';
    this.caughtReason = reason;
    this.hitstopTimer = 0.07;
    this.shakeIntensity = 0.65;
    this.chaseDistance = 0.95;
    this.sound.playCaught();
    this.spawnBurst(this.playerX, this.playerY + 1.1, 0, 0xef4444, 22, 6.5);

    const finalScore = Math.floor(this.score);
    if (finalScore > this.bestScore) {
      this.bestScore = finalScore;
      localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    }
    this.emitHud();
  }

  private activatePowerUp(type: PowerUpType): void {
    this.sound.playPowerUp();
    if (type === 'magnet') this.magnetTimer = 9.0;
    else if (type === 'jetpack') {
      this.jetpackTimer = 6.5;
      this.rollTimer = 0;
      this.fastDrop = false;
    } else if (type === 'multiplier') this.multiplierTimer = 11.0;
    else if (type === 'sneakers') this.sneakersTimer = 9.5;
    this.spawnBurst(this.playerX, this.playerY + 1.0, 0, 0x38bdf8, 18, 5.0);
  }

  private updateSimulation(dt: number): void {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      return;
    }

    // Track scroll speed
    const activeSpeed =
      this.phase === 'title'
        ? 14.5
        : this.jetpackTimer > 0
          ? this.worldSpeed * 1.42
          : this.worldSpeed;

    // Recycle track segments
    const totalTrackLen = SEGMENT_LENGTH * SEGMENT_COUNT;
    for (const seg of this.segments) {
      seg.position.z += activeSpeed * dt;
      if (seg.position.z > SEGMENT_LENGTH) {
        seg.position.z -= totalTrackLen;
      }
    }

    if (this.phase === 'title') {
      this.runCycle += dt * 11.5;
      this.animateRunner(this.hujur, this.runCycle, 0, true, false, 0);
      this.animateChaser(this.ruhul, this.runCycle + 0.9, 2.7, dt);
      return;
    }

    if (this.phase !== 'playing') return;

    // Ramp speed smoothly
    this.worldSpeed = Math.min(36, 19.5 + this.distance * 0.011);
    const frameDist = activeSpeed * dt;
    this.distance += frameDist;
    const mult = this.multiplierTimer > 0 ? 2 : 1;
    this.score += frameDist * 2.2 * mult;

    // Timers
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.stumbleTimer > 0) this.stumbleTimer = Math.max(0, this.stumbleTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer = Math.max(0, this.magnetTimer - dt);
    if (this.multiplierTimer > 0) this.multiplierTimer = Math.max(0, this.multiplierTimer - dt);
    if (this.sneakersTimer > 0) this.sneakersTimer = Math.max(0, this.sneakersTimer - dt);
    if (this.rollTimer > 0) this.rollTimer = Math.max(0, this.rollTimer - dt);
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    // Chase distance spring
    const targetChase = this.stumbleTimer > 0 ? 1.85 : 7.6;
    this.chaseDistance = THREE.MathUtils.damp(this.chaseDistance, targetChase, 3.6, dt);

    // Lane lateral damping
    const targetX = LANE_POSITIONS[this.lane];
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 17, dt);
    this.laneTilt = THREE.MathUtils.damp(this.laneTilt, 0, 11, dt);

    // Jetpack vs standard jump/gravity
    if (this.jetpackTimer > 0) {
      this.jetpackTimer = Math.max(0, this.jetpackTimer - dt);
      this.playerY = THREE.MathUtils.damp(this.playerY, 4.35, 6.5, dt);
      this.playerVy = 0;
      this.grounded = false;
      this.invulnTimer = Math.max(this.invulnTimer, 0.75);

      this.jetpackCoinCooldown -= dt;
      if (this.jetpackCoinCooldown <= 0) {
        this.jetpackCoinCooldown = 0.13;
        this.spawnCoin(LANE_POSITIONS[this.lane], 4.65, -36);
      }
      if (Math.random() < 0.7) {
        this.spawnBurst(this.playerX, this.playerY + 0.9, 0.4, 0xf97316, 1, 1.4);
      }
    } else {
      // Check ground/train-roof support underneath player
      let supportY = 0;
      for (const obs of this.obstacles) {
        if (
          obs.kind === 'train_static' ||
          obs.kind === 'train_ramp' ||
          obs.kind === 'train_moving'
        ) {
          const laneDx = Math.abs(this.playerX - LANE_POSITIONS[obs.lane]);
          if (laneDx < 1.25) {
            const localZ = -obs.z; // player is at z=0
            if (obs.kind === 'train_ramp' && localZ >= 3.25 && localZ <= 7.05) {
              const rampT = THREE.MathUtils.clamp((7.05 - localZ) / 3.8, 0, 1);
              const rampY = rampT * 3.38;
              if (this.playerY >= rampY - 0.95) {
                supportY = Math.max(supportY, rampY);
              }
            } else if (
              localZ >= (obs.kind === 'train_ramp' ? -6.75 : -6.75) &&
              localZ <= (obs.kind === 'train_ramp' ? 3.25 : 6.75)
            ) {
              if (this.playerY >= 2.65) {
                supportY = Math.max(supportY, 3.38);
              }
            }
          }
        }
      }

      if (this.grounded) {
        this.coyoteTimer = 0.1;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }

      if (this.jumpBufferTimer > 0 && (this.grounded || this.coyoteTimer > 0)) {
        this.executeJump();
      }

      this.playerVy -= (this.fastDrop ? 58 : 34) * dt;
      this.playerY += this.playerVy * dt;

      if (this.playerY <= supportY) {
        if (!this.grounded && this.playerVy < -6) {
          this.sound.playLand();
          this.spawnBurst(this.playerX, supportY + 0.05, 0, 0xcbd5e1, 5, 1.8);
        }
        this.playerY = supportY;
        this.playerVy = 0;
        this.grounded = true;
        this.fastDrop = false;
      } else {
        this.grounded = false;
      }
    }

    // Spawn new waves down the track
    this.spawnZCursor += frameDist;
    while (this.spawnZCursor > -135) {
      this.spawnNextWave();
    }

    // Update obstacles & check collisions
    const playerHalfHeight = this.rollTimer > 0 ? 0.95 : 1.78;
    const isSwitchingLane = Math.abs(this.playerX - targetX) > 0.28;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.z += (activeSpeed + obs.speedOffset) * dt;
      obs.group.position.z = obs.z;

      if (obs.kind === 'train_moving' && !obs.hornPlayed && obs.z > -78 && obs.z < -40) {
        obs.hornPlayed = true;
        this.sound.playTrainHorn();
      }

      // Collision check near z = 0
      if (this.jetpackTimer <= 0 && !obs.hitSide) {
        const localZ = -obs.z;
        const zMin = obs.kind === 'train_ramp' ? -6.75 : -obs.halfLen;
        const zMax = obs.kind === 'train_ramp' ? 6.95 : obs.halfLen;
        const laneDx = Math.abs(this.playerX - LANE_POSITIONS[obs.lane]);

        if (laneDx < 1.05 && localZ > zMin - 0.32 && localZ < zMax + 0.32) {
          if (obs.kind === 'low_barrier') {
            if (this.playerY < 0.85) {
              obs.hitSide = true;
              this.triggerStumble('Tripped over a railway barrier — Ruhul caught Hujur!');
              if ((this.phase as GamePhase) === 'gameover') return;
            }
          } else if (obs.kind === 'high_gate') {
            // Clearance underneath up to y = 1.25
            if (this.playerY + playerHalfHeight > 1.26 && this.playerY < 2.6) {
              obs.hitSide = true;
              this.triggerStumble('Clipped the overhead gantry — Ruhul caught Hujur!');
              if ((this.phase as GamePhase) === 'gameover') return;
            }
          } else if (obs.kind === 'tall_barrier') {
            if (this.playerY < 2.25) {
              if (isSwitchingLane) {
                obs.hitSide = true;
                this.lane = this.prevLane;
                this.triggerStumble('Scraped a tall barricade — Ruhul caught Hujur!');
                if ((this.phase as GamePhase) === 'gameover') return;
              } else {
                this.triggerGameOver('Slammed into a tall barricade — Ruhul caught Hujur!');
                return;
              }
            }
          } else {
            // Train collision (train_static, train_moving, train_ramp)
            const roofThreshold = 2.65;
            if (obs.kind === 'train_ramp' && localZ >= 3.25) {
              // On front ramp slope — climbs safely unless way below
              const rampT = THREE.MathUtils.clamp((7.05 - localZ) / 3.8, 0, 1);
              const rampY = rampT * 3.38;
              if (this.playerY < rampY - 1.15) {
                obs.hitSide = true;
                this.lane = this.prevLane;
                this.triggerStumble('Scraped the train ramp!');
                if ((this.phase as GamePhase) === 'gameover') return;
              }
            } else if (this.playerY < roofThreshold) {
              // Side swipe vs head-on crash
              const frontEdge = obs.kind === 'train_ramp' ? 3.25 : obs.halfLen;
              if (isSwitchingLane && localZ < frontEdge - 0.65) {
                obs.hitSide = true;
                this.lane = this.prevLane;
                this.triggerStumble('Sideswiped a metro train — Ruhul is right behind!');
                if ((this.phase as GamePhase) === 'gameover') return;
              } else {
                this.triggerGameOver(
                  obs.kind === 'train_moving'
                    ? 'Dodged too late on an express train — Ruhul caught Hujur!'
                    : 'Crashed into a metro train — Ruhul caught Hujur!'
                );
                return;
              }
            }
          }
        }
      }

      if (obs.z > 24) {
        this.scene.remove(obs.group);
        this.obstacles.splice(i, 1);
      }
    }

    // Update power-up pickups
    for (let i = this.powerUpPickups.length - 1; i >= 0; i--) {
      const pu = this.powerUpPickups[i];
      pu.z += frameDist;
      pu.group.position.z = pu.z;
      pu.group.rotation.y += dt * 2.8;
      pu.group.position.y = pu.y + Math.sin(this.simTime * 4.5) * 0.16;

      if (!pu.collected) {
        const dx = Math.abs(this.playerX - LANE_POSITIONS[pu.lane]);
        const dy = Math.abs(this.playerY + 0.9 - pu.group.position.y);
        if (dx < 1.25 && dy < 1.35 && Math.abs(pu.z) < 1.1) {
          pu.collected = true;
          this.scene.remove(pu.group);
          this.activatePowerUp(pu.type);
          this.powerUpPickups.splice(i, 1);
          continue;
        }
      }

      if (pu.z > 18) {
        this.scene.remove(pu.group);
        this.powerUpPickups.splice(i, 1);
      }
    }

    // Update coins (with magnet pull)
    const magnetOn = this.magnetTimer > 0;
    let coinsDirty = false;
    for (let i = 0; i < MAX_COINS; i++) {
      const c = this.coins[i];
      if (!c.active) continue;
      coinsDirty = true;
      c.z += frameDist;

      if (magnetOn && c.z > -16 && c.z < 3) {
        const pull = 16 * dt;
        c.x = THREE.MathUtils.lerp(c.x, this.playerX, Math.min(1, pull));
        c.y = THREE.MathUtils.lerp(c.y, this.playerY + 1.0, Math.min(1, pull));
        c.z = THREE.MathUtils.lerp(c.z, 0, Math.min(1, pull * 0.8));
      }

      const dx = Math.abs(c.x - this.playerX);
      const dy = Math.abs(c.y - (this.playerY + 0.9));
      if (dx < 1.05 && dy < 1.2 && Math.abs(c.z) < 1.05) {
        c.active = false;
        this.coinCount += 1;
        this.score += 12 * mult;
        this.sound.playCoin();
        this.spawnBurst(c.x, c.y, 0, 0xfacc15, 5, 2.4);
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.coinMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      if (c.z > 16) {
        c.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.coinMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }

      _dummy.position.set(c.x, c.y + Math.sin(this.simTime * 5 + c.phase) * 0.1, c.z);
      _dummy.rotation.set(0, this.simTime * 4.2 + c.phase, 0);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      this.coinMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (coinsDirty) {
      this.coinMesh.instanceMatrix.needsUpdate = true;
    }

    // Update particles
    let particlesDirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      particlesDirty = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -50, 0);
        _dummy.scale.setScalar(0);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 14 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const frac = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.life * 6, p.life * 4, 0);
      _dummy.scale.setScalar(p.scale * frac);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, p.color);
    }
    if (particlesDirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    }

    // Animate Hujur & Ruhul
    this.runCycle += dt * (activeSpeed * 0.65);
    this.animateRunner(
      this.hujur,
      this.runCycle,
      this.laneTilt,
      this.grounded,
      this.rollTimer > 0,
      this.invulnTimer
    );
    this.animateChaser(this.ruhul, this.runCycle + 0.85, this.chaseDistance, dt);
  }

  private animateRunner(
    rig: CharacterRig,
    cycle: number,
    tilt: number,
    grounded: boolean,
    rolling: boolean,
    invulnTimer: number
  ): void {
    rig.root.position.set(this.playerX, 0, 0);
    rig.bodyPivot.position.y = this.playerY;

    // Grounded contact shadow tracks ground/train surface beneath runner
    rig.shadow.position.y = 0.025;
    const shadowScale = THREE.MathUtils.clamp(1 - this.playerY * 0.14, 0.35, 1);
    rig.shadow.scale.setScalar(shadowScale);

    // Blink slight opacity when recovering from stumble
    const flash = invulnTimer > 0 && Math.floor(invulnTimer * 18) % 2 === 1;
    rig.bodyPivot.visible = !flash || this.jetpackTimer > 0;

    // Power-up visuals
    if (rig.magnetRing) {
      rig.magnetRing.visible = this.magnetTimer > 0;
      rig.magnetRing.rotation.z = this.simTime * 5;
    }
    if (rig.jetpackGroup) {
      rig.jetpackGroup.visible = this.jetpackTimer > 0;
    }
    if (rig.sneakerGlowL && rig.sneakerGlowR) {
      const showSneakers = this.sneakersTimer > 0;
      rig.sneakerGlowL.visible = showSneakers;
      rig.sneakerGlowR.visible = showSneakers;
    }

    if (rolling) {
      rig.bodyPivot.scale.set(1.12, 0.52, 1.12);
      rig.torso.rotation.x = -0.65;
      rig.leftArm.rotation.x = 0.9;
      rig.rightArm.rotation.x = 0.9;
      rig.leftLeg.rotation.x = -0.7;
      rig.rightLeg.rotation.x = -0.7;
      rig.bodyPivot.rotation.z = tilt;
      return;
    }

    rig.bodyPivot.scale.set(1, 1, 1);
    rig.bodyPivot.rotation.z = tilt;

    if (this.jetpackTimer > 0) {
      rig.torso.rotation.x = -0.35;
      rig.leftArm.rotation.x = -0.4;
      rig.rightArm.rotation.x = -0.4;
      rig.leftLeg.rotation.x = 0.35;
      rig.rightLeg.rotation.x = 0.15;
      return;
    }

    if (!grounded) {
      rig.torso.rotation.x = -0.18;
      rig.leftArm.rotation.x = -1.25;
      rig.rightArm.rotation.x = 0.75;
      rig.leftLeg.rotation.x = 0.75;
      rig.rightLeg.rotation.x = -0.55;
      return;
    }

    const s = Math.sin(cycle);
    const bounce = Math.abs(Math.cos(cycle)) * 0.12;
    rig.bodyPivot.position.y = this.playerY + bounce;
    rig.torso.rotation.x = -0.16;
    rig.leftLeg.rotation.x = s * 0.95;
    rig.rightLeg.rotation.x = -s * 0.95;
    rig.leftArm.rotation.x = -s * 0.85;
    rig.rightArm.rotation.x = s * 0.85;
    rig.head.rotation.y = Math.sin(cycle * 0.5) * 0.08;
  }

  private animateChaser(rig: CharacterRig, cycle: number, distZ: number, dt: number): void {
    const followX = THREE.MathUtils.damp(rig.root.position.x, this.playerX * 0.9, 9, dt);
    const baseY = this.phase === 'gameover' ? 0 : Math.max(0, this.playerY * 0.35);
    rig.root.position.set(followX, 0, distZ);

    if (this.phase === 'gameover') {
      // Ruhul reaches out triumphantly grabbing Hujur!
      rig.bodyPivot.position.y = 0;
      rig.torso.rotation.x = -0.18;
      rig.leftArm.rotation.x = -1.45;
      rig.rightArm.rotation.x = -1.35;
      rig.leftLeg.rotation.x = 0.3;
      rig.rightLeg.rotation.x = -0.3;
      return;
    }

    const s = Math.sin(cycle);
    const bounce = Math.abs(Math.cos(cycle)) * 0.13;
    rig.bodyPivot.position.y = baseY + bounce;
    rig.torso.rotation.x = -0.22;
    rig.leftLeg.rotation.x = s * 0.98;
    rig.rightLeg.rotation.x = -s * 0.98;
    // Ruhul pumps arms & reaches forward aggressively
    rig.leftArm.rotation.x = -0.6 - s * 0.65;
    rig.rightArm.rotation.x = -0.6 + s * 0.65;
    rig.head.rotation.z = Math.sin(cycle) * 0.06;
  }

  private updateCamera(dt: number): void {
    if (this.phase === 'title') {
      // Atmospheric front-3/4 tracking shot showcasing both Hujur and Ruhul faces & outfits!
      const sway = Math.sin(this.simTime * 0.55) * 1.1;
      _camGoal.set(3.15 + sway, 2.25, -5.6);
      this.camera.position.lerp(_camGoal, Math.min(1, dt * 4));
      _lookTarget.set(0, 1.32, 1.15);
      this.camera.lookAt(_lookTarget);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 5, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.phase === 'gameover') {
      // Dramatic front-3/4 freeze shot showing Ruhul catching Hujur!
      _camGoal.set(this.playerX + 2.4, this.playerY + 2.15, -3.9);
      this.camera.position.lerp(_camGoal, Math.min(1, dt * 6));
      _lookTarget.set(this.playerX, this.playerY + 1.2, 0.5);
      this.camera.lookAt(_lookTarget);
      return;
    }

    // Standard third-person chase camera behind Hujur & Ruhul
    const targetCamX = this.playerX * 0.62;
    const targetCamY = 4.35 + this.playerY * 0.72;
    const targetCamZ = 8.4 + (this.jetpackTimer > 0 ? 1.4 : 0);

    _camGoal.set(targetCamX, targetCamY, targetCamZ);
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camGoal.x, 8, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camGoal.y, 7, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camGoal.z, 6, dt);

    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.8);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
    }

    const speedFov = 58 + (this.worldSpeed - 19.5) * 0.55 + (this.jetpackTimer > 0 ? 7 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, speedFov, 5, dt);
    this.camera.updateProjectionMatrix();

    _lookTarget.set(this.playerX * 0.5, 1.55 + this.playerY * 0.65, -9.5);
    this.camera.lookAt(_lookTarget);
  }

  private emitHud(): void {
    const activePowerUps: ActivePowerUpState[] = [];
    if (this.magnetTimer > 0)
      activePowerUps.push({ type: 'magnet', remaining: this.magnetTimer, duration: 9.0 });
    if (this.jetpackTimer > 0)
      activePowerUps.push({ type: 'jetpack', remaining: this.jetpackTimer, duration: 6.5 });
    if (this.multiplierTimer > 0)
      activePowerUps.push({ type: 'multiplier', remaining: this.multiplierTimer, duration: 11.0 });
    if (this.sneakersTimer > 0)
      activePowerUps.push({ type: 'sneakers', remaining: this.sneakersTimer, duration: 9.5 });

    const danger = THREE.MathUtils.clamp(1 - (this.chaseDistance - 1.85) / (7.6 - 1.85), 0, 1);

    this.onHudChange({
      phase: this.phase,
      score: Math.floor(this.score),
      bestScore: Math.max(this.bestScore, Math.floor(this.score)),
      coins: this.coinCount,
      distance: Math.floor(this.distance),
      speedKmh: Math.round(this.worldSpeed * 3.6),
      multiplier: this.multiplierTimer > 0 ? 2 : 1,
      chaseDanger: danger,
      stumbleActive: this.stumbleTimer > 0,
      activePowerUps,
      caughtReason: this.caughtReason,
      muted: this.sound.isMuted(),
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) * 0.001;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    this.simTime += dt;

    this.updateSimulation(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.08 && this.phase === 'playing') {
      this.hudSyncTimer = 0;
      this.emitHud();
    }

    this.scheduleNextFrame();
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);

    const dom = this.renderer.domElement;
    dom.removeEventListener('touchstart', this.handleTouchStart);
    dom.removeEventListener('touchmove', this.handleTouchMove);
    dom.removeEventListener('touchend', this.handleTouchEnd);

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.sound.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
