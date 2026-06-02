import { useEffect, useRef, useState } from 'react';
import { formatMoney, formatNumber, type Currency } from '@gtt/shared';

interface Props {
  value: number;
  currency?: Currency;
  money?: boolean;
  durationMs?: number;
  className?: string;
}

/** Hedef değere doğru yumuşak sayar (animasyonlu sayaç), tabular-nums. */
export function AnimatedNumber({ value, currency = 'TRY', money = true, durationMs = 900, className }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current!);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      const cur = from + (value - from) * eased;
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [value, durationMs]);

  return (
    <span className={`tabular ${className ?? ''}`}>
      {money ? formatMoney(display, currency) : formatNumber(display)}
    </span>
  );
}
