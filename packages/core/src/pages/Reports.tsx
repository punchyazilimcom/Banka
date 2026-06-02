import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { monthlyFlow, topCounterparties, computeTotals, formatMoney } from '@gtt/shared';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportXlsx, exportPdf } from '../lib/export';

export function Reports() {
  const txs = useStore((s) => s.transactions);
  const monthly = useMemo(() => monthlyFlow(txs), [txs]);
  const topFirms = useMemo(() => topCounterparties(txs.filter((t) => t.counterpartyType === 'firm'), 'out', 10), [txs]);
  const totals = useMemo(() => computeTotals(txs), [txs]);

  const pieData = [
    { name: 'Gelen', value: totals.in, color: '#2ECC71' },
    { name: 'Giden', value: totals.out, color: '#FF4D4D' },
  ];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" onClick={() => exportXlsx(txs)}>
          <FileSpreadsheet size={16} /> Excel (.xlsx)
        </Button>
        <Button variant="surface" onClick={() => exportPdf(txs)}>
          <FileText size={16} /> PDF
        </Button>
      </div>

      <Card>
        <h4 style={{ marginBottom: 14, fontSize: 15 }}>Aylık Gelen / Giden</h4>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ left: -16, right: 6, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="var(--c-textMuted)" fontSize={11} />
              <YAxis stroke="var(--c-textMuted)" fontSize={11} width={52} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(v: number) => formatMoney(v)}
              />
              <Legend />
              <Bar dataKey="in" name="Gelen" fill="#2ECC71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="out" name="Giden" fill="#FF4D4D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
        <Card delay={0.05}>
          <h4 style={{ marginBottom: 14, fontSize: 15 }}>Gelen / Giden Dağılımı</h4>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={3}>
                  {pieData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card delay={0.1}>
          <h4 style={{ marginBottom: 14, fontSize: 15 }}>En Çok Ödeme Yapılan 10 Firma</h4>
          {topFirms.length === 0 ? (
            <p style={{ color: 'var(--c-textMuted)', fontSize: 13 }}>Veri yok.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {topFirms.map((f, i) => {
                const max = topFirms[0].total || 1;
                return (
                  <div key={f.name} style={{ display: 'grid', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--c-textSecondary)' }}>
                        {i + 1}. {f.name}
                      </span>
                      <span className="tabular" style={{ fontWeight: 600 }}>{formatMoney(f.total)}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--c-surface)', borderRadius: 999 }}>
                      <div style={{ width: `${(f.total / max) * 100}%`, height: '100%', background: 'var(--c-accent)', borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
