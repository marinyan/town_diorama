export type WeatherMode = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';
export type TimePreset = 'morning' | 'noon' | 'dusk' | 'night' | 'lateNight';

export type MockAmbienceState = {
  location: 'Shinjuku';
  localTime: string;
  weather: WeatherMode;
  temperatureC: number;
  precipitationMm: number;
  windSpeedKmh: number;
  isWeekend: boolean;
  isHoliday: boolean;
};

export type Ambience = {
  state: MockAmbienceState;
  timePreset: TimePreset;
  skyColor: string;
  fogColor: string;
  sunlightIntensity: number;
  signEmissiveIntensity: number;
  windowLightProbability: number;
  pedestrianDensity: number;
  nightlifeDensity: number;
  umbrellaRatio: number;
  rainIntensity: number;
  wetRoadReflection: number;
  ambientSoundMood: string;
};

const getHour = (localTime: string) => Number(localTime.split(':')[0] ?? 12);

export function getTimePreset(localTime: string): TimePreset {
  const hour = getHour(localTime);
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 16) return 'noon';
  if (hour >= 16 && hour < 19) return 'dusk';
  if (hour >= 19 && hour < 24) return 'night';
  return 'lateNight';
}

export function getAmbienceFromState(state: MockAmbienceState): Ambience {
  const timePreset = getTimePreset(state.localTime);
  const weekendBoost = state.isWeekend || state.isHoliday ? 0.18 : 0;
  const weatherDim =
    state.weather === 'clear'
      ? 0
      : state.weather === 'cloudy'
        ? 0.18
        : state.weather === 'fog'
          ? 0.28
          : state.weather === 'snow'
            ? 0.24
            : state.weather === 'thunderstorm'
              ? 0.42
              : 0.3;
  const rainIntensity = Math.min(1, Math.max(0, state.precipitationMm / (state.weather === 'drizzle' ? 1.6 : 3)));
  const umbrellaRatio =
    state.weather === 'rain' || state.weather === 'thunderstorm'
      ? Math.min(0.68, 0.18 + rainIntensity * 0.5)
      : state.weather === 'drizzle'
        ? Math.min(0.34, 0.08 + rainIntensity * 0.22)
      : state.weather === 'snow'
        ? Math.min(0.12, 0.02 + rainIntensity * 0.08)
      : state.weather === 'cloudy' || state.weather === 'fog'
        ? Math.min(0.06, 0.01 + rainIntensity * 0.2)
        : 0.005;

  const byTime: Record<
    TimePreset,
    Omit<Ambience, 'state' | 'timePreset' | 'ambientSoundMood' | 'umbrellaRatio' | 'rainIntensity' | 'wetRoadReflection'>
  > = {
    morning: {
      skyColor: '#b9d3dc',
      fogColor: '#d5e5e8',
      sunlightIntensity: 1.0 - weatherDim,
      signEmissiveIntensity: 0.45,
      windowLightProbability: 0.22,
      pedestrianDensity: 0.9,
      nightlifeDensity: 0.28,
    },
    noon: {
      skyColor: '#c9d9dc',
      fogColor: '#e5ece8',
      sunlightIntensity: 1.15 - weatherDim,
      signEmissiveIntensity: 0.3,
      windowLightProbability: 0.12,
      pedestrianDensity: 0.58,
      nightlifeDensity: 0.18,
    },
    dusk: {
      skyColor: '#715f79',
      fogColor: '#a28c96',
      sunlightIntensity: 0.42 - weatherDim * 0.55,
      signEmissiveIntensity: 1.35,
      windowLightProbability: 0.52,
      pedestrianDensity: 0.82,
      nightlifeDensity: 0.78 + weekendBoost,
    },
    night: {
      skyColor: '#25304a',
      fogColor: '#39425f',
      sunlightIntensity: 0.08,
      signEmissiveIntensity: 1.85,
      windowLightProbability: 0.68,
      pedestrianDensity: 0.68,
      nightlifeDensity: 1.0 + weekendBoost,
    },
    lateNight: {
      skyColor: '#151b2b',
      fogColor: '#202842',
      sunlightIntensity: 0.03,
      signEmissiveIntensity: 1.5,
      windowLightProbability: 0.38,
      pedestrianDensity: 0.22,
      nightlifeDensity: 0.24,
    },
  };

  const soundMood = {
    clear: timePreset === 'lateNight' ? 'distant late-night traffic' : 'soft street chatter',
    cloudy: 'muted city hum under low clouds',
    fog: 'soft traffic swallowed by fog',
    drizzle: 'fine drizzle on utility covers and awnings',
    rain: 'light rain on awnings and narrow roads',
    snow: 'soft snow hush over narrow side streets',
    thunderstorm: 'heavy rain with distant thunder risk',
  }[state.weather];

  return {
    state,
    timePreset,
    ...byTime[timePreset],
    umbrellaRatio,
    rainIntensity,
    wetRoadReflection:
      state.weather === 'rain' || state.weather === 'thunderstorm'
        ? Math.max(0.24, 0.28 + rainIntensity * 0.58)
        : state.weather === 'drizzle'
          ? Math.max(0.2, 0.18 + rainIntensity * 0.28)
        : state.weather === 'snow'
          ? 0.12
          : state.weather === 'cloudy' || state.weather === 'fog'
            ? 0.18
            : 0.04,
    ambientSoundMood: soundMood,
  };
}
