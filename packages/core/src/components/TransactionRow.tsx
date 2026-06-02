import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, Building2, User } from 'lucide-react';
import { type Transaction, formatMoney } from '@gtt/shared';

interface Props {
  tx: Transaction;
  onClick?: (tx: Transaction) => void;
  index?: number;
}

export function TransactionRow({ tx, onClick, index = 0 }: Props) {
  const isIn = tx.direction === 'in';
  const color = isIn ? 'var(--c-in)' : 'var(--c-out)';
  const time = new Date(tx.datetime).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      whileHover={{ background: 'var(--c-surface)' }}
      onClick={() => onClick?.(tx)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        borderRadius: 'var(--r-md)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 'var(--r-sm)',
          display: 'grid',
          placeItems: 'center',
          background: isIn ? 'rgba(46,204,113,0.14)' : 'rgba(255,77,77,0.14)',
          color,
        }}
      >
        {isIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {tx.counterpartyType === 'firm' ? (
            <Building2 size={13} color="var(--c-textMuted)" />
          ) : (
            <User size={13} color="var(--c-textMuted)" />
          )}
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {tx.counterpartyName}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginTop: 2 }}>
          {tx.channel} · {time}
          {tx.description ? ` · ${tx.description}` : ''}
        </div>
      </div>

      <div className="tabular" style={{ fontWeight: 700, fontSize: 15, color, whiteSpace: 'nowrap' }}>
        {isIn ? '+' : '−'}
        {formatMoney(tx.amount, tx.currency).replace(/^[-−]/, '')}
      </div>
    </motion.div>
  );
}
