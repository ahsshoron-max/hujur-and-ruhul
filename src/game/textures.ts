import * as THREE from 'three';
import { HUJUR_PHOTO_URL, RUHUL_PHOTO_URL } from './types';

export interface GameTextureSet {
  trackBed: THREE.CanvasTexture;
  platform: THREE.CanvasTexture;
  barrierStripes: THREE.CanvasTexture;
  trainLiveryEmerald: THREE.CanvasTexture;
  trainLiveryCrimson: THREE.CanvasTexture;
  trainLiveryCobalt: THREE.CanvasTexture;
  buildingFacadeA: THREE.CanvasTexture;
  buildingFacadeB: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  ruhulCapPattern: THREE.CanvasTexture;
  hujurPanjabiPattern: THREE.CanvasTexture;
  ruhulFace: THREE.CanvasTexture;
  hujurFace: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function createTrackBedTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#3b3734';
  ctx.fillRect(0, 0, 512, 512);

  // Ballast gravel speckles
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 40 + Math.floor(Math.random() * 44);
    const warm = Math.floor(Math.random() * 8);
    ctx.fillStyle = `rgb(${shade + warm},${shade + 2},${shade - 2})`;
    ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  // Subtle lane dividers / track bed shading
  ctx.fillStyle = 'rgba(18, 16, 15, 0.24)';
  ctx.fillRect(166, 0, 10, 512);
  ctx.fillRect(336, 0, 10, 512);

  const tex = finalizeColorTexture(canvas, anisotropy, 1, 6);
  return tex;
}

function createPlatformTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = '#737982';
  ctx.fillRect(0, 0, 256, 512);

  // Tile seams
  ctx.strokeStyle = 'rgba(42, 46, 54, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y <= 512; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  for (let x = 0; x <= 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }

  // Subtle surface grain
  for (let i = 0; i < 1100; i++) {
    const shade = 100 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgba(${shade},${shade + 2},${shade + 6},0.22)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
  }

  // Tactile yellow warning edge strip along inner edge
  ctx.fillStyle = '#f2b705';
  ctx.fillRect(0, 0, 22, 512);
  ctx.fillStyle = '#d49a00';
  for (let y = 0; y < 512; y += 16) {
    ctx.fillRect(4, y + 3, 14, 6);
  }

  return finalizeColorTexture(canvas, anisotropy, 1, 4);
}

function createBarrierStripesTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 128);
  ctx.fillStyle = '#f8f5ef';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#d9362b';
  for (let x = -128; x < 640; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 96, 128);
    ctx.lineTo(x + 64, 128);
    ctx.closePath();
    ctx.fill();
  }
  // Top & bottom metal trim
  ctx.fillStyle = '#222831';
  ctx.fillRect(0, 0, 512, 10);
  ctx.fillRect(0, 118, 512, 10);
  return finalizeColorTexture(canvas, anisotropy);
}

function createTrainLiveryTexture(
  primary: string,
  accent: string,
  stripe: string,
  anisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 256);
  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, 512, 256);

  // Lower metallic band
  ctx.fillStyle = '#272c35';
  ctx.fillRect(0, 206, 512, 50);

  // Accent racing stripe
  ctx.fillStyle = accent;
  ctx.fillRect(0, 148, 512, 30);
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 178, 512, 10);

  // Metro side windows
  for (let x = 24; x < 480; x += 66) {
    ctx.fillStyle = '#182433';
    ctx.beginPath();
    ctx.roundRect(x, 42, 48, 76, 8);
    ctx.fill();
    // Window glass sheen
    const grad = ctx.createLinearGradient(x, 42, x + 48, 118);
    grad.addColorStop(0, 'rgba(130, 200, 240, 0.42)');
    grad.addColorStop(0.5, 'rgba(40, 70, 105, 0.15)');
    grad.addColorStop(1, 'rgba(170, 220, 255, 0.28)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x + 3, 45, 42, 70, 6);
    ctx.fill();
  }

  // Door seam lines
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3;
  ctx.strokeRect(150, 24, 58, 182);
  ctx.strokeRect(348, 24, 58, 182);

  return finalizeColorTexture(canvas, anisotropy);
}

function createBuildingFacadeTexture(
  wallColor: string,
  litColor: string,
  anisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 512);
  ctx.fillStyle = wallColor;
  ctx.fillRect(0, 0, 256, 512);

  for (let y = 18; y < 492; y += 34) {
    for (let x = 16; x < 236; x += 36) {
      const lit = Math.random() > 0.42;
      ctx.fillStyle = lit ? litColor : '#1c2430';
      ctx.fillRect(x, y, 22, 20);
      if (lit) {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x + 2, y + 2, 18, 6);
      }
    }
  }
  return finalizeColorTexture(canvas, anisotropy);
}

function createContactShadowTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(12, 14, 20, 0.62)');
  grad.addColorStop(0.55, 'rgba(12, 14, 20, 0.28)');
  grad.addColorStop(1, 'rgba(12, 14, 20, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return finalizeColorTexture(canvas, anisotropy);
}

function createRuhulCapTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#e7dcc8';
  ctx.fillRect(0, 0, 256, 128);
  // Burgundy embroidered diamond bands matching Ruhul's tupi
  ctx.fillStyle = '#6c242b';
  ctx.fillRect(0, 0, 256, 22);
  ctx.fillRect(0, 102, 256, 26);

  ctx.strokeStyle = '#732930';
  ctx.lineWidth = 4;
  for (let x = 0; x < 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 16, 26);
    ctx.lineTo(x + 30, 62);
    ctx.lineTo(x + 16, 98);
    ctx.lineTo(x + 2, 62);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#9e534a';
    ctx.beginPath();
    ctx.arc(x + 16, 62, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalizeColorTexture(canvas, anisotropy);
}

function createHujurPanjabiTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = '#1b3158';
  ctx.fillRect(0, 0, 256, 256);

  // Geometric subtle weave matching Hujur's dark blue panjabi
  ctx.strokeStyle = 'rgba(66, 108, 175, 0.35)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      ctx.strokeRect(x + 4, y + 4, 24, 24);
      ctx.fillStyle = 'rgba(92, 138, 210, 0.25)';
      ctx.fillRect(x + 12, y + 12, 8, 8);
    }
  }

  // Center placket & buttons
  ctx.fillStyle = '#132444';
  ctx.fillRect(114, 0, 28, 170);
  ctx.fillStyle = '#96a8c8';
  for (let y = 26; y <= 146; y += 30) {
    ctx.beginPath();
    ctx.arc(128, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalizeColorTexture(canvas, anisotropy);
}

function createPortraitFaceTexture(
  url: string,
  crop: { cx: number; cy: number; sizeFrac: number },
  labelBg: string,
  anisotropy: number
): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  // Warm skin/portrait fallback until image finishes decoding
  ctx.fillStyle = labelBg;
  ctx.fillRect(0, 0, 256, 256);

  const tex = finalizeColorTexture(canvas, anisotropy);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const minDim = Math.min(img.width, img.height);
    const cropSize = minDim * crop.sizeFrac;
    const sx = Math.max(0, Math.min(img.width - cropSize, img.width * crop.cx - cropSize * 0.5));
    const sy = Math.max(0, Math.min(img.height - cropSize, img.height * crop.cy - cropSize * 0.5));

    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 6, 6, 244, 244);
    ctx.restore();

    // Subtle crisp portrait ring so it reads vividly in 3D
    ctx.strokeStyle = '#f8f2e4';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.stroke();

    tex.needsUpdate = true;
  };
  img.src = url;
  return tex;
}

export function createGameTextureSet(anisotropy: number): GameTextureSet {
  const trackBed = createTrackBedTexture(anisotropy);
  const platform = createPlatformTexture(anisotropy);
  const barrierStripes = createBarrierStripesTexture(anisotropy);
  const trainLiveryEmerald = createTrainLiveryTexture('#187a62', '#f2b705', '#ffffff', anisotropy);
  const trainLiveryCrimson = createTrainLiveryTexture('#a8282b', '#f4d35e', '#f8f9fa', anisotropy);
  const trainLiveryCobalt = createTrainLiveryTexture('#1e4f8a', '#e8edf2', '#f97316', anisotropy);
  const buildingFacadeA = createBuildingFacadeTexture('#465063', '#ffd584', anisotropy);
  const buildingFacadeB = createBuildingFacadeTexture('#5d5159', '#9fd6ff', anisotropy);
  const contactShadow = createContactShadowTexture(anisotropy);
  const ruhulCapPattern = createRuhulCapTexture(anisotropy);
  const hujurPanjabiPattern = createHujurPanjabiTexture(anisotropy);

  // Crop Ruhul's face (Photo 1: top-center, slightly left-facing)
  const ruhulFace = createPortraitFaceTexture(
    RUHUL_PHOTO_URL,
    { cx: 0.505, cy: 0.11, sizeFrac: 0.195 },
    '#c6906f',
    anisotropy
  );

  // Crop Hujur's face (Photo 2: centered upper-middle)
  const hujurFace = createPortraitFaceTexture(
    HUJUR_PHOTO_URL,
    { cx: 0.485, cy: 0.382, sizeFrac: 0.22 },
    '#b88263',
    anisotropy
  );

  const all: THREE.Texture[] = [
    trackBed,
    platform,
    barrierStripes,
    trainLiveryEmerald,
    trainLiveryCrimson,
    trainLiveryCobalt,
    buildingFacadeA,
    buildingFacadeB,
    contactShadow,
    ruhulCapPattern,
    hujurPanjabiPattern,
    ruhulFace,
    hujurFace,
  ];

  return {
    trackBed,
    platform,
    barrierStripes,
    trainLiveryEmerald,
    trainLiveryCrimson,
    trainLiveryCobalt,
    buildingFacadeA,
    buildingFacadeB,
    contactShadow,
    ruhulCapPattern,
    hujurPanjabiPattern,
    ruhulFace,
    hujurFace,
    dispose: () => {
      all.forEach((t) => t.dispose());
    },
  };
}
