# TideFlow

Real-time tide tracking for the coast. TideFlow shows the current predicted water level, upcoming high and low tides, a 48-hour forecast chart, local weather, and an interactive map of NOAA tide stations.

**HackNJIT · November 2023.** TideFlow was a HackNJIT project. The goal was a phone app that answers "what is the tide doing right now, and when does it turn?" for anyone heading to the Jersey Shore or any other U.S. coast. It's an MVP: no accounts and no production infrastructure, just real NOAA data on a clean mobile UI.

## Features

- **Dashboard:** current water level, rising/falling trend, next high and low with countdowns, upcoming tides, weather
- **Forecast chart:** predicted water level (MLLW) at 30-minute resolution, with high/low markers and a "now" line
- **Station browser:** search all ~3,500 NOAA tide prediction stations by name, state or ID, plus nearby, featured and saved lists
- **Mapbox map:** station markers that reload as you pan; tap one to select it
- **Geolocation:** finds the nearest station, and falls back to manual selection if permission is denied
- **Tide alerts:** local notifications before upcoming highs and lows (iOS/Android)
- **Saved stations and preferences:** stored in MongoDB through the Express API and mirrored on the device
- **Works offline-ish:** every reading is labeled with where it came from (see below)

Demo-friendly defaults: the app opens on **Sandy Hook, NJ** and ships with ten featured stations, so it works without location permission.

## Stack

| Layer | Tech |
| --- | --- |
| Mobile | React Native (Expo SDK, TypeScript), React Navigation, react-native-svg, @rnmapbox/maps |
| API | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Data | NOAA CO-OPS API, Open-Meteo weather, Mapbox |

```
tideflow/
├── mobile/   Expo app
└── server/   Express API
```

## Setup

### 1. API server

```bash
cd server
cp .env.example .env        # set MONGODB_URI
npm install
npm run dev                 # http://localhost:4000
```

MongoDB is optional for a demo. Without it the API still serves NOAA data from an in-memory cache, and the app keeps saved stations and preferences on the device.

### 2. Mobile app

```bash
cd mobile
cp .env.example .env        # set EXPO_PUBLIC_MAPBOX_TOKEN and EXPO_PUBLIC_API_URL
npm install
npx expo run:android        # or: npx expo run:ios (macOS)
npx expo start              # later runs: start Metro for the installed dev build
```

On a physical device, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP (for example `http://192.168.1.20:4000`), not `localhost`.

**Expo Go:** everything except the map works in Expo Go (`npx expo start`, then scan the QR code). Mapbox needs native code, so the Map tab explains that and points you to the station browser instead of showing a fake map.

## Mapbox configuration

TideFlow uses [`@rnmapbox/maps`](https://github.com/rnmapbox/maps) through its Expo config plugin (already listed in `app.json`), so it needs a **development build**.

1. Create a public access token (`pk.…`) at <https://account.mapbox.com/access-tokens/>.
2. Put it in `mobile/.env` as `EXPO_PUBLIC_MAPBOX_TOKEN`.
3. Rebuild with `npx expo run:android` / `run:ios`.

If your build fails to download the Mapbox SDK, create a secret token with the `DOWNLOADS:READ` scope and export it as `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` before building. Never commit it.

## NOAA integration

All tide data comes from NOAA's Center for Operational Oceanographic Products and Services (CO-OPS). No API key is needed.

| Purpose | Endpoint |
| --- | --- |
| Station list | `https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions` |
| High/low predictions | `.../api/prod/datagetter?product=predictions&interval=hilo` |
| Water-level curve | `.../api/prod/datagetter?product=predictions&interval=30` |

Requests use `datum=MLLW`, `time_zone=gmt` (the app converts to the device's time zone) and a 54-hour window starting 6 hours ago. Subordinate stations only publish highs and lows, so for those the app draws the curve by cosine interpolation and says so on the chart.

The server caches the station list for 24 hours, tide predictions for 1 hour and weather for 20 minutes. Cached data is kept in memory and in MongoDB when it's connected.

### Data labels

Every dashboard shows a badge for where its data came from:

| Badge | Meaning |
| --- | --- |
| Live NOAA predictions | Fetched from NOAA just now |
| NOAA predictions · cached | Served from the server cache (within TTL) |
| Live NOAA predictions · server offline | App called NOAA directly because the API was unreachable |
| Cached · NOAA unreachable | Stale server cache, used because NOAA failed |
| Offline · saved on device | Last good copy stored on the phone |
| Sample data | Synthetic tide, used only when nothing else is available. Never used for alerts |

## API

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | Includes database status |
| GET | `/api/stations?q=&lat=&lon=&limit=` | Search and/or sort by distance |
| GET | `/api/stations/:id` | Station metadata |
| GET | `/api/stations/:id/tides?units=english\|metric` | Highs/lows and curve |
| GET | `/api/weather?lat=&lon=&units=` | Current conditions (Open-Meteo) |
| GET/POST | `/api/saved` | Saved stations (`x-device-id` header) |
| DELETE | `/api/saved/:stationId` | |
| GET/PUT | `/api/preferences` | Units, default station, notification settings |

There are no accounts. Each install generates a random device ID that scopes its saved stations and preferences.

## Notes

- Predictions are astronomical tide predictions, not observed water levels, and are **not for navigation**.
- Notifications are local and scheduled for the next ~2 days whenever the dashboard loads.
- Weather: [Open-Meteo](https://open-meteo.com) (free, no key).
