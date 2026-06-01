# OSM Data

Run this from the project root to refresh the local Shinjuku map sample:

```bash
node scripts/fetch-osm.mjs
```

The app reads `public/data/shinjuku-osm.json` when available and falls back to procedural generation if the file is missing or malformed.
