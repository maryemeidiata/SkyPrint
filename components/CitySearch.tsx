"use client";
import { useState, useEffect, useRef } from "react";
import { searchCities, type City } from "@/lib/cities";

interface Props {
  cities: City[];
  value: City | null;
  onChange: (city: City) => void;
  placeholder?: string;
}

export default function CitySearch({ cities, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<City[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setResults(searchCities(query, cities));
  }, [query, cities]);

  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);

  const select = (city: City) => {
    onChange(city);
    setQuery(city.name);
    setOpen(false);
    setFocused(-1);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(f + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(f - 1, 0));
    } else if (e.key === "Enter" && focused >= 0) {
      e.preventDefault();
      select(results[focused]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setFocused(-1);
        }}
        onFocus={() => query.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKey}
        placeholder={placeholder ?? "Search cities..."}
        className="input-field w-full"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full glass rounded-xl border border-white/10 overflow-hidden shadow-2xl">
          {results.map((city, i) => (
            <li
              key={`${city.name}-${city.country}`}
              onMouseDown={() => select(city)}
              className={`px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors ${
                i === focused ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="text-sm text-white/90 font-outfit">{city.name}</span>
              <span className="text-xs text-white/40 font-outfit">{city.country}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
