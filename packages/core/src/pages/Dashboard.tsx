import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react';
import {
  computeTotals,
  filterByPeriod,
  dailyFlow,
  formatMoney,
  type Period,
} from '@gtt/shared';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { TransactionRow } from '../components/TransactionRow';
import { SkeletonCard } from '../components/ui/Skeleton';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Bugün' },
  { id: 'week', label: 'Hafta' },
  { id: 'month', label: 'Ay' },
];

export function Dashboard() {
  const txs = useStore((s) => s.transactions);
  const loading = useStore((s) => s.loading);
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('month');

  const periodTxs = useMemo(() => filterByPeriod(txs, period), [txs, period]);
  const totals = useMemo(() => computeTotals(periodTxs), [periodTxs]);
  const flow = useMemo(() => dailyFlow(periodTxs), [periodTxs]);
  const balance = useMemo(() => {
    const withBal = txs.find((t) => t.balanceAfter != null);
    return withBal?.balanceAfter ?? totals.net;
  }, [txs, totals.net]);
  const recent = txs.slice(0, 8);

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <SkeletonCard />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Dönem sekmeleri */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-pill)',
              fontSize: 13,
              fontWeight: 600,
              background: period === p.id ? 'var(--c-accent)' : 'var(--c-surface)',
              color: period === p.id ? '#0A0A0A' : 'var(--c-textSecondary)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Bakiye / net akış kartı */}
      <Card glow className="balance-gradient" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--c-textSecondary)', fontSize: 13 }}>
          <Wallet size={16} /> Güncel Bakiye
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, marginTop: 6, fontFamily: 'var(--font-heading)' }}>
          <AnimatedNumber value={balance} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13 }}>
          <TrendingUp size={15} color={totals.net >= 0 ? 'var(--c-in)' : 'var(--c-out)'} />
          <span style={{ color: totals.net >= 0 ? 'var(--c-in)' : 'var(--c-out)', fontWeight: 600 }}>
            {totals.net >= 0 ? '+' : ''}
            {formatMoney(totals.net)} net
          </span>
          <span style={{ color: 'var(--c-textMuted)' }}>· {PERIODS.find((p) => p.id === period)?.label}</span>
        </div>
      </Card>

      {/* Gelen / Giden / Net özet */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Gelen" value={totals.in} color="var(--c-in)" icon={<ArrowDownLeft size={18} />} delay={0.05} />
        <StatCard label="Giden" value={totals.out} color="var(--c-out)" icon={<ArrowUpRight size={18} />} delay={0.1} />
        <StatCard
          label="Net"
          value={totals.net}
          color={totals.net >= 0 ? 'var(--c-in)' : 'var(--c-out)'}
          icon={<TrendingUp size={18} />}
          delay={0.15}
        />
      </div>

      {/* Günlük akış grafiği */}
      <Card delay={0.2}>
        <h4 style={{ marginBottom: 14, fontSize: 15 }}>Günlük Akış</h4>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flow} margin={{ left: -18, right: 6, top: 4 }}>
              <defs>
                <linearGradient id="gin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#2ECC71" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gout" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4D4D" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#FF4D4D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} stroke="var(--c-textMuted)" fontSize={11} />
              <YAxis stroke="var(--c-textMuted)" fontSize={11} width={50} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Area type="monotone" dataKey="in" stroke="#2ECC71" fill="url(#gin)" strokeWidth={2} name="Gelen" />
              <Area type="monotone" dataKey="out" stroke="#FF4D4D" fill="url(#gout)" strokeWidth={2} name="Giden" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Son işlemler */}
      <Card delay={0.25}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ fontSize: 15 }}>Son İşlemler</h4>
          <button onClick={() => navigate('/transactions')} style={{ color: 'var(--c-accent)', fontSize: 13, fontWeight: 600 }}>
            Tümü →
          </button>
        </div>
        {recent.length === 0 ? (
          <p style={{ color: 'var(--c-textMuted)', fontSize: 13, padding: 12 }}>Henüz işlem yok.</p>
        ) : (
          recent.map((tx, i) => <TransactionRow key={tx.id} tx={tx} index={i} onClick={() => navigate('/transactions')} />)
        )}
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
  delay,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <Card delay={delay}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, fontSize: 13, fontWeight: 600 }}>
        {icon} {label}
      </div>
      <motion.div style={{ fontSize: 22, fontWeight: 700, marginTop: 8, color }}>
        <AnimatedNumber value={value} />
      </motion.div>
    </Card>
  );
}
