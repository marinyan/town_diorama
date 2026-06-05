# OSM Data

Run this from the project root to refresh the local Kagurazaka map sample:

```bash
node scripts/fetch-osm.mjs
```

The app reads `public/data/kagurazaka-osm.json` when available and falls back to procedural generation if the file is missing or malformed.

After refreshing the OSM sample, regenerate local streaming chunks with:

```bash
npm run chunk:osm
```

The generated `kagurazaka-osm-chunks/manifest.json` lists deterministic world-space chunks. At runtime, the app reads chunks that intersect the current view window plus a preload margin so larger future maps do not need to load every OSM element at startup.
