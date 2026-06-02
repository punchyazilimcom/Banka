interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

/** Hafif SVG sparkline (kütüphanesiz, performanslı). */
export function Sparkline({ data, width = 90, height = 28, color = 'var(--c-accent)' }: Props) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * (height - 2) - 1).toFixed(1)}`)
    .join(' ');
  const last = data[data.length - 1];
  const up = last >= data[0];

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={points}
        fill="none"
        stroke={color === 'auto' ? (up ? 'var(--c-in)' : 'var(--c-out)') : color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
