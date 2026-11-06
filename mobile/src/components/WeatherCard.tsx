import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, SectionTitle } from './ui';
import { colors } from '../theme';
import { Weather } from '../lib/types';

type IconName = keyof typeof Ionicons.glyphMap;

function describe(code: number): [string, IconName] {
  if (code === 0) return ['Clear', 'sunny'];
  if (code <= 2) return ['Partly cloudy', 'partly-sunny'];
  if (code === 3) return ['Overcast', 'cloudy'];
  if (code <= 48) return ['Fog', 'cloudy'];
  if (code <= 57) return ['Drizzle', 'rainy'];
  if (code <= 67) return ['Rain', 'rainy'];
  if (code <= 77) return ['Snow', 'snow'];
  if (code <= 82) return ['Showers', 'rainy'];
  if (code <= 86) return ['Snow showers', 'snow'];
  return ['Thunderstorms', 'thunderstorm'];
}

const compass = (deg: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];

export default function WeatherCard({ weather }: { weather: Weather | null }) {
  if (!weather) {
    return (
      <Card>
        <SectionTitle>Weather</SectionTitle>
        <Text style={styles.muted}>Weather is unavailable right now.</Text>
      </Card>
    );
  }
  const [label, icon] = describe(weather.code);
  return (
    <Card>
      <SectionTitle>Weather</SectionTitle>
      <View style={styles.row}>
        <Ionicons name={icon} size={38} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={styles.temp}>{Math.round(weather.temperature)}{weather.units.temperature}</Text>
          <Text style={styles.muted}>{label} · feels like {Math.round(weather.feelsLike)}°</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.stat}>
            <Ionicons name="navigate" size={12} /> {Math.round(weather.windSpeed)} {weather.units.wind.replace('mp/h', 'mph')} {compass(weather.windDirection)}
          </Text>
          <Text style={styles.stat}>
            <Ionicons name="water" size={12} /> {weather.humidity}% humidity
          </Text>
        </View>
      </View>
      <Text style={styles.credit}>Weather data by Open-Meteo</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  temp: { fontSize: 26, fontWeight: '700', color: colors.ink },
  muted: { color: colors.muted, fontSize: 13 },
  stat: { color: colors.ink, fontSize: 13, marginBottom: 2 },
  credit: { color: colors.muted, fontSize: 10, marginTop: 10 },
});
