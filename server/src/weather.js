const URL = 'https://api.open-meteo.com/v1/forecast';

export async function fetchWeather(lat, lon, units = 'english') {
  const imperial = units === 'english';
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m',
    temperature_unit: imperial ? 'fahrenheit' : 'celsius',
    wind_speed_unit: imperial ? 'mph' : 'kmh',
    timezone: 'auto',
  });
  const res = await fetch(`${URL}?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Weather service responded ${res.status}`);
  const { current, current_units } = await res.json();
  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    windDirection: current.wind_direction_10m,
    code: current.weather_code,
    units: { temperature: current_units.temperature_2m, wind: current_units.wind_speed_10m },
  };
}
