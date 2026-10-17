# StormRoute

An Android navigation app with a live weather overlay.

- Search places or long-press the map to drop a pin, then get a driving route
- Live NEXRAD rain radar with a 50-minute loop
- Weather along your route, timed to when you'll reach each point
- National Weather Service alerts on your route, outlined on the map
- Spoken turn-by-turn directions with automatic rerouting
- One tap to hand the trip off to Google Maps
- Light and dark themes that follow your phone

No API keys needed. Maps © Esri / OpenStreetMap contributors, search by Photon, routing by OSRM,
radar from Iowa Environmental Mesonet (NWS NEXRAD), forecasts from Open-Meteo, alerts from api.weather.gov.

## Install

Download `StormRoute.apk` from the latest release and open it on your phone. Allow installs from
your browser or file manager when Android asks.

## Project layout

- `assets/` — the app UI (HTML/JS, Leaflet)
- `src/` — the Android wrapper (WebView, GPS, text-to-speech, Google Maps hand-off)
- `res/`, `AndroidManifest.xml` — Android resources
- `build.sh` — builds and signs the APK with the Android SDK build tools (aapt2, javac, d8, apksigner)

The signing keystore is not in this repo. Keep your own copy; updates must be signed with the same key.
