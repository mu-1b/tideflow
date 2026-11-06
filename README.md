# TideFlow 🌊

A mobile app for checking the tides, built for **HackNJIT (November 2023)**.

Whenever I wanted to go to the shore, I had to dig through NOAA's site to find out when high and low tide were. TideFlow puts that on one screen: what the water is doing right now, when it turns next, and what the weather looks like.

## What it does

- Shows the current water level and whether the tide is rising or falling
- Lists the next high and low tides with a countdown
- Draws a 2-day tide chart
- Lets you search any NOAA tide station, or find the closest one with your location
- Shows stations on a Mapbox map that you can tap to select
- Sends a notification before high or low tide
- Saves your favorite stations and settings

It opens on Sandy Hook, NJ by default, so it works without location access.

## Built with

React Native (Expo) · Node.js + Express · MongoDB · NOAA Tides & Currents API · Mapbox · Open-Meteo for weather

## How it works

The Express server pulls tide predictions and station info from NOAA's free CO-OPS API (no key needed) and caches them so the app stays fast. MongoDB stores saved stations and notification settings.

If the server or NOAA can't be reached, the app falls back to the last data it saved. The screen always says whether you're looking at live, cached or sample data.

## Running it

**Server**

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

**App**

```bash
cd mobile
cp .env.example .env
npm install
npx expo run:android   # or run:ios
```

Add your Mapbox public token to `mobile/.env`. The map uses native code, so it needs a development build (`expo run`) instead of Expo Go. Everything else works in Expo Go with `npx expo start`.

If you're testing on a real phone, set `EXPO_PUBLIC_API_URL` to your computer's local IP instead of `localhost`.

## What's next

- Live observed water levels, not just predictions
- Home screen widgets
- Surf and wave data

---

Tide data is from NOAA. Please don't use this for navigation 🙂
