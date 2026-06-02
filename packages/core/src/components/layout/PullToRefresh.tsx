import { useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

interface Props {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  style?: React.CSSProperties;
}

/** Mobil pull-to-refresh: scroll en üstteyken aşağı çekince yeniler. */
export function PullToRefresh({ onRefresh, children, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 70;

  const onTouchStart = (e: React.TouchEvent) => {
    if (ref.current && ref.current.scrollTop <= 0) startY.current = e.touches[0].clientY;
    else startY.current = -1;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current < 0 || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, 100));
  };
  const onTouchEnd = async () => {
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      ref={ref}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overflowY: 'auto', position: 'relative', ...style }}
    >
      <div
        style={{
          height: pull,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transition: refreshing ? 'none' : 'height .2s',
        }}
      >
        <motion.div animate={{ rotate: refreshing ? 360 : pull * 3 }} transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: 'linear' } : {}}>
          <RefreshCw size={20} color="var(--c-accent)" style={{ opacity: Math.min(pull / THRESHOLD, 1) }} />
        </motion.div>
      </div>
      {children}
    </div>
  );
}
