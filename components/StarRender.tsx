"use client";
import { useEffect, useRef } from "react";
import { renderStarCanvas } from "@/lib/canvas";
import type { Star } from "@/lib/stars";

interface Props {
  seed: string;
  star: Star | null;
  size?: number;
  className?: string;
}

export default function StarRender({ seed, star, size = 300, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderStarCanvas(canvas, { seed, star, width: size, height: size });
  }, [seed, star, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
    />
  );
}
