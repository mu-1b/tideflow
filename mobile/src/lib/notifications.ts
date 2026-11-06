import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { formatHeight, formatTime } from './tide';
import { NotificationPrefs, Station, TideData } from './types';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function requestPermission() {
  if (!notificationsSupported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tides', {
      name: 'Tide alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Replaces any previously scheduled tide alerts with ones for the current station.
export async function scheduleTideAlerts(station: Station, tides: TideData, prefs: NotificationPrefs) {
  if (!notificationsSupported) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!prefs.enabled || tides.source === 'sample') return 0;

  const now = Date.now();
  const events = tides.extremes.filter((e) => (e.type === 'high' ? prefs.highs : prefs.lows));
  let count = 0;
  for (const e of events) {
    const fireAt = new Date(e.time).getTime() - prefs.leadMinutes * 60000;
    if (fireAt <= now + 60000) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${e.type === 'high' ? 'High' : 'Low'} tide at ${station.name}`,
        body: `${formatHeight(e.height, tides.units)} at ${formatTime(e.time)}`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt), channelId: 'tides' },
    });
    count++;
  }
  return count;
}
