import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { AmbienceController } from './components/AmbienceController';
import { ControlPanel } from './components/ControlPanel';
import { DioramaScene } from './components/DioramaScene';
import { getAmbienceFromState, MockAmbienceState, TimePreset, WeatherMode } from './ambience';
import { AmbienceTransitionSpeed, useTransitionedAmbience } from './useTransitionedAmbience';
import { fetchGotandaWeather } from './weatherApi';

type TimeMode = TimePreset | 'live';
type WeatherSetting = WeatherMode | 'live';

const manualWeatherPresets: Record<
  WeatherMode,
  Pick<MockAmbienceState, 'weather' | 'precipitationMm' | 'snowfallCm' | 'snowDepthCm' | 'windSpeedKmh'>
> = {
  clear: { weather: 'clear', precipitationMm: 0, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 4 },
  cloudy: { weather: 'cloudy', precipitationMm: 0, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 5 },
  fog: { weather: 'fog', precipitationMm: 0, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 3 },
  drizzle: { weather: 'drizzle', precipitationMm: 0.25, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 7 },
  rain: { weather: 'rain', precipitationMm: 1.1, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 9 },
  snow: { weather: 'snow', precipitationMm: 0.8, snowfallCm: 0.9, snowDepthCm: 2.6, windSpeedKmh: 6 },
  thunderstorm: { weather: 'thunderstorm', precipitationMm: 3.2, snowfallCm: 0, snowDepthCm: 0, windSpeedKmh: 32 },
};

const initialState: MockAmbienceState = {
  location: 'Gotanda / TOC',
  localTime: '18:20',
  weather: 'rain',
  temperatureC: 22,
  precipitationMm: 0.8,
  snowfallCm: 0,
  snowDepthCm: 0,
  windSpeedKmh: 8,
  isWeekend: false,
  isHoliday: false,
};

