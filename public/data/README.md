# OSM Data

Run this from the project root to refresh the local Gotanda/TOC map sample:

```bash
node scripts/fetch-osm.mjs
```

The app reads `public/data/gotanda-toc-osm.json` when available and falls back to procedural generation if the file is missing or malformed.
