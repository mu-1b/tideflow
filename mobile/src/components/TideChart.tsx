import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { colors } from '../theme';
import { formatTime, levelAt, unitLabel } from '../lib/tide';
import { TideData } from '../lib/types';

const HEIGHT = 200;
const PAD = { top: 22, bottom: 26, left: 34, right: 10 };

export default function TideChart({ data }: { data: TideData }) {
  const [width, setWidth] = useState(0);
  const { curve, extremes, units } = data;
  if (curve.length < 2) return <Text style={styles.empty}>No prediction curve available for this station.</Text>;

  const t0 = new Date(curve[0].time).getTime();
  const t1 = new Date(curve[curve.length - 1].time).getTime();
  const heights = curve.map((p) => p.height);
  const minH = Math.floor(Math.min(...heights) - 0.3);
  const maxH = Math.ceil(Math.max(...heights) + 0.3);

  const innerW = Math.max(1, width - PAD.left - PAD.right);
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW;
  const y = (h: number) => PAD.top + (1 - (h - minH) / (maxH - minH)) * innerH;

  const line = curve.map((p, i) => `${i ? 'L' : 'M'}${x(new Date(p.time).getTime()).toFixed(1)},${y(p.height).toFixed(1)}`).join(' ');
  const area = `${line} L${x(t1)},${y(minH)} L${x(t0)},${y(minH)} Z`;

  const now = Date.now();
  const nowLevel = levelAt(curve, now);
  const ticks = [minH, (minH + maxH) / 2, maxH];

  const dayMarks: number[] = [];
  const d = new Date(t0);
  d.setHours(24, 0, 0, 0);
  for (; d.getTime() < t1; d.setDate(d.getDate() + 1)) dayMarks.push(d.getTime());

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Defs>
            <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.primary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.primary} stopOpacity={0.03} />
            </LinearGradient>
          </Defs>

          {ticks.map((h) => (
            <Line key={h} x1={PAD.left} x2={width - PAD.right} y1={y(h)} y2={y(h)} stroke={colors.line} strokeDasharray="3 4" />
          ))}
          {ticks.map((h) => (
            <SvgText key={`l${h}`} x={PAD.left - 6} y={y(h) + 4} fontSize={10} fill={colors.muted} textAnchor="end">
              {h.toFixed(h % 1 ? 1 : 0)}
            </SvgText>
          ))}

          {dayMarks.map((t) => (
            <SvgText key={t} x={x(t)} y={HEIGHT - 8} fontSize={10} fill={colors.muted} textAnchor="middle">
              {new Date(t).toLocaleDateString([], { weekday: 'short' })}
            </SvgText>
          ))}
          {dayMarks.map((t) => (
            <Line key={`d${t}`} x1={x(t)} x2={x(t)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke={colors.line} />
          ))}

          <Path d={area} fill="url(#water)" />
          <Path d={line} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" />

          {extremes
            .filter((e) => {
              const t = new Date(e.time).getTime();
              return t >= t0 && t <= t1;
            })
            .map((e) => {
              const cx = x(new Date(e.time).getTime());
              const cy = y(e.height);
              const high = e.type === 'high';
              return (
                <Circle key={e.time} cx={cx} cy={cy} r={4} fill="#fff" stroke={high ? colors.high : colors.low} strokeWidth={2} />
              );
            })}

          {now >= t0 && now <= t1 && (
            <>
              <Line x1={x(now)} x2={x(now)} y1={PAD.top - 8} y2={HEIGHT - PAD.bottom} stroke={colors.ink} strokeWidth={1} strokeDasharray="2 3" />
              <SvgText x={x(now)} y={PAD.top - 11} fontSize={10} fontWeight="700" fill={colors.ink} textAnchor="middle">
                Now
              </SvgText>
              {nowLevel != null && <Circle cx={x(now)} cy={y(nowLevel)} r={5} fill={colors.ink} />}
            </>
          )}
        </Svg>
      )}
      <Text style={styles.caption}>
        Water level ({unitLabel(units)}, {data.datum}) · {formatTime(curve[0].time)} → {formatTime(curve[curve.length - 1].time)}
        {data.curveInterpolated ? ' · curve interpolated from high/low times' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.muted, paddingVertical: 24, textAlign: 'center' },
  caption: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
