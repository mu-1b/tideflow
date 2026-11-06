import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { getStations, getTides, getWeather } from '../lib/api';
import { getCurrentCoords } from '../lib/location';
import { scheduleTideAlerts } from '../lib/notifications';
import { formatCountdown, formatDay, formatHeight, formatTime, levelAt, trend, upcoming } from '../lib/tide';
import { TideData, Weather } from '../lib/types';
import { Button, Card, Notice, SectionTitle, SourceBadge } from '../components/ui';
import TideChart from '../components/TideChart';
import WeatherCard from '../components/WeatherCard';
import { colors } from '../theme';

export default function HomeScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { ready, station, prefs, selectStation, toggleSaved, isSaved } = useApp();
  const [tides, setTides] = useState<TideData | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, w] = await Promise.all([getTides(station, prefs.units), getWeather(station.lat, station.lon, prefs.units)]);
    setTides(t);
    setWeather(w);
    setLoading(false);
  }, [station, prefs.units]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tides && tides.stationId === station.id) scheduleTideAlerts(station, tides, prefs.notifications).catch(() => {});
  }, [tides, station, prefs.notifications]);

  const useMyLocation = async () => {
    setLocating(true);
    setNotice(null);
    const { coords, error } = await getCurrentCoords();
    if (coords) {
      const { stations } = await getStations({ near: coords, limit: 1 });
      if (stations[0]) {
        selectStation(stations[0]);
        setNotice(`Nearest station: ${stations[0].name} (${stations[0].distanceKm} km away)`);
      }
    } else {
      setNotice(error ?? null);
    }
    setLocating(false);
  };

  const next = tides ? upcoming(tides) : [];
  const nextHigh = next.find((e) => e.type === 'high');
  const nextLow = next.find((e) => e.type === 'low');
  const level = tides ? levelAt(tides.curve) : null;
  const direction = tides ? trend(tides) : null;
  const saved = isSaved(station.id);

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
      refreshControl={<RefreshControl refreshing={loading && !!tides} onRefresh={load} />}
    >
      <View style={styles.header}>
        <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate('Stations')}>
          <Text style={styles.eyebrow}>
            <Ionicons name="location" size={12} /> {station.state ? `${station.state} · ` : ''}Station {station.id}
          </Text>
          <Text style={styles.title} numberOfLines={2}>{station.name}</Text>
        </Pressable>
        <Pressable hitSlop={10} onPress={() => toggleSaved(station)} accessibilityLabel="Save station">
          <Ionicons name={saved ? 'star' : 'star-outline'} size={26} color={saved ? '#E6A700' : colors.muted} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button label={locating ? 'Locating…' : 'Use my location'} icon="locate" onPress={useMyLocation} />
        <Button label="Change station" icon="list" variant="ghost" onPress={() => navigation.navigate('Stations')} />
      </View>
      {notice && <Notice text={notice} />}

      {!tides ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} size="large" />
      ) : (
        <>
          <Card style={styles.hero}>
            <Text style={styles.heroLabel}>Current water level</Text>
            <View style={styles.heroRow}>
              <Text style={styles.heroValue}>{level != null ? formatHeight(level, tides.units) : '—'}</Text>
              {direction && (
                <View style={styles.trend}>
                  <Ionicons name={direction === 'Rising' ? 'trending-up' : 'trending-down'} size={18} color="#fff" />
                  <Text style={styles.trendText}>{direction}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroSub}>Predicted above {tides.datum} · times in your device's time zone</Text>
          </Card>

          <SourceBadge source={tides.source} fetchedAt={tides.fetchedAt} />
          {tides.source === 'sample' && (
            <Notice tone="error" text="NOAA and the TideFlow server are unreachable and nothing is cached for this station. The values shown are a synthetic example." />
          )}

          <View style={styles.pair}>
            {[nextHigh, nextLow].map((e, i) => (
              <Card key={i} style={styles.nextCard}>
                <Text style={[styles.nextType, { color: i === 0 ? colors.high : colors.low }]}>
                  <Ionicons name={i === 0 ? 'arrow-up-circle' : 'arrow-down-circle'} size={14} /> Next {i === 0 ? 'high' : 'low'}
                </Text>
                {e ? (
                  <>
                    <Text style={styles.nextTime}>{formatTime(e.time)}</Text>
                    <Text style={styles.nextMeta}>{formatHeight(e.height, tides.units)} · {formatCountdown(e.time)}</Text>
                  </>
                ) : (
                  <Text style={styles.nextMeta}>Not in forecast window</Text>
                )}
              </Card>
            ))}
          </View>

          <Card>
            <SectionTitle>Tide forecast</SectionTitle>
            <TideChart data={tides} />
          </Card>

          <Card>
            <SectionTitle>Upcoming highs & lows</SectionTitle>
            {next.slice(0, 6).map((e, i) => (
              <View key={e.time} style={[styles.listRow, i > 0 && styles.listDivider]}>
                <View style={[styles.pill, { backgroundColor: e.type === 'high' ? colors.primarySoft : '#FCEFE6' }]}>
                  <Text style={{ color: e.type === 'high' ? colors.high : colors.low, fontWeight: '700', fontSize: 12 }}>
                    {e.type === 'high' ? 'HIGH' : 'LOW'}
                  </Text>
                </View>
                <Text style={styles.listDay}>{formatDay(e.time)}</Text>
                <Text style={styles.listTime}>{formatTime(e.time)}</Text>
                <Text style={styles.listHeight}>{formatHeight(e.height, tides.units)}</Text>
              </View>
            ))}
            {!next.length && <Text style={styles.nextMeta}>No upcoming predictions.</Text>}
          </Card>

          <WeatherCard weather={weather} />
          <Text style={styles.footer}>Tide predictions: NOAA CO-OPS. Not for navigation.</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: colors.primary, fontWeight: '600', fontSize: 12, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  actions: { flexDirection: 'row', gap: 10 },
  hero: { backgroundColor: colors.primary },
  heroLabel: { color: '#D6EEF7', fontSize: 13, fontWeight: '600' },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 4 },
  heroValue: { color: '#fff', fontSize: 44, fontWeight: '800' },
  heroSub: { color: '#D6EEF7', fontSize: 12 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  trendText: { color: '#fff', fontWeight: '700' },
  pair: { flexDirection: 'row', gap: 12 },
  nextCard: { flex: 1 },
  nextType: { fontWeight: '700', fontSize: 13 },
  nextTime: { fontSize: 24, fontWeight: '800', color: colors.ink, marginTop: 6 },
  nextMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  listDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  pill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, width: 52, alignItems: 'center' },
  listDay: { flex: 1, color: colors.ink, fontSize: 14 },
  listTime: { color: colors.ink, fontWeight: '600', fontSize: 14, width: 76, textAlign: 'right' },
  listHeight: { color: colors.muted, fontSize: 14, width: 60, textAlign: 'right' },
  footer: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
