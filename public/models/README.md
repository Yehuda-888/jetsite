# Local 3D Models

This folder holds all local aircraft `.glb` assets used by the site.

Active files must be placed in:

- `public/models/verified/`

Expected active filenames:

- `f22.glb`
- `f35a.glb`
- `rafale.glb`
- `typhoon.glb`
- `fa18e.glb`
- `su57.glb`
- `kf21.glb`

Unverified placeholder models are archived under `public/models/unverified/` and are not used by the app.

You can replace active models while keeping the same filenames, or update paths in `src/data/models.manifest.json`.

If you use Draco-compressed assets, place decoder files under `public/draco/`.
