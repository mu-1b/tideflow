import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { MAPBOX_TOKEN } from '../lib/config';
import { Station } from '../lib/types';
import { Button, Card, Notice } from '../components/ui';
import { colors, shadow } from '../theme';

const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const mapUnavailable = Platform.OS === 'web'
  ? 'The Mapbox map runs on iOS and Android development builds.'
  : inExpoGo
    ? 'Mapbox uses native code that Expo Go does not include. Run a development build (npx expo run:android or run:ios) to use the interactive map.'
    : !MAPBOX_TOKEN
      ? 'Set EXPO_PUBLIC_MAPBOX_TOKEN in mobile/.env and rebuild to load the map.'
      : null;

const StationMap = mapUnavailable ? null : require('../components/StationMap').default;

export default function MapScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { station, saved, selectStation } = useApp();
  const [preview, setPreview] = useState<Station | null>(null);

  if (!StationMap) {
    return (
      <View style={[styles.fallback, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>Map</Text>
        <Notice text={mapUnavailable!} />
        <Card style={{ marginTop: 14, gap: 10 }}>
          <Text style={styles.cardText}>You can still browse and search every NOAA tide station from the Stations tab.</Text>
          <Button label="Browse stations" icon="list" onPress={() => navigation.navigate('Stations')} />
        </Card>
      </View>
    );
  }

  const shown = preview ?? station;

  return (
    <View style={{ flex: 1 }}>
      <StationMap selected={station} savedIds={saved.map((s) => s.id)} onSelect={setPreview} />
      <View style={[styles.legend, { top: insets.top + 10 }]}>
        <Legend color={colors.low} label="Selected" />
        <Legend color="#E6A700" label="Saved" />
        <Legend color={colors.primary} label="NOAA station" />
      </View>
      <Card style={styles.sheet}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sheetTitle} numberOfLines={1}>{shown.name}</Text>
          <Text style={styles.cardText}>{shown.state} · #{shown.id}</Text>
        </View>
        {shown.id === station.id ? (
          <Pressable onPress={() => navigation.navigate('Home')} style={styles.current}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>View tides</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        ) : (
          <Button
            label="Select"
            icon="checkmark"
            onPress={() => {
              selectStation(shown);
              setPreview(null);
              navigation.navigate('Home');
            }}
          />
        )}
      </Card>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  cardText: { color: colors.muted, fontSize: 13 },
  legend: { position: 'absolute', left: 12, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, ...shadow },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: '#fff' },
  legendText: { fontSize: 11, color: colors.ink, fontWeight: '600' },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  current: { flexDirection: 'row', alignItems: 'center' },
});
