# Jet Atlas

Minimal, professional Vite + React aircraft reference app with a real local GLB pipeline.

Current build includes:

- Real local GLB model viewer with bounds fit, studio environment lighting, and restricted orbit controls
- Interactive aircraft catalog filters plus quick compare panel
- Profile pages with spec grid, systems, timeline, operators, sources, and video tabs
- Wikipedia summary and image enrichment for additional context

## Run locally

```bash
npm install
npm run dev
```

## Real model pipeline

1. Place verified `.glb` files in `public/models/verified/`
2. Register each model in `src/data/models.manifest.json`
3. Set `modelId` on the aircraft record in `src/data/aircraft.json`

Unverified placeholder downloads are archived in `public/models/unverified/`.
Attribution for those placeholders is documented in `public/models/ATTRIBUTION.md`.

Manifest schema:

```json
[
  {
    "id": "f22",
    "aircraftId": "f-22",
    "path": "/models/verified/f22.glb",
    "scale": 1,
    "position": [0, 0, 0],
    "rotation": [0, 0, 0]
  }
]
```

## Build check

```bash
npm run build
```

## Fast legit model sources

- Sketchfab (filter by Downloadable)
- CGTrader (search for GLB)
- TurboSquid (filter for GLTF)
- GitHub (search for `f22 glb` and verify license)
