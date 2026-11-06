import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { API_URL } from '../lib/config';
import { notificationsSupported, requestPermission } from '../lib/notifications';
import { Card, Notice, SectionTitle } from '../components/ui';
import { colors } from '../theme';

const LEAD_OPTIONS = [0, 15, 30, 60, 120];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { prefs, updatePrefs, synced, station } = useApp();
  const [error, setError] = useState<string | null>(null);
  const n = prefs.notifications;

  const toggleAlerts = async (enabled: boolean) => {
    setError(null);
    if (enabled && !(await requestPermission())) {
      setError('Notification permission was denied. Enable it in system settings to get tide alerts.');
      return;
    }
    updatePrefs({ notifications: { ...n, enabled } });
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Settings</Text>

      <Card>
        <SectionTitle>Units</SectionTitle>
        <View style={styles.segment}>
          {(['english', 'metric'] as const).map((u) => (
            <Pressable key={u} onPress={() => updatePrefs({ units: u })} style={[styles.segItem, prefs.units === u && styles.segActive]}>
              <Text style={[styles.segText, prefs.units === u && { color: '#fff' }]}>{u === 'english' ? 'Feet · °F' : 'Meters · °C'}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <SectionTitle>Tide alerts</SectionTitle>
        {!notificationsSupported ? (
          <Text style={styles.muted}>Local notifications are only available on iOS and Android.</Text>
        ) : (
          <>
            <Row label="Notify me before tides" sub={`For ${station.name}`}>
              <Switch value={n.enabled} onValueChange={toggleAlerts} trackColor={{ true: colors.primary }} />
            </Row>
            <Row label="High tides">
              <Switch value={n.highs} disabled={!n.enabled} onValueChange={(highs) => updatePrefs({ notifications: { ...n, highs } })} trackColor={{ true: colors.primary }} />
            </Row>
            <Row label="Low tides">
              <Switch value={n.lows} disabled={!n.enabled} onValueChange={(lows) => updatePrefs({ notifications: { ...n, lows } })} trackColor={{ true: colors.primary }} />
            </Row>
            <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>Alert lead time</Text>
            <View style={styles.segment}>
              {LEAD_OPTIONS.map((m) => (
                <Pressable
                  key={m}
                  disabled={!n.enabled}
                  onPress={() => updatePrefs({ notifications: { ...n, leadMinutes: m } })}
                  style={[styles.segItem, n.leadMinutes === m && styles.segActive, !n.enabled && { opacity: 0.5 }]}
                >
                  <Text style={[styles.segText, n.leadMinutes === m && { color: '#fff' }]}>{m === 0 ? 'At' : m < 60 ? `${m}m` : `${m / 60}h`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.muted, { marginTop: 10 }]}>Alerts cover the next ~2 days and refresh whenever you open the app.</Text>
          </>
        )}
        {error && <View style={{ marginTop: 10 }}><Notice text={error} /></View>}
      </Card>

      <Card>
        <SectionTitle>Sync</SectionTitle>
        <Row label={synced ? 'Synced with TideFlow server' : 'Saved on this device only'} sub={API_URL}>
          <View style={[styles.dot, { backgroundColor: synced ? colors.ok : colors.warn }]} />
        </Row>
      </Card>

      <Card>
        <SectionTitle>About</SectionTitle>
        <Text style={styles.muted}>
          TideFlow is a HackNJIT project. Tide predictions come from NOAA CO-OPS, weather from Open-Meteo, and maps from Mapbox. Predictions are relative to MLLW and are not for navigation.
        </Text>
      </Card>
    </ScrollView>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {sub && <Text style={styles.muted} numberOfLines={1}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  label: { fontSize: 15, color: colors.ink, fontWeight: '500' },
  muted: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
  segActive: { backgroundColor: colors.primary },
  segText: { fontWeight: '600', color: colors.ink, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
