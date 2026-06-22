import * as Astronomy from "astronomy-engine";

export interface ZenithCoord {
  ra: number; // degrees
  dec: number; // degrees
  raFormatted: string;
  decFormatted: string;
}

export interface MoonPhaseResult {
  phase: number; // 0-1
  phaseName: string;
}

export interface PlanetVisibility {
  name: string;
  altitude: number; // degrees
  visible: boolean;
}

export function computeZenith(
  utcDate: Date,
  latDeg: number,
  lonDeg: number
): ZenithCoord {
  const time = new Astronomy.AstroTime(utcDate);

  // Zenith RA = Local Mean Sidereal Time, Zenith Dec = observer latitude
  const gmst = Astronomy.SiderealTime(time); // hours
  const lmst = ((gmst + lonDeg / 15) % 24 + 24) % 24;
  const raDeg = lmst * 15;
  const dec = latDeg;

  return {
    ra: raDeg,
    dec,
    raFormatted: formatRA(lmst),
    decFormatted: formatDec(dec),
  };
}

function formatRA(raHours: number): string {
  const h = Math.floor(raHours);
  const m = Math.floor((raHours - h) * 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function formatDec(dec: number): string {
  const sign = dec >= 0 ? "+" : "-";
  const abs = Math.abs(dec);
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  return `${sign}${d}° ${m.toString().padStart(2, "0")}'`;
}

export function computeMoonPhase(utcDate: Date): MoonPhaseResult {
  const time = new Astronomy.AstroTime(utcDate);
  const phase = Astronomy.MoonPhase(time); // 0-360

  const normalized = phase / 360;

  let phaseName: string;
  if (normalized < 0.0625 || normalized >= 0.9375) phaseName = "New Moon";
  else if (normalized < 0.1875) phaseName = "Waxing Crescent";
  else if (normalized < 0.3125) phaseName = "First Quarter";
  else if (normalized < 0.4375) phaseName = "Waxing Gibbous";
  else if (normalized < 0.5625) phaseName = "Full Moon";
  else if (normalized < 0.6875) phaseName = "Waning Gibbous";
  else if (normalized < 0.8125) phaseName = "Last Quarter";
  else phaseName = "Waning Crescent";

  return { phase: normalized, phaseName };
}

const PLANET_BODIES: Array<{ name: string; body: Astronomy.Body }> = [
  { name: "Mercury", body: Astronomy.Body.Mercury },
  { name: "Venus", body: Astronomy.Body.Venus },
  { name: "Mars", body: Astronomy.Body.Mars },
  { name: "Jupiter", body: Astronomy.Body.Jupiter },
  { name: "Saturn", body: Astronomy.Body.Saturn },
  { name: "Uranus", body: Astronomy.Body.Uranus },
  { name: "Neptune", body: Astronomy.Body.Neptune },
];

export function computePlanetVisibility(
  utcDate: Date,
  latDeg: number,
  lonDeg: number
): PlanetVisibility[] {
  const observer = new Astronomy.Observer(latDeg, lonDeg, 0);
  const time = new Astronomy.AstroTime(utcDate);

  return PLANET_BODIES.map(({ name, body }) => {
    try {
      const equatorial = Astronomy.Equator(body, time, observer, true, true);
      const horizontal = Astronomy.Horizon(time, observer, equatorial.ra, equatorial.dec, "normal");
      return { name, altitude: horizontal.altitude, visible: horizontal.altitude > 5 };
    } catch {
      return { name, altitude: -90, visible: false };
    }
  });
}

// Angular separation between two points on the sphere (degrees)
export function angularSeparation(
  ra1Deg: number,
  dec1Deg: number,
  ra2Deg: number,
  dec2Deg: number
): number {
  const toRad = Math.PI / 180;
  const r1 = ra1Deg * toRad;
  const d1 = dec1Deg * toRad;
  const r2 = ra2Deg * toRad;
  const d2 = dec2Deg * toRad;

  const cosAngle =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);

  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) / toRad;
}

export function formatAngularSeparation(deg: number): string {
  if (deg >= 1) return `${deg.toFixed(1)}°`;
  const arcmin = deg * 60;
  return `${arcmin.toFixed(0)}'`;
}
