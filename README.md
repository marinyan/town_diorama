# Just Watching: Urban Diorama Viewer

A browser-based Vite + React + TypeScript diorama of a dense Shinjuku-like backstreet at dusk. The city is built from procedural Three.js geometry through React Three Fiber and Drei, with tiny retro map icons drifting through alleys, rooftops, stairs, and building entrances.

## Run

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Desktop / Screensaver-Style Shell

Run the Electron shell in development:

```bash
npm run desktop
```

If PowerShell blocks `npm.ps1`, use:

```powershell
npm.cmd run desktop
```

Run the built app through Electron:

```bash
npm run desktop:built
```

Create a Windows portable executable:

```bash
npm run package:win
```

The packaged shell starts fullscreen/kiosk-style with no menu bar. Press `Esc` or `Q` to quit. The OSM data in `public/data` is bundled as an extra resource; the app also includes the current `dist` build.

## Weather And Time API Notes

The mock ambience state lives in `src/ambience.ts` and starts as:

```ts
{
  location: 'Shinjuku',
  localTime: '18:20',
  weather: 'rain',
  temperatureC: 22,
  isWeekend: false,
  isHoliday: false
}
```

`getAmbienceFromState` maps that state to sky color, sun intensity, sign and window light levels, crowd density, umbrella icon ratio, wet-road reflection, and an ambient sound mood placeholder.

Weather now has a `Live Shinjuku` mode in the UI. It calls Open-Meteo with Shinjuku coordinates and maps `weather_code`, `precipitation`, `cloud_cover`, `temperature_2m`, and `wind_speed_10m` back into the same mock ambience state. The current adapter lives in `src/weatherApi.ts`.

Rain, drizzle, thunderstorms, and snow follow the live precipitation value: heavier precipitation increases particle count, opacity, fall speed, wet-road reflection for wet modes, and umbrella ratio. Wind speed affects rain streak angle, rain drift, thunderstorm squalls, and snowflake drift. Fog mode tightens the scene fog; thunderstorm mode adds occasional lightning flashes.

Time also has a `Now` mode that follows the browser's current clock. A future holiday API can update `isHoliday`, and a location picker can swap the fixed Shinjuku coordinates for any other city without changing the scene components.

## OSM Map Data

The scene first tries to load `public/data/shinjuku-osm.json`, which contains OpenStreetMap road and building data fetched through Overpass API. If that file is missing, the app falls back to the deterministic procedural layout.

Refresh the local OSM sample with:

```bash
node scripts/fetch-osm.mjs
```

The converter in `src/map/createLayoutFromOsm.ts` projects latitude/longitude into local diorama coordinates, maps highway ways to road meshes and crowd paths, and maps building footprints to low-poly building blocks. Building height uses OSM `height` or `building:levels` when present, otherwise a deterministic estimated height.
