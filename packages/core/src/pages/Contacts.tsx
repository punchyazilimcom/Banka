import { useMemo, useState } from 'react';
import { Building2, User, ChevronRight } from 'lucide-react';
import {
  type CounterpartyType,
  type CounterpartySummary,
  summarizeCounterparties,
  formatMoney,
  normalizeName,
} from '@gtt/shared';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Sparkline } from '../components/ui/Sparkline';
import { CounterpartyDetail } from '../components/CounterpartyDetail';

export function Contacts() {
  const txs = useStore((s) => s.transactions);
  const [tab, setTab] = useState<CounterpartyType>('person');
  const [selected, setSelected] = useState<string | null>(null);

  const summaries = useMemo(() => summarizeCounterparties(txs), [txs]);
  const list = summaries.filter((s) => s.type === tab);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Tab active={tab === 'person'} onClick={() => setTab('person')} icon={<User size={16} />} label="Kişiler" count={summaries.filter((s) => s.type === 'person').length} />
        <Tab active={tab === 'firm'} onClick={() => setTab('firm')} icon={<Building2 size={16} />} label="Firmalar" count={summaries.filter((s) => s.type === 'firm').length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
        {list.map((c, i) => (
          <ContactCard key={c.name} c={c} delay={i * 0.03} onClick={() => setSelected(c.name)} />
        ))}
      </div>

      {list.length === 0 && (
        <p style={{ color: 'var(--c-textMuted)', textAlign: 'center', padding: 40 }}>Kayıt yok.</p>
      )}

      {selected && (
        <CounterpartyDetail
          name={selected}
          txs={txs.filter((t) => normalizeName(t.counterpartyName) === normalizeName(selected))}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ContactCard({ c, onClick, delay }: { c: CounterpartySummary; onClick: () => void; delay: number }) {
  return (
    <Card onClick={onClick} delay={delay} style={{ padding: 'var(--s-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--c-surface)', display: 'grid', placeItems: 'center', color: 'var(--c-accent)', flexShrink: 0 }}>
            {c.type === 'firm' ? <Building2 size={18} /> : <User size={18} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
            <div style={{ fontSize: 12, color: 'var(--c-textMuted)' }}>{c.count} işlem</div>
          </div>
        </div>
        <ChevronRight size={16} color="var(--c-textMuted)" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ display: 'grid', gap: 2 }}>
          <span className="tabular" style={{ fontSize: 12, color: 'var(--c-in)' }}>+{formatMoney(c.totalIn)}</span>
          <span className="tabular" style={{ fontSize: 12, color: 'var(--c-out)' }}>−{formatMoney(c.totalOut)}</span>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700, color: c.net >= 0 ? 'var(--c-in)' : 'var(--c-out)' }}>
            {c.net >= 0 ? '+' : '−'}{formatMoney(Math.abs(c.net))}
          </span>
        </div>
        <Sparkline data={c.spark} color="auto" />
      </div>
    </Card>
  );
}

function Tab({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 18px',
        borderRadius: 'var(--r-pill)',
        fontSize: 14,
        fontWeight: 600,
        background: active ? 'var(--c-accent)' : 'var(--c-surface)',
        color: active ? '#0A0A0A' : 'var(--c-textSecondary)',
      }}
    >
      {icon} {label}
      <span style={{ opacity: 0.7, fontSize: 12 }}>{count}</span>
    </button>
  );
}
