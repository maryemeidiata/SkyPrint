"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Starfield from "@/components/Starfield";
import CitySearch from "@/components/CitySearch";
import StarRender from "@/components/StarRender";
import MoonPhase from "@/components/MoonPhase";
import CompareForm from "@/components/CompareForm";
import ShareCard from "@/components/ShareCard";
import { loadCities, localToUTC, type City } from "@/lib/cities";
import { loadStarCatalog, findNearestStar, lightTravelYear, type Star } from "@/lib/stars";
import { computeZenith, computeMoonPhase, computePlanetVisibility, type MoonPhaseResult, type PlanetVisibility } from "@/lib/astronomy";
import { seedFrom } from "@/lib/seed";

interface SkyResult {
  seed: string;
  raDeg: number;
  decDeg: number;
  raFormatted: string;
  decFormatted: string;
  star: Star | null;
  moonPhase: MoonPhaseResult;
  planets: PlanetVisibility[];
  neighbors: Array<{ star: Star; separation: number }>;
  birthYear: number;
  generatedDistance: number | null;
}

type ExpandedSection = "moon" | "planets" | "neighbors" | "compare" | "save" | null;

export default function Home() {
  const [cities, setCities] = useState<City[]>([]);
  const [catalog, setCatalog] = useState<Star[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [city, setCity] = useState<City | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<SkyResult | null>(null);
  const [phase, setPhase] = useState<"input" | "transition" | "result">("input");
  const [expanded, setExpanded] = useState<ExpandedSection>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([loadCities(), loadStarCatalog()]).then(([c, s]) => {
      setCities(c);
      setCatalog(s);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !city || submitting) return;

    setSubmitting(true);
    setPhase("transition");

    try {
      const utc = localToUTC(date, time, city.timezone);
      const zenith = computeZenith(utc, city.lat, city.lon);
      const { match, neighbors } = findNearestStar(zenith.ra, zenith.dec, catalog);
      const moonPhase = computeMoonPhase(utc);
      const planets = computePlanetVisibility(utc, city.lat, city.lon);
      const birthYear = utc.getFullYear();

      let generatedDistance: number | null = null;
      if (!match) {
        const h = simpleHash(seedFrom(date, time, city.name));
        generatedDistance = 1e8 + (h % 4900000000) * 1000;
      }

      const skyResult: SkyResult = {
        seed: seedFrom(date, time, city.name),
        raDeg: zenith.ra,
        decDeg: zenith.dec,
        raFormatted: zenith.raFormatted,
        decFormatted: zenith.decFormatted,
        star: match?.star ?? null,
        moonPhase,
        planets,
        neighbors,
        birthYear,
        generatedDistance,
      };

      setResult(skyResult);
      setExpanded(null);

      await new Promise((r) => setTimeout(r, 900));
      setPhase("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      console.error(err);
      setPhase("input");
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (section: ExpandedSection) => {
    setExpanded((prev) => (prev === section ? null : section));
  };

  const visiblePlanets = result?.planets.filter((p) => p.visible) ?? [];

  return (
    <main className="relative min-h-screen">
      <Starfield />

      <div className="relative z-10 flex flex-col items-center px-4 py-16 sm:py-24">

        {/* Input section */}
        <AnimatePresence>
          {phase === "input" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -32 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="w-full max-w-lg mx-auto"
            >
              <div className="text-center mb-12">
                <motion.h1
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="font-cormorant italic text-6xl sm:text-7xl text-white/90 mb-5"
                >
                  SkyPrint
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="font-cormorant italic text-xl sm:text-2xl text-purple-300/70 leading-relaxed max-w-sm mx-auto"
                >
                  The sky has a precise direction it was pointing when you arrived.
                  We find what&apos;s actually there.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="glass-card p-7 sm:p-8"
              >
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs text-white/35 font-outfit uppercase tracking-widest mb-2">
                      Birth date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/35 font-outfit uppercase tracking-widest mb-2">
                      Birth time{" "}
                      <span className="normal-case text-white/20">(local time at birth city)</span>
                    </label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/35 font-outfit uppercase tracking-widest mb-2">
                      Birth city
                    </label>
                    {!loading && (
                      <CitySearch
                        cities={cities}
                        value={city}
                        onChange={setCity}
                        placeholder="Start typing a city..."
                      />
                    )}
                    {loading && (
                      <div className="input-field opacity-40 cursor-not-allowed">Loading cities...</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={!date || !time || !city || loading || submitting}
                    className="btn-primary w-full mt-1"
                  >
                    {submitting ? "Mapping your zenith..." : "Enter the sky"}
                  </button>
                </form>

                <p className="mt-5 text-xs text-white/20 font-outfit text-center leading-relaxed">
                  The coordinate is computed from real orbital mechanics using your exact birth moment.
                  If your city isn&apos;t listed, pick the nearest major one.
                </p>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Transition */}
        <AnimatePresence>
          {phase === "transition" && (
            <motion.div
              key="transition"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-[#07041a]/60 backdrop-blur-sm"
            >
              <div className="text-center">
                <motion.div
                  animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.4, 0.9, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-full border border-purple-400/40 mx-auto mb-6"
                  style={{ boxShadow: "0 0 60px rgba(180, 140, 220, 0.25), inset 0 0 30px rgba(180, 140, 220, 0.05)" }}
                />
                <p className="font-cormorant italic text-2xl text-purple-300/60 tracking-wide">
                  Mapping your zenith
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {phase === "result" && result && (
            <motion.div
              key="result"
              ref={resultRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-2xl mx-auto space-y-6"
            >
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => { setPhase("input"); setResult(null); }}
                className="text-xs text-white/30 font-outfit hover:text-white/55 transition-colors flex items-center gap-1.5"
              >
                <span>←</span> Start over
              </motion.button>

              {/* Hero card */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="glass-card p-8 sm:p-10 text-center"
              >
                <div className="flex justify-center mb-7 -mt-2">
                  <StarRender
                    seed={result.seed}
                    star={result.star}
                    size={340}
                  />
                </div>

                <div className="flex justify-center mb-6">
                  <span className="coord-tag">
                    RA {result.raFormatted} &nbsp;·&nbsp; Dec {result.decFormatted}
                  </span>
                </div>

                {result.star ? (
                  <div>
                    <h2 className="font-cormorant italic text-4xl sm:text-5xl text-white/93 mb-1">
                      {result.star.name}
                    </h2>
                    <p className="text-sm text-purple-300/50 font-outfit mb-6">
                      {result.star.spectralType} · magnitude {result.star.magnitude.toFixed(2)}
                    </p>
                    <div className="space-y-2 max-w-md mx-auto">
                      <p className="font-outfit text-white/70">
                        <span className="text-amber-400/90 font-medium">
                          {result.star.distance < 1000
                            ? `${result.star.distance.toLocaleString()} light years`
                            : `${(result.star.distance / 1000).toFixed(1)}k light years`}
                        </span>{" "}
                        from here.
                      </p>
                      {(() => {
                        const departedYear = lightTravelYear(result.star.distance, result.birthYear);
                        if (departedYear > 0) {
                          return (
                            <p className="font-cormorant italic text-lg text-white/55 leading-relaxed">
                              The light reaching Earth tonight from this direction left in{" "}
                              <span className="text-amber-300/75">{departedYear}</span>.
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-cormorant italic text-4xl sm:text-5xl text-white/45 mb-2">
                      Uncharted
                    </h2>
                    <div className="max-w-md mx-auto space-y-4">
                      <p className="text-xs text-amber-400/45 font-outfit border border-amber-400/10 rounded-xl px-4 py-3 bg-amber-400/5 leading-relaxed">
                        The coordinate above is real. What follows is generated: nothing is cataloged in this direction,
                        so we placed a point for you in the unlit deep.
                      </p>
                      <p className="font-cormorant italic text-xl text-white/45 leading-relaxed">
                        Your zenith pointed into a void{" "}
                        <span className="text-amber-300/55">
                          {result.generatedDistance !== null
                            ? formatDistance(result.generatedDistance)
                            : "beyond measure"}
                        </span>{" "}
                        wide.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Chips */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="flex flex-wrap gap-2 justify-center"
              >
                <button className="chip" aria-expanded={expanded === "moon"} onClick={() => toggle("moon")}>
                  <span>◐</span> Moon phase
                </button>
                <button className="chip" aria-expanded={expanded === "planets"} onClick={() => toggle("planets")}>
                  <span>◎</span> Planets visible
                </button>
                {result.star && (
                  <button className="chip" aria-expanded={expanded === "neighbors"} onClick={() => toggle("neighbors")}>
                    <span>✦</span> Cosmic neighbors
                  </button>
                )}
                <button className="chip" aria-expanded={expanded === "compare"} onClick={() => toggle("compare")}>
                  <span>⊕</span> Compare with a friend
                </button>
                <button className="chip" aria-expanded={expanded === "save"} onClick={() => toggle("save")}>
                  <span>↓</span> Save your card
                </button>
              </motion.div>

              {/* Expanded content */}
              <AnimatePresence mode="wait">
                {expanded && (
                  <motion.div
                    key={expanded}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="glass-card p-6 sm:p-7">

                      {expanded === "moon" && (
                        <MoonPhase
                          phase={result.moonPhase.phase}
                          phaseName={result.moonPhase.phaseName}
                          size={68}
                        />
                      )}

                      {expanded === "planets" && (
                        <div>
                          <p className="text-xs text-white/35 font-outfit uppercase tracking-widest mb-4">
                            Above the horizon at your birth moment
                          </p>
                          {visiblePlanets.length > 0 ? (
                            <ul className="space-y-2.5">
                              {visiblePlanets.map((p) => (
                                <li key={p.name} className="flex items-center justify-between">
                                  <span className="text-sm text-white/75 font-outfit">{p.name}</span>
                                  <span className="text-xs text-white/30 font-outfit">
                                    {p.altitude.toFixed(1)}° above horizon
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-white/35 font-outfit italic">
                              No planets were above the horizon at this moment and location.
                            </p>
                          )}
                        </div>
                      )}

                      {expanded === "neighbors" && result.neighbors.length > 0 && (
                        <div>
                          <p className="text-xs text-white/35 font-outfit uppercase tracking-widest mb-4">
                            Nearby in the sky, not necessarily in space
                          </p>
                          <ul className="space-y-3.5">
                            {result.neighbors.map(({ star, separation }) => (
                              <li key={star.name} className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-sm text-white/70 font-outfit">{star.name}</p>
                                  <p className="text-xs text-white/28 font-outfit">
                                    {star.distance.toLocaleString()} light years · {star.spectralType}
                                  </p>
                                </div>
                                <span className="text-xs text-amber-400/55 font-outfit whitespace-nowrap pt-0.5">
                                  {separation.toFixed(1)}° away
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {expanded === "compare" && (
                        <div>
                          <p className="text-xs text-white/35 font-outfit uppercase tracking-widest mb-4">
                            Find a friend&apos;s zenith
                          </p>
                          <CompareForm
                            cities={cities}
                            catalog={catalog}
                            myPoint={{
                              ra: result.raDeg,
                              dec: result.decDeg,
                              raFormatted: result.raFormatted,
                              decFormatted: result.decFormatted,
                              star: result.star,
                              starName: result.star?.name ?? "uncharted space",
                            }}
                          />
                        </div>
                      )}

                      {expanded === "save" && (
                        <div className="text-center space-y-3">
                          <p className="text-xs text-white/35 font-outfit uppercase tracking-widest">
                            Export your SkyPrint
                          </p>
                          <p className="text-sm text-white/40 font-outfit">
                            A portrait card with your coordinate, star, and moon phase.
                          </p>
                          <ShareCard
                            seed={result.seed}
                            star={result.star}
                            raFormatted={result.raFormatted}
                            decFormatted={result.decFormatted}
                            moonPhase={result.moonPhase}
                            birthYear={result.birthYear}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-xs text-white/18 font-outfit pb-10 leading-relaxed max-w-md mx-auto"
              >
                The coordinate and any named stars are real, from a bundled star catalog.
                Planet visibility and moon phase are computed from actual orbital data.
                Uncharted results are generated and labeled clearly.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function formatDistance(ly: number): string {
  if (ly >= 1e9) return `${(ly / 1e9).toFixed(1)} billion light years`;
  if (ly >= 1e6) return `${(ly / 1e6).toFixed(0)} million light years`;
  return `${Math.round(ly).toLocaleString()} light years`;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  }
  return h;
}
