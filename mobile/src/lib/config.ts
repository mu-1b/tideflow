export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';
export const MAPBOX_TOKEN = mapboxToken.startsWith('pk.') && !mapboxToken.includes('your_') ? mapboxToken : '';
