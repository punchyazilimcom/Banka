import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { type Transaction, type Direction, type CounterpartyType, normalizeName } from '@gtt/shared';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { TransactionRow } from '../components/TransactionRow';
import { TxDetailSheet } from '../components/TxDetailSheet';

type DirFilter = 'all' | Direction;
type TypeFilter = 'all' | CounterpartyType;

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === y.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function Transactions() {
  const txs = useStore((s) => s.transactions);
  const [q, setQ] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(40);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = normalizeName(q);
    const min = parseFloat(minAmount.replace(',', '.'));
    return txs.filter((t) => {
      if (dir !== 'all' && t.direction !== dir) return false;
      if (type !== 'all' && t.counterpartyType !== type) return false;
      if (!isNaN(min) && t.amount < min) return false;
      if (needle && !normalizeName(t.counterpartyName).includes(needle) && !normalizeName(t.description).includes(needle))
        return false;
      return true;
    });
  }, [txs, q, dir, type, minAmount]);

  const shown = filtered.slice(0, visible);

  // Sonsuz kaydırma
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible((v) => Math.min(v + 40, filtered.length));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [filtered.length]);

  useEffect(() => setVisible(40), [q, dir, type, minAmount]);

  // Tarihe göre grupla
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of shown) {
      const k = t.datetime.slice(0, 10);
      (map.get(k) ?? map.set(k, []).get(k)!).push(t);
    }
    return [...map.entries()];
  }, [shown]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Arama + filtre düğmesi */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'var(--c-card)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)',
            padding: '0 14px',
          }}
        >
          <Search size={18} color="var(--c-textMuted)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kişi, firma veya açıklama ara…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', padding: '13px 0', fontSize: 14 }}
          />
          {q && (
            <button onClick={() => setQ('')}>
              <X size={16} color="var(--c-textMuted)" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            padding: '0 16px',
            borderRadius: 'var(--r-md)',
            background: showFilters ? 'var(--c-accent)' : 'var(--c-surface)',
            color: showFilters ? '#0A0A0A' : 'var(--c-textSecondary)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {/* Filtreler */}
      {showFilters && (
        <Card>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            <FilterGroup
              label="Yön"
              value={dir}
              onChange={(v) => setDir(v as DirFilter)}
              options={[
                ['all', 'Tümü'],
                ['in', 'Gelen'],
                ['out', 'Giden'],
              ]}
            />
            <FilterGroup
              label="Taraf"
              value={type}
              onChange={(v) => setType(v as TypeFilter)}
              options={[
                ['all', 'Tümü'],
                ['person', 'Kişi'],
                ['firm', 'Firma'],
              ]}
            />
            <div>
              <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6 }}>Min. Tutar</div>
              <input
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                style={{
                  background: 'var(--c-surface)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r-sm)',
                  padding: '8px 12px',
                  width: 120,
                  fontSize: 14,
                }}
              />
            </div>
          </div>
        </Card>
      )}

      <div style={{ fontSize: 13, color: 'var(--c-textMuted)' }}>{filtered.length} işlem</div>

      {/* Gruplu liste */}
      {groups.map(([day, items]) => (
        <div key={day}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-textSecondary)', margin: '4px 6px 8px', letterSpacing: 0.4 }}>
            {dateLabel(day).toUpperCase()}
          </div>
          <Card style={{ padding: 6 }}>
            {items.map((tx, i) => (
              <TransactionRow key={tx.id} tx={tx} index={i} onClick={setSelected} />
            ))}
          </Card>
        </div>
      ))}

      {filtered.length === 0 && (
        <p style={{ color: 'var(--c-textMuted)', textAlign: 'center', padding: 40 }}>Eşleşen işlem bulunamadı.</p>
      )}

      <div ref={sentinel} style={{ height: 1 }} />
      {selected && <TxDetailSheet tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function FilterGroup({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--r-pill)',
              fontSize: 13,
              fontWeight: 600,
              background: value === v ? 'var(--c-accent)' : 'var(--c-surface)',
              color: value === v ? '#0A0A0A' : 'var(--c-textSecondary)',
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
