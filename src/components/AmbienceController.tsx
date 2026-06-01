import { useEffect } from 'react';
import { Ambience } from '../ambience';

type AmbienceControllerProps = {
  ambience: Ambience;
};

export function AmbienceController({ ambience }: AmbienceControllerProps) {
  useEffect(() => {
    document.body.style.background = ambience.skyColor;
    document.documentElement.dataset.weather = ambience.state.weather;
    document.documentElement.dataset.time = ambience.timePreset;
  }, [ambience]);

  return null;
}
