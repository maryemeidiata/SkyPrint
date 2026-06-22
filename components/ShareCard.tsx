"use client";
import { useRef } from "react";
import { renderStarCanvas, renderMoonCanvas } from "@/lib/canvas";
import type { Star } from "@/lib/stars";
import type { MoonPhaseResult } from "@/lib/astronomy";

interface Props {
  seed: string;
  star: Star | null;
  raFormatted: string;
  decFormatted: string;
  moonPhase: MoonPhaseResult;
  birthYear: number;
}

export default function ShareCard({ seed, star, raFormatted, decFormatted, moonPhase, birthYear }: Props) {
  const handleExport = () => {
    const W = 1080;
    const H = 1920;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0d0820");
    bg.addColorStop(0.5, "#130e2e");
    bg.addColorStop(1, "#0a061a");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Scattered background stars
    const rng = mulberry32(hashString(seed));
    for (let i = 0; i < 180; i++) {
      const x = rng() * W;
      const y = rng() * H;
      const r = 0.4 + rng() * 1.2;
      ctx.fillStyle = `rgba(200, 190, 240, ${0.15 + rng() * 0.45})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Star render in center
    const starSize = 600;
    const starCanvas = document.createElement("canvas");
    starCanvas.width = starSize;
    starCanvas.height = starSize;
    renderStarCanvas(starCanvas, { seed, star, width: starSize, height: starSize });
    ctx.drawImage(starCanvas, (W - starSize) / 2, 380);

    // Moon phase small
    const moonSize = 80;
    const moonCanvas = document.createElement("canvas");
    moonCanvas.width = moonSize;
    moonCanvas.height = moonSize;
    renderMoonCanvas(moonCanvas, moonPhase.phase, moonSize);
    ctx.drawImage(moonCanvas, W / 2 - moonSize / 2, H - 420);

    // Text
    ctx.textAlign = "center";

    // Title
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.font = "italic 52px serif";
    ctx.fillText("SkyPrint", W / 2, 120);

    // Tagline
    ctx.fillStyle = "rgba(180, 160, 240, 0.7)";
    ctx.font = "24px sans-serif";
    ctx.fillText("your zenith, the night you arrived", W / 2, 175);

    // Coordinate
    ctx.fillStyle = "rgba(255, 200, 80, 0.9)";
    ctx.font = "bold 34px monospace";
    ctx.fillText(`RA ${raFormatted}  ·  Dec ${decFormatted}`, W / 2, 320);

    // Star name or uncharted
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.font = "italic 44px serif";
    ctx.fillText(star ? star.name : "Uncharted", W / 2, 1020);

    if (star) {
      ctx.fillStyle = "rgba(180, 160, 240, 0.7)";
      ctx.font = "26px sans-serif";
      ctx.fillText(`${star.distance.toLocaleString()} light years away`, W / 2, 1075);

      const lightYear = birthYear - Math.round(star.distance);
      if (lightYear > 0) {
        ctx.fillText(`light that left in ${lightYear}`, W / 2, 1115);
      }
    }

    // Moon label
    ctx.fillStyle = "rgba(180, 160, 240, 0.6)";
    ctx.font = "22px sans-serif";
    ctx.fillText(moonPhase.phaseName, W / 2, H - 310);

    // Footer
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.font = "20px sans-serif";
    ctx.fillText("skyprint.vercel.app", W / 2, H - 60);

    // Download
    const link = document.createElement("a");
    link.download = "skyprint.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <button
      onClick={handleExport}
      className="btn-secondary text-sm"
    >
      Save your card
    </button>
  );
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
