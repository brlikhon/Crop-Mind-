import type { McpTool, McpToolResult, McpToolSchema } from "./types.js";

const REGION_COORDS: Record<string, { lat: number; lon: number }> = {
  "punjab": { lat: 30.79, lon: 75.84 },
  "maharashtra": { lat: 19.75, lon: 75.71 },
  "uttar pradesh": { lat: 26.85, lon: 80.91 },
  "central luzon": { lat: 15.47, lon: 120.59 },
  "central plains": { lat: 14.58, lon: 100.52 },
  "central highlands": { lat: 12.67, lon: 108.05 },
  "rangpur": { lat: 25.74, lon: 89.25 },
  "sumatra": { lat: 0.59, lon: 101.45 },
  "niigata": { lat: 37.90, lon: 139.02 },
  "new south wales": { lat: -33.87, lon: 151.21 },
  "kedah": { lat: 6.12, lon: 100.37 },
  "sindh": { lat: 25.40, lon: 68.37 },
  "dak lak": { lat: 12.67, lon: 108.05 },
  "delhi": { lat: 28.61, lon: 77.21 },
  "kolhapur": { lat: 16.69, lon: 74.23 },
  "bangkok": { lat: 13.76, lon: 100.50 },
  "manila": { lat: 14.60, lon: 120.98 },
  "ho chi minh city": { lat: 10.82, lon: 106.63 },
  "lahore": { lat: 31.55, lon: 74.35 },
  "karachi": { lat: 24.86, lon: 67.01 },
  "dhaka": { lat: 23.81, lon: 90.41 },
  "tokyo": { lat: 35.68, lon: 139.69 },
  "adelaide": { lat: -34.93, lon: 138.60 },
  "medan": { lat: 3.59, lon: 98.67 },
};

const schema: McpToolSchema = {
  name: "WeatherTool",
  description: "Fetches current weather conditions and 7-day agricultural forecast for an APAC region using the Open-Meteo API. Returns temperature, rainfall, humidity, wind, and UV data relevant to farming decisions.",
  params: [
    { name: "region", type: "string", required: false, description: "Region name (e.g., 'Punjab', 'Central Luzon'). Used to look up coordinates." },
    { name: "latitude", type: "number", required: false, description: "Latitude for direct coordinate lookup. Used if region is not provided." },
    { name: "longitude", type: "number", required: false, description: "Longitude for direct coordinate lookup. Used if region is not provided." },
  ],
};

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    weather_code?: number;
  };
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_sum?: number[];
    precipitation_probability_max?: number[];
    wind_speed_10m_max?: number[];
    uv_index_max?: number[];
  };
}

function weatherCodeToDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snowfall", 73: "Moderate snowfall", 75: "Heavy snowfall",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return descriptions[code] ?? "Unknown";
}

async function call(params: Record<string, unknown>): Promise<McpToolResult> {
  const start = Date.now();

  let lat: number | undefined;
  let lon: number | undefined;
  const region = typeof params.region === "string" ? params.region.toLowerCase().trim() : undefined;

  if (region && REGION_COORDS[region]) {
    lat = REGION_COORDS[region].lat;
    lon = REGION_COORDS[region].lon;
  } else if (typeof params.latitude === "number" && typeof params.longitude === "number") {
    lat = params.latitude;
    lon = params.longitude;
  } else if (region) {
    for (const [key, coords] of Object.entries(REGION_COORDS)) {
      if (key.includes(region) || region.includes(key)) {
        lat = coords.lat;
        lon = coords.lon;
        break;
      }
    }
  }

  if (lat === undefined || lon === undefined) {
    return {
      toolName: "WeatherTool",
      success: false,
      data: null,
      error: `Could not resolve coordinates for region '${params.region}'. Provide a known APAC region name or explicit latitude/longitude.`,
      durationMs: Date.now() - start,
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max&timezone=auto&forecast_days=7`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as OpenMeteoResponse;

    const current = data.current ?? {};
    const daily = data.daily ?? {};

    const totalRainfall7d = (daily.precipitation_sum ?? []).reduce((s, v) => s + v, 0);
    const avgMaxTemp = (daily.temperature_2m_max ?? []).length > 0
      ? (daily.temperature_2m_max ?? []).reduce((s, v) => s + v, 0) / (daily.temperature_2m_max ?? []).length
      : null;

    const result = {
      location: { region: params.region ?? "custom", latitude: lat, longitude: lon },
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        feelsLike: current.apparent_temperature,
        precipitation: current.precipitation,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        condition: weatherCodeToDescription(current.weather_code ?? 0),
      },
      forecast7Day: (daily.time ?? []).map((date, i) => ({
        date,
        tempMax: daily.temperature_2m_max?.[i],
        tempMin: daily.temperature_2m_min?.[i],
        precipitationMm: daily.precipitation_sum?.[i],
        precipitationProbability: daily.precipitation_probability_max?.[i],
        windSpeedMax: daily.wind_speed_10m_max?.[i],
        uvIndexMax: daily.uv_index_max?.[i],
      })),
      agriculturalSummary: {
        totalRainfall7dMm: Math.round(totalRainfall7d * 10) / 10,
        avgMaxTemp7d: avgMaxTemp !== null ? Math.round(avgMaxTemp * 10) / 10 : null,
        highRainfallDays: (daily.precipitation_sum ?? []).filter((v) => v > 10).length,
        sprayingWindowDays: (daily.precipitation_sum ?? []).filter((v, i) => v < 2 && (daily.wind_speed_10m_max?.[i] ?? 0) < 15).length,
      },
    };

    return {
      toolName: "WeatherTool",
      success: true,
      data: result,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      toolName: "WeatherTool",
      success: false,
      data: null,
      error: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - start,
    };
  }
}

export const weatherTool: McpTool = { schema, call };