export default function App() {
  const [mockState, setMockState] = useState<MockAmbienceState>(initialState);
  const [timeMode, setTimeMode] = useState<TimeMode>('live');
  const [weatherSetting, setWeatherSetting] = useState<WeatherSetting>('live');
  const [weatherStatus, setWeatherStatus] = useState('syncing Gotanda weather...');
  const [orbitPaused, setOrbitPaused] = useState(false);
  const [crowdVisible, setCrowdVisible] = useState(true);
  const [rainEnabled, setRainEnabled] = useState(true);
  const [compassAngle, setCompassAngle] = useState(0.76);
  const [transitionSpeed, setTransitionSpeed] = useState<AmbienceTransitionSpeed>('slow');
  const weatherSettingRef = useRef(weatherSetting);

  const ambience = useMemo(() => getAmbienceFromState(mockState), [mockState]);
  const displayAmbience = useTransitionedAmbience(ambience, transitionSpeed);

  useEffect(() => {
    weatherSettingRef.current = weatherSetting;
  }, [weatherSetting]);

  useEffect(() => {
    if (timeMode !== 'live') return;

    const syncToCurrentTime = () => {
      const now = new Date();
      const localTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const day = now.getDay();
      setTransitionSpeed('slow');
      setMockState((state) => ({
        ...state,
        localTime,
        isWeekend: day === 0 || day === 6,
        isHoliday: false,
      }));
    };

    syncToCurrentTime();
    const timer = window.setInterval(syncToCurrentTime, 30_000);
    return () => window.clearInterval(timer);
  }, [timeMode]);

  useEffect(() => {
    if (weatherSetting !== 'live') return;

    let active = true;
    const controller = new AbortController();

    let timer: number | undefined;
    const scheduleNextSync = () => {
      const jitterMs = Math.random() * 30_000;
      timer = window.setTimeout(syncWeather, 10 * 60 * 1000 + jitterMs);
    };

    const syncWeather = async () => {
      try {
        const result = await fetchGotandaWeather(controller.signal);
        if (!active || weatherSettingRef.current !== 'live') return;
        setTransitionSpeed('slow');
        setMockState((state) => ({
          ...state,
          weather: result.weather,
          temperatureC: result.temperatureC,
          precipitationMm: result.precipitation,
          snowfallCm: result.snowfallCm,
          snowDepthCm: result.snowDepthCm,
          windSpeedKmh: result.windSpeedKmh,
        }));
        setWeatherStatus(
          `Open-Meteo ${result.fetchedAt} / code ${result.weatherCode} / clouds ${result.cloudCover}% / rain ${result.precipitation}mm / snow ${result.snowfallCm}cm / depth ${result.snowDepthCm}cm / wind ${result.windSpeedKmh.toFixed(1)}km/h`,
        );
        if (result.weather === 'rain' || result.weather === 'snow' || result.weather === 'drizzle' || result.weather === 'thunderstorm') {
          setRainEnabled(true);
        }
      } catch (error) {
        if (!active) return;
        setWeatherStatus(error instanceof Error ? `live weather unavailable: ${error.message}` : 'live weather unavailable');
      } finally {
        if (active && weatherSettingRef.current === 'live') {
          scheduleNextSync();
        }
      }
    };

    syncWeather();
    return () => {
      active = false;
      controller.abort();
      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [weatherSetting]);

  const setWeather = (weather: WeatherSetting) => {
    setWeatherSetting(weather);
    if (weather === 'live') {
      setTransitionSpeed('slow');
      setWeatherStatus('syncing Gotanda weather...');
      return;
    }
    setTransitionSpeed('fast');
    setMockState((state) => ({ ...state, ...manualWeatherPresets[weather] }));
    setWeatherStatus(`mock ${weather}`);
    if (weather === 'rain' || weather === 'snow' || weather === 'drizzle' || weather === 'thunderstorm') {
      setRainEnabled(true);
    }
  };

  const setTime = (mode: TimeMode) => {
    if (mode === 'live') {
      setTransitionSpeed('slow');
      setTimeMode('live');
      return;
    }

    const times: Record<TimePreset, string> = {
      morning: '08:10',
      noon: '12:30',
      dusk: '18:20',
      night: '21:35',
      lateNight: '01:20',
    };
    setTimeMode(mode);
    setTransitionSpeed('fast');
    setMockState((state) => ({
      ...state,
      localTime: times[mode],
      temperatureC: mode === 'morning' ? 19 : mode === 'noon' ? 25 : mode === 'lateNight' ? 18 : 22,
    }));
  };

  return (
    <main className="app-shell">
      <AmbienceController ambience={displayAmbience} />
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
        camera={{ position: [25, 28, 25], fov: 42, near: 0.1, far: 200 }}
      >
        <Suspense fallback={null}>
          <DioramaScene
            ambience={displayAmbience}
            orbitPaused={orbitPaused}
            crowdVisible={crowdVisible}
            onCompassAngleChange={setCompassAngle}
            rainVisible={
              rainEnabled &&
              (mockState.weather === 'rain' ||
                mockState.weather === 'snow' ||
                mockState.weather === 'drizzle' ||
                mockState.weather === 'thunderstorm')
            }
          />
        </Suspense>
      </Canvas>
      <ControlPanel
        ambience={displayAmbience}
        mockState={mockState}
        timeMode={timeMode}
        weatherSetting={weatherSetting}
        weatherStatus={weatherStatus}
        orbitPaused={orbitPaused}
        crowdVisible={crowdVisible}
        rainEnabled={rainEnabled}
        compassAngle={compassAngle}
        onToggleOrbit={() => setOrbitPaused((value) => !value)}
        onTimeChange={setTime}
        onWeatherChange={setWeather}
        onToggleCrowd={() => setCrowdVisible((value) => !value)}
        onToggleRain={() => setRainEnabled((value) => !value)}
      />
    </main>
  );
}
