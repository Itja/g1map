# Gothic 1 Remake — Valley of Mines (offline copy)

A fully self-contained, offline copy of
https://mapgenie.io/gothic-1-remake/maps/valley-of-mines

Includes:
- All 1557 map locations/markers (chests, camps, caves, traders, etc.), with the
  810 location screenshot images
- The full raster map tile pyramid (zoom levels 8–15, ~21,800 tiles) — zoom 16
  isn't served by mapgenie's CDN even on the live site, so it's not included
- All CSS, JS, fonts (including the mapgenie icon font, ionicons, and the two
  Adobe/Typekit web fonts), and UI images
- Mapbox GL JS (the map rendering engine) served locally
- Local browser-only progress tracking, personal notes, tracked categories,
  presets, and routes without logging in

Ad, analytics, and consent-management scripts (Google Tag Manager, Chartbeat,
comScore, Microsoft Clarity, an ad exchange, etc.) were stripped out since
they only phone home to third parties and serve no purpose offline.

## Running it

A local web server is required — you can't just double-click `index.html`.
The page fetches its location data from `/api/v1/maps/945/data`, and that
root-relative request only resolves correctly against an `http://` origin,
not `file://`.

```
python3 serve.py
```

Then open **http://localhost:8000/** in your browser. No internet connection
is needed after that.

## Local progress data

Login and upgrade prompts are disabled. The map now behaves like a local
unlimited user, and account-style data is stored in your browser's
`localStorage` under:

```
mapgenie:valley-of-mines:local-state:v1
```

That data is scoped to the browser profile and origin you use to open the map.
It is not synced anywhere. To reset local progress, run this in the browser
console:

```
localMapState.reset()
```

## Known limitations

- Local progress is browser/profile-specific. Clearing site data or using a
  different browser will start with fresh progress.
- The two Typekit heading fonts are mirrored, but if Adobe ever revokes the
  signed font URLs this kit was using, that's baked into the downloaded files
  already, so it doesn't matter — they'll keep working.
- Share/social links (Twitter, Facebook, etc.) and the mapgenie.io logo link
  in the sidebar still point at the live site, since they're just outbound
  links, not assets the page needs to render.
