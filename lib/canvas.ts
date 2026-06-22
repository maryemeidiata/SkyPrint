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
  // Map magnitude: brighter (lower) = larger. Range roughly -2 to +4 for visible
  const magNorm = Math.max(0, Math.min(1, (4 - star.magnitude) / 6));
  // Map distance: closer = warmer halo, farther = cooler
  const distNorm = Math.min(1, star.distance / 500);

  const coreRadius = 2 + magNorm * 4 + rng() * 2;
  const haloRadius = 40 + magNorm * 80 + rng() * 40;

  // Outer glow
  const outerGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius * 1.5);
  outerGlow.addColorStop(0, hexToRGBA(baseColor, 0.12 + magNorm * 0.08));
  outerGlow.addColorStop(0.4, hexToRGBA(baseColor, 0.05));
  outerGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.ellipse(cx, cy, haloRadius * 1.5, haloRadius * 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Mid halo
  const midHalo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloRadius);
  midHalo.addColorStop(0, hexToRGBA(baseColor, 0.4 + magNorm * 0.2));
  midHalo.addColorStop(0.3, hexToRGBA(baseColor, 0.15));
  midHalo.addColorStop(0.7, hexToRGBA(baseColor, 0.04));
  midHalo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = midHalo;
  ctx.beginPath();
  ctx.ellipse(cx, cy, haloRadius, haloRadius, 0, 0, Math.PI * 2);
  ctx.fill();

  // Diffraction spikes
  const numSpikes = 4 + Math.floor(rng() * 4) * 2; // 4, 6, or 8 (even for symmetry)
  const spikeCount = Math.floor(numSpikes / 2); // pairs
  const spikeBaseLength = 60 + magNorm * 120;

  for (let i = 0; i < spikeCount; i++) {
    // Primary angle with small jitter
    const angle = (i / spikeCount) * Math.PI + rng() * 0.15 - 0.075;
    // Vary lengths: some long, some short
    const lengthMultiplier = i === 0 ? 1.0 : (i === 1 ? 0.85 : 0.5 + rng() * 0.3);
    const length = spikeBaseLength * lengthMultiplier;
    const width_ = 1.5 + magNorm * 1.5;

    drawSpike(ctx, cx, cy, angle, length, width_, baseColor, magNorm);
    drawSpike(ctx, cx, cy, angle + Math.PI, length, width_, baseColor, magNorm);
  }

  // Core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 3);
  core.addColorStop(0, "#ffffff");
  core.addColorStop(0.3, hexToRGBA(baseColor, 0.95));
  core.addColorStop(0.7, hexToRGBA(baseColor, 0.4));
  core.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 3, 0, Math.PI * 2);
  ctx.fill();

  // Tiny bright core dot
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Scattered dust specks around the halo
  const grainCount = 15 + Math.floor(rng() * 20);
  for (let i = 0; i < grainCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = haloRadius * (0.3 + rng() * 0.8);
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const sr = 0.5 + rng() * 1;
    ctx.fillStyle = hexToRGBA(baseColor, 0.1 + rng() * 0.2);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Background field stars
  drawFieldStars(ctx, width, height, cx, cy, 25, rng);
}

function renderVoid(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  width: number,
  height: number,
  rng: () => number
) {
  // Very faint center glow
  const faintGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
  faintGlow.addColorStop(0, "rgba(60, 40, 100, 0.06)");
  faintGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = faintGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 80, 0, Math.PI * 2);
  ctx.fill();

  // A few extremely distant specks, very faint
  const speckCount = 4 + Math.floor(rng() * 5);
  for (let i = 0; i < speckCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = 20 + rng() * 80;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    ctx.fillStyle = `rgba(180, 160, 220, ${0.05 + rng() * 0.08})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.5 + rng() * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Background field stars — fewer, dimmer
  drawFieldStars(ctx, width, height, cx, cy, 8, rng);
}

function drawSpike(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  length: number,
  width_: number,
  color: string,
  brightness: number
) {
  const gradient = ctx.createLinearGradient(
    cx, cy,
    cx + Math.cos(angle) * length,
    cy + Math.sin(angle) * length
  );
  gradient.addColorStop(0, hexToRGBA(color, 0.8 + brightness * 0.2));
  gradient.addColorStop(0.3, hexToRGBA(color, 0.3));
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = width_;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
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
  for (let i = 0; i < count; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const dist = Math.hypot(x - cx, y - cy);
    if (dist < 30) continue;
    const r = 0.5 + rng() * 1;
    const opacity = 0.2 + rng() * 0.4;
    ctx.fillStyle = `rgba(200, 190, 230, ${opacity})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
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
