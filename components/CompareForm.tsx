"use client";
import { useState } from "react";
import type { City } from "@/lib/cities";
import CitySearch from "./CitySearch";
import { localToUTC } from "@/lib/cities";
import { computeZenith, angularSeparation, formatAngularSeparation } from "@/lib/astronomy";
import { findNearestStar, formatRA, formatDec, type Star } from "@/lib/stars";

interface BirthPoint {
  ra: number;
  dec: number;
  raFormatted: string;
  decFormatted: string;
  star: Star | null;
  starName: string;
}

interface Props {
  cities: City[];
  catalog: Star[];
  myPoint: BirthPoint;
}

export default function CompareForm({ cities, catalog, myPoint }: Props) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [city, setCity] = useState<City | null>(null);
  const [theirPoint, setTheirPoint] = useState<BirthPoint | null>(null);
  const [separation, setSeparation] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = () => {
    if (!date || !time || !city) return;
    setLoading(true);
    try {
      const utc = localToUTC(date, time, city.timezone);
      const zenith = computeZenith(utc, city.lat, city.lon);
      const { match } = findNearestStar(zenith.ra, zenith.dec, catalog);

      const point: BirthPoint = {
        ra: zenith.ra,
        dec: zenith.dec,
        raFormatted: zenith.raFormatted,
        decFormatted: zenith.decFormatted,
        star: match?.star ?? null,
        starName: match?.star.name ?? "uncharted space",
      };

      const sep = angularSeparation(myPoint.ra, myPoint.dec, point.ra, point.dec);
      setTheirPoint(point);
      setSeparation(sep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field"
          placeholder="Birth date"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="input-field"
          placeholder="Birth time"
        />
        <CitySearch
          cities={cities}
          value={city}
          onChange={setCity}
          placeholder="Their city"
        />
      </div>
      <button
        onClick={handleCompare}
        disabled={!date || !time || !city || loading}
        className="btn-secondary text-sm w-full"
      >
        {loading ? "Computing..." : "Compare points"}
      </button>

      {theirPoint && separation !== null && (
        <div className="space-y-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-cormorant italic text-amber-300/90">
              {formatAngularSeparation(separation)} apart in the sky
            </p>
            <p className="text-xs text-white/40 font-outfit mt-1">
              Angular separation on the celestial sphere
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-lg p-3 border border-white/5">
              <p className="text-xs text-white/40 font-outfit uppercase tracking-widest mb-1">Yours</p>
              <p className="text-sm text-white/80 font-outfit">{myPoint.starName}</p>
              <p className="text-xs text-white/30 font-mono mt-0.5">
                {myPoint.raFormatted} · {myPoint.decFormatted}
              </p>
            </div>
            <div className="glass rounded-lg p-3 border border-white/5">
              <p className="text-xs text-white/40 font-outfit uppercase tracking-widest mb-1">Theirs</p>
              <p className="text-sm text-white/80 font-outfit">{theirPoint.starName}</p>
              <p className="text-xs text-white/30 font-mono mt-0.5">
                {theirPoint.raFormatted} · {theirPoint.decFormatted}
              </p>
            </div>
          </div>

          {myPoint.star && theirPoint.star && (
            <p className="text-xs text-white/30 font-outfit text-center italic">
              Both points resolved to cataloged stars. Note: angular closeness in the sky doesn&apos;t mean physical closeness in space. These stars may be vastly different distances from Earth.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
