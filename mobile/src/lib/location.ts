import * as Location from 'expo-location';

export type Coords = { lat: number; lon: number };

export async function getCurrentCoords(): Promise<{ coords: Coords | null; error?: string }> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { coords: null, error: 'Location permission denied. Pick a station manually instead.' };
    const last = await Location.getLastKnownPositionAsync();
    const pos = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { coords: { lat: pos.coords.latitude, lon: pos.coords.longitude } };
  } catch {
    return { coords: null, error: 'Could not determine your location. Pick a station manually instead.' };
  }
}
