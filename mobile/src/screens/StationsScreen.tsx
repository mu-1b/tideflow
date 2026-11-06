import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { getStations } from '../lib/api';
import { DEFAULT_STATIONS } from '../lib/defaults';
import { Coords, getCurrentCoords } from '../lib/location';
import { Station } from '../lib/types';
import { Notice, StationRow } from '../components/ui';
import { colors } from '../theme';

type Tab = 'featured' | 'nearby' | 'saved';

export default function StationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { station, saved, selectStation, toggleSaved, isSaved } = useApp();
  const [tab, setTab] = useState<Tab>('featured');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[] | null>(null);
  const [nearby, setNearby] = useState<Station[] | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      const { stations, offline } = await getStations({ q, near: coords ?? undefined, limit: 60 });
      if (cancelled) return;
      setResults(stations);
      setNotice(offline ? 'Offline: searching built-in demo stations only.' : null);
      setLoading(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, coords]);

  const loadNearby = async () => {
    setTab('nearby');
    if (nearby) return;
    setLoading(true);
    const { coords: c, error } = await getCurrentCoords();
    if (c) {
      setCoords(c);
      const { stations, offline } = await getStations({ near: c, limit: 25 });
      setNearby(stations);
      setNotice(offline ? 'Offline: showing nearest built-in demo stations.' : null);
    } else {
      setNotice(error ?? null);
      setTab('featured');
    }
    setLoading(false);
  };

  const choose = (s: Station) => {
    selectStation(s);
    navigation.navigate('Home');
  };

  const data = results ?? (tab === 'nearby' ? nearby ?? [] : tab === 'saved' ? saved : DEFAULT_STATIONS);
  const tabs: [Tab, string][] = [['featured', 'Featured'], ['nearby', 'Nearby'], ['saved', `Saved (${saved.length})`]];

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Stations</Text>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, state (NJ) or station ID"
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {results && <View style={{ height: 12 }} />}
      {!results && (
        <View style={styles.tabs}>
          {tabs.map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => (key === 'nearby' ? loadNearby() : setTab(key))}
              style={[styles.tab, tab === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {notice && <View style={{ marginBottom: 10 }}><Notice text={notice} /></View>}
      {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 12 }} />}

      <FlatList
        data={data}
        keyExtractor={(s) => s.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <StationRow
            station={item}
            selected={item.id === station.id}
            saved={isSaved(item.id)}
            onPress={() => choose(item)}
            onToggleSave={() => toggleSaved(item)}
          />
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {results ? 'No stations match that search.' : tab === 'saved' ? 'Tap the star on any station to save it.' : ''}
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line },
  input: { flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  tabs: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  tab: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
