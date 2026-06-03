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

  // Bu ay vs geçen ay + harcama limiti
  const monthlyLimit = useStore((s) => s.settings.monthlyLimit) || 0;
  const compare = useMemo(() => {
    const now = new Date();
    const thisKey = now.toISOString().slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = prev.toISOString().slice(0, 7);
    const t = computeTotals(txs.filter((x) => x.datetime.slice(0, 7) === thisKey));
    const p = computeTotals(txs.filter((x) => x.datetime.slice(0, 7) === prevKey));
    const pct = (cur: number, old: number) => (old > 0 ? ((cur - old) / old) * 100 : cur > 0 ? 100 : 0);
    return { thisIn: t.in, thisOut: t.out, inPct: pct(t.in, p.in), outPct: pct(t.out, p.out), hasPrev: p.count > 0 };
  }, [txs]);
  const limitPct = monthlyLimit > 0 ? Math.min(100, (compare.thisOut / monthlyLimit) * 100) : 0;
  const overLimit = monthlyLimit > 0 && compare.thisOut > monthlyLimit;

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

      {/* Aylık harcama limiti */}
      {monthlyLimit > 0 && (
        <Card delay={0.17}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={16} color="var(--c-accent)" /> Aylık Harcama Limiti
            </h4>
            <span className="tabular" style={{ fontSize: 13, color: overLimit ? 'var(--c-out)' : 'var(--c-textSecondary)' }}>
              {formatMoney(compare.thisOut)} / {formatMoney(monthlyLimit)}
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--c-surface)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ width: `${limitPct}%`, height: '100%', background: overLimit ? 'var(--c-out)' : 'var(--c-accent)', borderRadius: 999, transition: 'width .6s' }} />
          </div>
          {overLimit && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-out)', fontWeight: 600 }}>
              ⚠ Limit aşıldı: {formatMoney(compare.thisOut - monthlyLimit)} üzerinde
            </div>
          )}
        </Card>
      )}

      {/* Bu ay vs geçen ay */}
      {compare.hasPrev && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <CompareCard label="Bu ay gelen" value={compare.thisIn} pct={compare.inPct} good="up" delay={0.18} />
          <CompareCard label="Bu ay giden" value={compare.thisOut} pct={compare.outPct} good="down" delay={0.22} />
        </div>
      )}

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

function CompareCard({
  label,
  value,
  pct,
  good,
  delay,
}: {
  label: string;
  value: number;
  pct: number;
  good: 'up' | 'down';
  delay: number;
}) {
  const up = pct >= 0;
  // "good" yön: gelen artması iyi (yeşil), giden artması kötü (kırmızı)
  const positive = good === 'up' ? up : !up;
  const color = pct === 0 ? 'var(--c-textMuted)' : positive ? 'var(--c-in)' : 'var(--c-out)';
  return (
    <Card delay={delay}>
      <div style={{ fontSize: 13, color: 'var(--c-textMuted)' }}>{label}</div>
      <div className="tabular" style={{ fontSize: 20, fontWeight: 700, marginTop: 6 }}>{formatMoney(value)}</div>
      <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 600 }}>
        {up ? '▲' : '▼'} {Math.abs(pct).toFixed(0)}% <span style={{ color: 'var(--c-textMuted)', fontWeight: 400 }}>geçen aya göre</span>
      </div>
    </Card>
  );
}
