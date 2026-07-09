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

## Known limitations

- Login/tracking progress, adding personal notes, and other account-based
  features won't work (they require mapgenie's backend).
- The two Typekit heading fonts are mirrored, but if Adobe ever revokes the
  signed font URLs this kit was using, that's baked into the downloaded files
  already, so it doesn't matter — they'll keep working.
- Share/social links (Twitter, Facebook, etc.) and the mapgenie.io logo link
  in the sidebar still point at the live site, since they're just outbound
  links, not assets the page needs to render.
