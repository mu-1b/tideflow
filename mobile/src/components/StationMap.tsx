import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_TOKEN } from '../lib/config';
import { getStations } from '../lib/api';
import { Station } from '../lib/types';
import { colors } from '../theme';

Mapbox.setAccessToken(MAPBOX_TOKEN);

type Props = {
  selected: Station;
  savedIds: string[];
  onSelect: (s: Station) => void;
};

export default function StationMap({ selected, savedIds, onSelect }: Props) {
  const [stations, setStations] = useState<Station[]>([selected]);
  const lastCenter = useRef<string>('');

  const loadAround = useCallback(async (lon: number, lat: number) => {
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`;
    if (key === lastCenter.current) return;
    lastCenter.current = key;
    const { stations: found } = await getStations({ near: { lat, lon }, limit: 150 });
    setStations(found);
  }, []);

  const shape = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: stations.map((s) => ({
        type: 'Feature',
        id: s.id,
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: {
          station: JSON.stringify(s),
          name: s.name,
          status: s.id === selected.id ? 'selected' : savedIds.includes(s.id) ? 'saved' : 'default',
        },
      })),
    }),
    [stations, selected.id, savedIds],
  );

  return (
    <Mapbox.MapView
      style={StyleSheet.absoluteFill}
      styleURL={Mapbox.StyleURL.Outdoors}
      scaleBarEnabled={false}
      onMapIdle={(state) => {
        const [lon, lat] = state.properties.center;
        if (state.properties.zoom >= 5) loadAround(lon, lat);
      }}
    >
      <Mapbox.Camera
        defaultSettings={{ centerCoordinate: [selected.lon, selected.lat], zoomLevel: 8 }}
        centerCoordinate={[selected.lon, selected.lat]}
        zoomLevel={9}
        animationDuration={800}
      />
      <Mapbox.UserLocation visible />
      <Mapbox.ShapeSource
        id="stations"
        shape={shape}
        onPress={(e) => {
          const raw = e.features[0]?.properties?.station;
          if (raw) onSelect(JSON.parse(raw));
        }}
      >
        <Mapbox.CircleLayer
          id="station-circles"
          style={{
            circleRadius: ['match', ['get', 'status'], 'selected', 10, 'saved', 7, 6],
            circleColor: ['match', ['get', 'status'], 'selected', colors.low, 'saved', '#E6A700', colors.primary],
            circleStrokeColor: '#ffffff',
            circleStrokeWidth: 2,
          }}
        />
        <Mapbox.SymbolLayer
          id="station-labels"
          minZoomLevel={9}
          style={{
            textField: ['get', 'name'],
            textSize: 11,
            textOffset: [0, 1.3],
            textAnchor: 'top',
            textColor: colors.ink,
            textHaloColor: '#ffffff',
            textHaloWidth: 1.2,
          }}
        />
      </Mapbox.ShapeSource>
    </Mapbox.MapView>
  );
}
