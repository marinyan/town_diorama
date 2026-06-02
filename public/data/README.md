# OSM Data

Run this from the project root to refresh the local Kagurazaka map sample:

```bash
node scripts/fetch-osm.mjs
```

The app reads `public/data/kagurazaka-osm.json` when available and falls back to procedural generation if the file is missing or malformed.
