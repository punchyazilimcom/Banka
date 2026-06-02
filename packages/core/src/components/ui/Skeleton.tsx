interface Props {
  width?: number | string;
  height?: number | string;
  radius?: string;
  style?: React.CSSProperties;
}

/** Shimmer yükleme iskeleti. */
export function Skeleton({ width = '100%', height = 16, radius = 'var(--r-sm)', style }: Props) {
  return <div className="shimmer" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton width="40%" height={12} />
      <Skeleton width="70%" height={28} />
      <Skeleton width="100%" height={10} />
    </div>
  );
}
