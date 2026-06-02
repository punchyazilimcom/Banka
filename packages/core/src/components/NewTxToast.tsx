import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatMoney } from '@gtt/shared';
import { useStore } from '../store/useStore';
import { notifyNewTransaction } from '../lib/notify';

/** Yeni işlem geldiğinde sağ üstte beliren toast + sistem bildirimi. */
export function NewTxToast() {
  const lastNew = useStore((s) => s.lastNew);
  const notificationsEnabled = useStore((s) => s.settings.notificationsEnabled);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!lastNew) return;
    setVisible(true);
    if (notificationsEnabled) notifyNewTransaction(lastNew);
    const t = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(t);
  }, [lastNew, notificationsEnabled]);

  const isIn = lastNew?.direction === 'in';

  return (
    <AnimatePresence>
      {visible && lastNew && (
        <motion.div
          initial={{ opacity: 0, x: 60, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 60 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          className="glass"
          style={{
            position: 'fixed',
            top: 18,
            right: 18,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-glow)',
            minWidth: 260,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--r-sm)',
              display: 'grid',
              placeItems: 'center',
              background: isIn ? 'rgba(46,204,113,0.16)' : 'rgba(255,77,77,0.16)',
              color: isIn ? 'var(--c-in)' : 'var(--c-out)',
            }}
          >
            {isIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--c-textSecondary)' }}>
              Yeni {isIn ? 'gelen' : 'giden'} · {lastNew.channel}
            </div>
            <div className="tabular" style={{ fontWeight: 700, color: isIn ? 'var(--c-in)' : 'var(--c-out)' }}>
              {formatMoney(lastNew.amount, lastNew.currency)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--c-textMuted)' }}>{lastNew.counterpartyName}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
