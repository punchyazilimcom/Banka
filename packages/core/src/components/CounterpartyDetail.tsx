import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';
import { type Transaction, computeTotals, dailyFlow, formatMoney } from '@gtt/shared';
import { TransactionRow } from './TransactionRow';

interface Props {
  name: string;
  txs: Transaction[];
  onClose: () => void;
}

/** Bir kişi/firmanın tüm geçmişi + net akış grafiği. */
export function CounterpartyDetail({ name, txs, onClose }: Props) {
  const totals = useMemo(() => computeTotals(txs), [txs]);
  const flow = useMemo(() => dailyFlow(txs), [txs]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' }}
    >
      <motion.div
        initial={{ x: 80 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          maxWidth: '100%',
          height: '100%',
          background: 'var(--c-bg)',
          borderLeft: '1px solid var(--c-border)',
          padding: 'var(--s-lg)',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18 }}>{name}</h3>
          <button onClick={onClose}><X size={22} color="var(--c-textSecondary)" /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          <Stat label="Gelen" value={totals.in} color="var(--c-in)" />
          <Stat label="Giden" value={totals.out} color="var(--c-out)" />
          <Stat label="Net" value={totals.net} color={totals.net >= 0 ? 'var(--c-in)' : 'var(--c-out)'} />
        </div>

        <div style={{ height: 180, marginBottom: 18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} margin={{ left: 0, right: 0, top: 6 }}>
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="var(--c-textMuted)" fontSize={10} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {flow.map((f, i) => (
                  <Cell key={i} fill={f.net >= 0 ? '#2ECC71' : '#FF4D4D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ fontSize: 13, color: 'var(--c-textMuted)', marginBottom: 8 }}>{txs.length} işlem</div>
        {txs.map((tx, i) => (
          <TransactionRow key={tx.id} tx={tx} index={i} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--c-card)', borderRadius: 'var(--r-md)', padding: '12px', border: '1px solid var(--c-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--c-textMuted)' }}>{label}</div>
      <div className="tabular" style={{ fontSize: 15, fontWeight: 700, color, marginTop: 4 }}>{formatMoney(value)}</div>
    </div>
  );
}
