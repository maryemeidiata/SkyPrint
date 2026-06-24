import { createSeededRng } from "./seed";
import { colorFromSpectralType } from "./stars";
import type { Star } from "./stars";

export interface StarRenderConfig {
  seed: string;
  star: Star | null; // null = uncharted void
  width: number;
  height: number;
}

export function renderStarCanvas(
  canvas: HTMLCanvasElement,
  config: StarRenderConfig
) {
  const { seed, star, width, height } = config;
  const ctx = canvas.getContext("2d")!;
  const rng = createSeededRng(seed);
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);

  // Background
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
  if (star) {
    bg.addColorStop(0, "rgba(20, 10, 40, 0.0)");
    bg.addColorStop(1, "rgba(5, 2, 15, 0.0)");
  } else {
    bg.addColorStop(0, "rgba(5, 3, 12, 0.0)");
    bg.addColorStop(1, "rgba(2, 1, 8, 0.0)");
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  if (star) {
    renderFoundStar(ctx, cx, cy, width, height, star, rng);
  } else {
    renderVoid(ctx, cx, cy, width, height, rng);
  }
}

function renderFoundStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  star: Star,
  rng: () => number
) {
  const baseColor = colorFromSpectralType(star.spectralType);
  const magNorm = Math.max(0, Math.min(1, (4 - star.magnitude) / 6));
  const scale = Math.min(width, height) / 280;

  // Deep space base wash (subtle, keeps it from looking like a sticker on flat black)
  const baseWash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.65);
  baseWash.addColorStop(0, "rgba(30, 18, 60, 0.35)");
  baseWash.addColorStop(0.5, "rgba(14, 8, 32, 0.15)");
  baseWash.addColorStop(1, "rgba(3, 2, 10, 0)");
  ctx.fillStyle = baseWash;
  ctx.fillRect(0, 0, width, height);

  // Faint nebulosity clouds for depth
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const cloudCount = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < cloudCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = (40 + rng() * 90) * scale;
    const ncx = cx + Math.cos(angle) * dist;
    const ncy = cy + Math.sin(angle) * dist;
    const nr = (50 + rng() * 90) * scale;
    const cloud = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, nr);
    cloud.addColorStop(0, hexToRGBA(baseColor, 0.04 + rng() * 0.03));
    cloud.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cloud;
    ctx.beginPath();
    ctx.arc(ncx, ncy, nr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Background field stars (behind the glow)
  drawFieldStars(ctx, width, height, cx, cy, 60, rng);

  const coreRadius = (2.5 + magNorm * 4) * scale;
  const haloRadius = (50 + magNorm * 90) * scale;

  // === Additive glow stack ===
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Wide outer bloom
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius * 1.8);
  outerGlow.addColorStop(0, hexToRGBA(baseColor, 0.22 + magNorm * 0.12));
  outerGlow.addColorStop(0.25, hexToRGBA(baseColor, 0.08));
  outerGlow.addColorStop(0.6, hexToRGBA(baseColor, 0.02));
  outerGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, haloRadius * 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Tight inner bloom (white-hot)
  const innerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius * 0.55);
  innerGlow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  innerGlow.addColorStop(0.2, hexToRGBA(baseColor, 0.6));
  innerGlow.addColorStop(0.5, hexToRGBA(baseColor, 0.18));
  innerGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, haloRadius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Diffraction spikes — JWST-style 6-point: long vertical/horizontal pair + 4 diagonals
  const longLen = (90 + magNorm * 150) * scale;
  const spikeW = (1 + magNorm * 1.4) * scale;
  // primary cross (brightest, longest)
  drawSpikePair(ctx, cx, cy, 0 + jitter(rng), longLen, spikeW * 1.4, baseColor, magNorm);
  drawSpikePair(ctx, cx, cy, Math.PI / 2 + jitter(rng), longLen, spikeW * 1.4, baseColor, magNorm);
  // 4 diagonal shorter spikes
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2 + jitter(rng);
    drawSpikePair(ctx, cx, cy, a, longLen * (0.45 + rng() * 0.2), spikeW * 0.7, baseColor, magNorm * 0.7);
  }

  // White-hot core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 4);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.35, "rgba(255,255,255,0.85)");
  core.addColorStop(0.6, hexToRGBA(baseColor, 0.5));
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Solid blown-out center dot
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Fine grain over the bloom region
  drawGrain(ctx, cx, cy, haloRadius * 1.4, baseColor, 0.04, rng);
}

function jitter(rng: () => number): number {
  return (rng() - 0.5) * 0.08;
}

