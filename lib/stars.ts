import { angularSeparation } from "./astronomy";

export interface Star {
  name: string;
  ra: number; // degrees
  dec: number; // degrees
  distance: number; // light years
  magnitude: number;
  spectralType: string;
}

let _catalog: Star[] | null = null;

export async function loadStarCatalog(): Promise<Star[]> {
  if (_catalog) return _catalog;
  const res = await fetch("/data/stars.json");
  const raw: Array<[string, number, number, number, number, string]> =
    await res.json();
  _catalog = raw.map(([name, ra, dec, distance, magnitude, spectralType]) => ({
    name,
    ra,
    dec,
    distance,
    magnitude,
    spectralType,
  }));
  return _catalog;
}

export interface StarMatch {
  star: Star;
  separation: number; // degrees
}

export interface CatalogResult {
  type: "star" | "uncharted";
  match?: StarMatch;
  neighbors: StarMatch[];
  raDeg: number;
  decDeg: number;
  raFormatted: string;
  decFormatted: string;
}

export function findNearestStar(
  raDeg: number,
  decDeg: number,
  catalog: Star[],
  threshold = 4.0
): { match: StarMatch | null; neighbors: StarMatch[] } {
  const distances = catalog
    .map((star) => ({
      star,
      separation: angularSeparation(raDeg, decDeg, star.ra, star.dec),
    }))
    .sort((a, b) => a.separation - b.separation);

  const match = distances[0].separation <= threshold ? distances[0] : null;
  // Neighbors: next 2-3 closest, excluding the match itself
  const start = match ? 1 : 0;
  const neighbors = distances.slice(start, start + 3);

  return { match, neighbors };
}

export function formatRA(raDeg: number): string {
  const raHours = raDeg / 15;
  const h = Math.floor(raHours);
  const m = Math.floor((raHours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function formatDec(dec: number): string {
  const sign = dec >= 0 ? "+" : "-";
  const abs = Math.abs(dec);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  return `${sign}${d}° ${m.toString().padStart(2, "0")}'`;
}

export function lightTravelYear(distanceLY: number, birthYear: number): number {
  return birthYear - Math.round(distanceLY);
}

export function colorFromSpectralType(spectralType: string): string {
  const t = spectralType[0].toUpperCase();
  switch (t) {
    case "O": return "#9bb0ff";
    case "B": return "#aabfff";
    case "A": return "#cad7ff";
    case "F": return "#f8f7ff";
    case "G": return "#fff4e8";
    case "K": return "#ffd2a1";
    case "M": return "#ffcc6f";
    case "W": return "#c2f5ff";
    case "L": return "#ff5a00";
    default: return "#ffffff";
  }
}
