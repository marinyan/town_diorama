import { WeatherMode } from './ambience';

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    precipitation?: number;
    snowfall?: number;
    snow_depth?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
  };
};

export type LiveWeatherResult = {
  weather: WeatherMode;
  temperatureC: number;
  weatherCode: number;
  cloudCover: number;
  precipitation: number;
  snowfallCm: number;
  snowDepthCm: number;
  windSpeedKmh: number;
  fetchedAt: string;
};

const SHINJUKU = {
  latitude: 35.6938,
  longitude: 139.7034,
};

function weatherCodeToMode(code: number, precipitation: number, cloudCover: number): WeatherMode {
  if (code >= 95) return 'thunderstorm';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (precipitation > 0.05) return 'rain';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 0 && cloudCover < 35) return 'clear';
  return 'cloudy';
}

export async function fetchShinjukuWeather(signal?: AbortSignal): Promise<LiveWeatherResult> {
  const params = new URLSearchParams({
    latitude: String(SHINJUKU.latitude),
    longitude: String(SHINJUKU.longitude),
    current: 'temperature_2m,weather_code,precipitation,snowfall,snow_depth,cloud_cover,wind_speed_10m',
    timezone: 'Asia/Tokyo',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoCurrent;
  const current = data.current;
  if (!current || current.temperature_2m === undefined || current.weather_code === undefined) {
    throw new Error('Weather response missing current values');
  }

  const precipitation = current.precipitation ?? 0;
  const snowfallCm = current.snowfall ?? 0;
  const snowDepthCm = current.snow_depth ?? 0;
  const cloudCover = current.cloud_cover ?? 0;
  const weatherCode = current.weather_code;
  const windSpeedKmh = current.wind_speed_10m ?? 0;

  return {
    weather: weatherCodeToMode(weatherCode, precipitation, cloudCover),
    temperatureC: Math.round(current.temperature_2m),
    weatherCode,
    cloudCover,
    precipitation,
    snowfallCm,
    snowDepthCm,
    windSpeedKmh,
    fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
