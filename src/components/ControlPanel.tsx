import { CSSProperties } from 'react';
import { Ambience, MockAmbienceState, TimePreset, WeatherMode } from '../ambience';

type TimeMode = TimePreset | 'live';
type WeatherSetting = WeatherMode | 'live';

type ControlPanelProps = {
  ambience: Ambience;
  mockState: MockAmbienceState;
  timeMode: TimeMode;
  weatherSetting: WeatherSetting;
  weatherStatus: string;
  orbitPaused: boolean;
  crowdVisible: boolean;
  rainEnabled: boolean;
  compassAngle: number;
  onToggleOrbit: () => void;
  onTimeChange: (time: TimeMode) => void;
  onWeatherChange: (weather: WeatherSetting) => void;
  onToggleCrowd: () => void;
  onToggleRain: () => void;
};

const timeOptions: Array<{ value: TimeMode; label: string }> = [
  { value: 'live', label: 'Now' },
  { value: 'morning', label: 'Morning' },
  { value: 'noon', label: 'Noon' },
  { value: 'dusk', label: 'Dusk' },
  { value: 'night', label: 'Night' },
  { value: 'lateNight', label: 'Late' },
];

const weatherOptions: Array<{ value: WeatherSetting; label: string }> = [
  { value: 'live', label: 'Live Shinjuku' },
  { value: 'clear', label: 'Clear' },
  { value: 'cloudy', label: 'Cloudy' },
  { value: 'fog', label: 'Fog' },
  { value: 'drizzle', label: 'Drizzle' },
  { value: 'rain', label: 'Rain' },
  { value: 'snow', label: 'Snow' },
  { value: 'thunderstorm', label: 'Storm' },
];

export function ControlPanel({
  ambience,
  mockState,
  timeMode,
  weatherSetting,
  weatherStatus,
  orbitPaused,
  crowdVisible,
  rainEnabled,
  compassAngle,
  onToggleOrbit,
  onTimeChange,
  onWeatherChange,
  onToggleCrowd,
  onToggleRain,
}: ControlPanelProps) {
  return (
    <section className="control-panel" aria-label="Diorama controls">
      <div className="panel-header">
        <div>
          <h1 className="panel-title">Just Watching / {mockState.location}</h1>
          <p className="panel-meta">
            {mockState.localTime} / {mockState.weather} / rain {mockState.precipitationMm.toFixed(2)}mm /{' '}
            snow {mockState.snowfallCm.toFixed(2)}cm / depth {mockState.snowDepthCm.toFixed(1)}cm / wind {mockState.windSpeedKmh.toFixed(1)}km/h /
            density {ambience.pedestrianDensity.toFixed(2)}
          </p>
        </div>
        <div className="panel-status">
          <div className="classic-compass" aria-label="Compass" style={{ '--compass-angle': `${compassAngle}rad` } as CSSProperties} />
          <div className="temp-pill">{mockState.temperatureC}C</div>
        </div>
      </div>

      <div className="control-grid">
        <div className="control-row">
          <label>Orbit</label>
          <div className="button-row">
            <button type="button" className={!orbitPaused ? 'active' : ''} onClick={onToggleOrbit}>
              {orbitPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="control-row">
          <label>Time</label>
          <div className="segmented">
            {timeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={timeMode === option.value ? 'active' : ''}
                onClick={() => onTimeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-row">
          <label>Weather</label>
          <select className="select-like" value={weatherSetting} onChange={(event) => onWeatherChange(event.target.value as WeatherSetting)}>
            {weatherOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-row">
          <label>Layers</label>
          <div className="button-row">
            <button type="button" className={crowdVisible ? 'active' : ''} onClick={onToggleCrowd}>
              Crowd
            </button>
            <button type="button" className={rainEnabled ? 'active' : ''} onClick={onToggleRain}>
              Precip
            </button>
          </div>
        </div>
      </div>

      <p className="mood-line">
        Ambient placeholder: {ambience.ambientSoundMood}
        <br />
        Weather source: {weatherStatus}
      </p>
    </section>
  );
}
