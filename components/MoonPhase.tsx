"use client";
import { useEffect, useRef } from "react";
import { renderMoonCanvas } from "@/lib/canvas";

interface Props {
  phase: number; // 0-1
  phaseName: string;
  size?: number;
}

export default function MoonPhase({ phase, phaseName, size = 60 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderMoonCanvas(canvas, phase, size);
  }, [phase, size]);

  return (
    <div className="flex items-center gap-3">
      <canvas ref={canvasRef} width={size} height={size} />
      <div>
        <p className="text-xs text-white/40 font-outfit uppercase tracking-widest mb-0.5">
          Moon at birth
        </p>
        <p className="text-sm text-white/80 font-outfit">{phaseName}</p>
      </div>
    </div>
  );
}