function renderVoid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  rng: () => number
) {
  const scale = Math.min(width, height) / 280;

  // Cold deep base — emptiness, not a glow
  const baseWash = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.7);
  baseWash.addColorStop(0, "rgba(12, 10, 26, 0.25)");
  baseWash.addColorStop(0.6, "rgba(5, 4, 14, 0.1)");
  baseWash.addColorStop(1, "rgba(2, 1, 8, 0)");
  ctx.fillStyle = baseWash;
  ctx.fillRect(0, 0, width, height);

  // The barest cold ember at center — almost nothing
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const ember = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * scale);
  ember.addColorStop(0, "rgba(120, 110, 180, 0.10)");
  ember.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ember;
  ctx.beginPath();
  ctx.arc(cx, cy, 30 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // A scattering of impossibly distant specks
  drawFieldStars(ctx, width, height, cx, cy, 22, rng);
}

// A diffraction spike that tapers to a point at both ends (drawn as a thin diamond),
// with a bright filament core. Assumes additive ("lighter") compositing is active.
function drawSpikePair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width_: number,
  color: string,
  brightness: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Soft taper body
  const grad = ctx.createLinearGradient(-length, 0, length, 0);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, hexToRGBA(color, 0.5 + brightness * 0.3));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-length, 0);
  ctx.lineTo(0, -width_);
  ctx.lineTo(length, 0);
  ctx.lineTo(0, width_);
  ctx.closePath();
  ctx.fill();

  // Bright thin filament
  const core = ctx.createLinearGradient(-length, 0, length, 0);
  core.addColorStop(0, "rgba(0,0,0,0)");
  core.addColorStop(0.5, hexToRGBA(color, 0.85 + brightness * 0.15));
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.strokeStyle = core;
  ctx.lineWidth = Math.max(0.6, width_ * 0.4);
  ctx.beginPath();
  ctx.moveTo(-length, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  ctx.restore();
}

function drawGrain(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  intensity: number,
  rng: () => number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const count = Math.floor(radius * 1.4);
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * radius;
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d;
    const falloff = 1 - d / radius;
    ctx.fillStyle = hexToRGBA(color, intensity * falloff * rng());
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}

function drawFieldStars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cx: number,
  cy: number,
  count: number,
  rng: () => number
) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const tints = ["255, 255, 255", "200, 210, 255", "255, 230, 200", "220, 200, 255"];
  for (let i = 0; i < count; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < 24) continue;
    const bright = rng();
    const r = 0.3 + bright * bright * 1.6;
    const opacity = 0.15 + bright * 0.55;
    const tint = tints[Math.floor(rng() * tints.length)];

    // tiny glow for the brighter ones
    if (bright > 0.8) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
      g.addColorStop(0, `rgba(${tint}, ${opacity * 0.5})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = `rgba(${tint}, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Moon phase canvas
export function renderMoonCanvas(
  canvas: HTMLCanvasElement,
  phase: number, // 0-1
  size: number
) {
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // Moon base (lit side)
  ctx.fillStyle = "rgba(230, 220, 200, 0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Shadow overlay
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const moonAngle = phase * Math.PI * 2;
  // 0 = new, 0.5 = full
  const cos = Math.cos(moonAngle);

  if (phase <= 0.5) {
    // Waxing: shadow on left
    ctx.fillStyle = "rgba(15, 8, 30, 0.92)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2);
    ctx.bezierCurveTo(
      cx + cos * r, cy - r,
      cx + cos * r, cy + r,
      cx, cy + r
    );
    ctx.closePath();
    ctx.fill();
  } else {
    // Waning: shadow on right
    ctx.fillStyle = "rgba(15, 8, 30, 0.92)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.bezierCurveTo(
      cx + cos * r, cy + r,
      cx + cos * r, cy - r,
      cx, cy - r
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Rim glow
  const rimGlow = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.3);
  rimGlow.addColorStop(0, "rgba(0,0,0,0)");
  rimGlow.addColorStop(0.7, "rgba(0,0,0,0)");
  rimGlow.addColorStop(1, "rgba(180, 160, 220, 0.12)");
  ctx.fillStyle = rimGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
}

// Starfield background
export interface Star2D {
  x: number;
  y: number;
  r: number;
  opacity: number;
  twinkleOffset: number;
  twinkleSpeed: number;
}

export function generateStarfield(width: number, height: number, count: number): Star2D[] {
  const stars: Star2D[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.3 + Math.random() * 1.2,
      opacity: 0.2 + Math.random() * 0.6,
      twinkleOffset: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.3 + Math.random() * 1.2,
    });
  }
  return stars;
}
