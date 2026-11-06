import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadow } from '../theme';
import { sourceLabel } from '../lib/tide';
import { DataSource, Station } from '../lib/types';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

const toneColor = { ok: colors.ok, warn: colors.warn, error: colors.error };

export function SourceBadge({ source, fetchedAt }: { source: DataSource; fetchedAt: number }) {
  const { text, tone } = sourceLabel(source, fetchedAt);
  return (
    <View style={[styles.badge, { borderColor: toneColor[tone] }]}>
      <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
      <Text style={[styles.badgeText, { color: toneColor[tone] }]}>{text}</Text>
    </View>
  );
}

export function Notice({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'error' }) {
  return (
    <View style={[styles.notice, { borderLeftColor: toneColor[tone] }]}>
      <Text style={styles.noticeText}>{text}</Text>
    </View>
  );
}

type StationRowProps = {
  station: Station;
  selected?: boolean;
  saved?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function StationRow({ station, selected, saved, onPress, onToggleSave }: StationRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && { opacity: 0.7 }]}>
      <Ionicons name="location" size={20} color={selected ? colors.primary : colors.muted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{station.name}</Text>
        <Text style={styles.rowSub}>
          {[station.state, `#${station.id}`, station.distanceKm != null && `${station.distanceKm} km`].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {onToggleSave && (
        <Pressable hitSlop={10} onPress={onToggleSave} accessibilityLabel={saved ? 'Remove from saved' : 'Save station'}>
          <Ionicons name={saved ? 'star' : 'star-outline'} size={22} color={saved ? '#E6A700' : colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
}

export function Button({ label, icon, onPress, variant = 'primary' }: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
}) {
  const ghost = variant === 'ghost';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, ghost && styles.buttonGhost, pressed && { opacity: 0.75 }]}
    >
      {icon && <Ionicons name={icon} size={16} color={ghost ? colors.primary : '#fff'} />}
      <Text style={[styles.buttonText, ghost && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16, ...shadow },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  notice: { backgroundColor: '#FFF8EC', borderLeftWidth: 4, borderRadius: 10, padding: 12 },
  noticeText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: colors.card, borderRadius: 14, marginBottom: 8 },
  rowSelected: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  buttonGhost: { backgroundColor: colors.primarySoft },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
