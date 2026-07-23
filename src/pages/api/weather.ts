import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Current weather in Bengaluru via Open-Meteo (no API key required).
 * Returns { temp: number, phrase: string } — temp is a rounded integer °C,
 * phrase is a short lowercase line in the site's voice mapped from the
 * WMO weather code.
 */

const LATITUDE = 12.9716;
const LONGITUDE = 77.5946;

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast` +
  `?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  `&current=temperature_2m,weather_code`;

/**
 * Exhaustive WMO present-weather code table (0–99), grouped by range.
 * Ordered; first range containing the code wins. Open-Meteo emits a
 * subset of these, but every code has a home so nothing falls through.
 */
const WMO_PHRASES: ReadonlyArray<readonly [min: number, max: number, phrase: string]> = [
  [0, 0, 'clear skies'],
  [1, 2, 'a few clouds'],
  [3, 3, 'monsoon clouds'],
  [4, 12, 'haze in the air'], // smoke, haze, dust, mist
  [13, 19, 'storm on the horizon'], // lightning / precipitation in sight, not at station
  [20, 29, 'rain just passed'], // precipitation during the preceding hour
  [30, 39, 'dust on the wind'], // duststorm, sandstorm, blowing snow
  [40, 49, 'fog over the city'], // fog and ice fog (incl. 45, 48)
  [50, 50, 'light drizzle'],
  [51, 51, 'light drizzle'],
  [52, 53, 'steady drizzle'],
  [54, 55, 'heavy drizzle'],
  [56, 57, 'freezing drizzle'],
  [58, 59, 'drizzle and rain'],
  [60, 61, 'light rain'],
  [62, 63, 'steady rain'],
  [64, 65, 'heavy rain'],
  [66, 67, 'freezing rain'],
  [68, 69, 'sleet coming down'], // rain or drizzle mixed with snow
  [70, 71, 'light snow'],
  [72, 73, 'steady snow'],
  [74, 75, 'heavy snow'],
  [76, 79, 'ice in the air'], // diamond dust, snow grains, ice pellets
  [80, 82, 'passing showers'],
  [83, 84, 'sleet showers'],
  [85, 86, 'snow showers'],
  [87, 90, 'hail rattling down'], // showers of snow/ice pellets or hail
  [91, 94, 'thunder just passed'], // thunderstorm during preceding hour
  [95, 99, 'thunder somewhere'],
];

function phraseFor(code: number): string {
  for (const [min, max, phrase] of WMO_PHRASES) {
    if (code >= min && code <= max) return phrase;
  }
  return 'sky undecided'; // out-of-range / unknown code
}

const json = (body: unknown, sMaxage: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${sMaxage}, stale-while-revalidate=${sMaxage * 2}`,
    },
  });

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(OPEN_METEO_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`open-meteo responded ${res.status}`);

    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };

    const temperature = data.current?.temperature_2m;
    const code = data.current?.weather_code;
    if (typeof temperature !== 'number' || typeof code !== 'number') {
      throw new Error('open-meteo payload missing current weather');
    }

    return json({ temp: Math.round(temperature), phrase: phraseFor(code) }, 3600);
  } catch {
    // Degradation contract: upstream failure → 200 with null fields, short cache.
    return json({ temp: null, phrase: null }, 60);
  }
};
