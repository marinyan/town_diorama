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

Create a Windows `.scr` screensaver-style copy:

```bash
npm run package:scr
```

The packaged shell starts fullscreen/kiosk-style with no menu bar. Press `Esc` or `Q` to quit. The OSM data in `public/data` is bundled as an extra resource; the app also includes the current `dist` build.

The `.scr` build handles `/s` as fullscreen playback. `/p` preview and `/c` configuration calls currently exit immediately rather than showing a settings UI.

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

Rain, drizzle, thunderstorms, and snow follow the live precipitation value: heavier precipitation increases particle count, opacity, fall speed, wet-road reflection for wet modes, and umbrella ratio. Snowfall and snow depth are also read when available; snowfall drives snow particles, while snow depth adds subtle snow cover to the ground and rooftops. Wind speed affects rain streak angle, rain drift, thunderstorm squalls, and snowflake drift. Fog mode tightens the scene fog; thunderstorm mode adds occasional lightning flashes.

Time also has a `Now` mode that follows the browser's current clock. A future holiday API can update `isHoliday`, and a location picker can swap the fixed Shinjuku coordinates for any other city without changing the scene components.

## OSM Map Data

The scene first tries to load `public/data/shinjuku-osm.json`, which contains OpenStreetMap road and building data fetched through Overpass API. If that file is missing, the app falls back to the deterministic procedural layout.

Refresh the local OSM sample with:

```bash
node scripts/fetch-osm.mjs
```

The converter in `src/map/createLayoutFromOsm.ts` projects latitude/longitude into local diorama coordinates, maps highway ways to road meshes and crowd paths, and maps building footprints to low-poly building blocks. Building height uses OSM `height` or `building:levels` when present, otherwise a deterministic estimated height.

## Embedded Elevation Data

The scene also loads `public/data/shinjuku-elevation.json` when present. This file is generated from Geospatial Information Authority of Japan elevation tiles and stores a compact relative-height grid for the same Shinjuku bbox as the OSM sample.

Refresh the local elevation sample with:

```bash
npm run fetch:elevation
```

The layout converter samples that grid to place OSM buildings, roads, and crowd paths on the same toy-scale terrain height. OSM structural tags such as `bridge`, `tunnel`, `layer`, `highway=steps`, and `incline` are still applied on top of the real elevation grid for visible urban verticality.
