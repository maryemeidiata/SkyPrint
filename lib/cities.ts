export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  population: number;
}

let _cities: City[] | null = null;

export async function loadCities(): Promise<City[]> {
  if (_cities) return _cities;
  const res = await fetch("/data/cities.json");
  const raw: Array<[string, string, number, number, string, number]> =
    await res.json();
  _cities = raw.map(([name, country, lat, lon, timezone, population]) => ({
    name,
    country,
    lat,
    lon,
    timezone,
    population,
  }));
  return _cities;
}

export function searchCities(query: string, cities: City[], limit = 8): City[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return cities
    .filter(
      (c) =>
        c.name.toLowerCase().startsWith(q) ||
        c.name.toLowerCase().includes(q)
    )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return b.population - a.population;
    })
    .slice(0, limit);
}

// Convert local birth time to UTC using timezone
export function localToUTC(
  date: string, // YYYY-MM-DD
  time: string, // HH:MM
  timezone: string
): Date {
  // Use Intl to get the UTC offset for the given date/time in the timezone
  const localString = `${date}T${time}:00`;

  // Parse the local time in the given timezone by finding the UTC equivalent
  // We do this by formatting a known UTC time and comparing
  const estimate = new Date(`${localString}Z`);

  // Get the UTC offset at that estimated time in the target timezone
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Iteratively correct for the timezone offset
  const parts = formatter.formatToParts(estimate);
  const local = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const tzLocalString = `${local.year}-${local.month}-${local.day}T${local.hour}:${local.minute}:00`;
  const diffMs = new Date(tzLocalString + "Z").getTime() - estimate.getTime();

  return new Date(estimate.getTime() - diffMs);
}
