import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { server, setDeviceId } from './lib/api';
import { DEFAULT_PREFS, DEFAULT_STATIONS } from './lib/defaults';
import { Preferences, Station } from './lib/types';

type AppState = {
  ready: boolean;
  station: Station;
  saved: Station[];
  prefs: Preferences;
  synced: boolean;
  selectStation: (s: Station) => void;
  toggleSaved: (s: Station) => void;
  isSaved: (id: string) => boolean;
  updatePrefs: (p: Partial<Preferences>) => void;
};

const AppContext = createContext<AppState | null>(null);

const KEYS = { device: 'deviceId', station: 'station', saved: 'saved', prefs: 'prefs' };
const store = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {});

async function load<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [station, setStation] = useState<Station>(DEFAULT_STATIONS[0]);
  const [saved, setSaved] = useState<Station[]>(DEFAULT_STATIONS.slice(0, 3));
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    (async () => {
      let id = await AsyncStorage.getItem(KEYS.device);
      if (!id) {
        id = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        await AsyncStorage.setItem(KEYS.device, id);
      }
      setDeviceId(id);

      const localSaved = await load(KEYS.saved, DEFAULT_STATIONS.slice(0, 3));
      const localPrefs = await load(KEYS.prefs, DEFAULT_PREFS);
      setStation(await load(KEYS.station, DEFAULT_STATIONS[0]));
      setSaved(localSaved);
      setPrefs(localPrefs);
      setReady(true);

      try {
        const remote = await server.saved();
        const missing = localSaved.filter((s) => !remote.some((r) => r.id === s.id));
        await Promise.all(missing.map(server.save));
        const merged = [...remote, ...missing];
        setSaved(merged);
        store(KEYS.saved, merged);
        const remotePrefs = await server.preferences();
        const next = { units: remotePrefs.units, notifications: remotePrefs.notifications };
        setPrefs(next);
        store(KEYS.prefs, next);
        setSynced(true);
      } catch {
        setSynced(false);
      }
    })();
  }, []);

  const sync = useCallback((task: Promise<unknown>) => {
    task.then(() => setSynced(true)).catch(() => setSynced(false));
  }, []);

  const selectStation = useCallback((s: Station) => {
    const { distanceKm, ...clean } = s;
    setStation(clean);
    store(KEYS.station, clean);
    sync(server.updatePreferences({ defaultStationId: s.id }));
  }, [sync]);

  const toggleSaved = useCallback((s: Station) => {
    const { distanceKm, ...clean } = s;
    const exists = saved.some((x) => x.id === s.id);
    const next = exists ? saved.filter((x) => x.id !== s.id) : [...saved, clean];
    setSaved(next);
    store(KEYS.saved, next);
    sync(exists ? server.unsave(s.id) : server.save(clean));
  }, [saved, sync]);

  const updatePrefs = useCallback((p: Partial<Preferences>) => {
    const next = { ...prefs, ...p, notifications: { ...prefs.notifications, ...p.notifications } };
    setPrefs(next);
    store(KEYS.prefs, next);
    sync(server.updatePreferences(p));
  }, [prefs, sync]);

  const isSaved = useCallback((id: string) => saved.some((s) => s.id === id), [saved]);

  return (
    <AppContext.Provider value={{ ready, station, saved, prefs, synced, selectStation, toggleSaved, isSaved, updatePrefs }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
