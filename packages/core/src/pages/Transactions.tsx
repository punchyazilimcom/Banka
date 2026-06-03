import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X, ArrowDownUp, CalendarRange } from 'lucide-react';
import {
  type Transaction,
  type Direction,
  type CounterpartyType,
  normalizeName,
  computeTotals,
  formatMoney,
} from '@gtt/shared';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { TransactionRow } from '../components/TransactionRow';
import { TxDetailSheet } from '../components/TxDetailSheet';

type DirFilter = 'all' | Direction;
type TypeFilter = 'all' | CounterpartyType;
type SortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Bugün';
  if (d.toDateString() === y.toDateString()) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isoDay(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Hızlı tarih ön ayarları → [başlangıç, bitiş] (YYYY-MM-DD). */
function presetRange(p: 'today' | 'week' | 'month' | 'year'): [string, string] {
  const now = new Date();
  const end = isoDay(now);
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  if (p === 'week') s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  else if (p === 'month') s.setDate(1);
  else if (p === 'year') s.setMonth(0, 1);
  return [isoDay(s), end];
}

export function Transactions() {
  const txs = useStore((s) => s.transactions);
  const [q, setQ] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(40);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = normalizeName(q);
    const min = parseFloat(minAmount.replace(',', '.'));
    const max = parseFloat(maxAmount.replace(',', '.'));
    const list = txs.filter((t) => {
      if (dir !== 'all' && t.direction !== dir) return false;
      if (type !== 'all' && t.counterpartyType !== type) return false;
      if (!isNaN(min) && t.amount < min) return false;
      if (!isNaN(max) && t.amount > max) return false;
      const day = t.datetime.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (needle && !normalizeName(t.counterpartyName).includes(needle) && !normalizeName(t.description).includes(needle))
        return false;
      return true;
    });
    list.sort((a, b) => {
      switch (sort) {
        case 'date-asc': return a.datetime.localeCompare(b.datetime);
        case 'amount-desc': return b.amount - a.amount;
        case 'amount-asc': return a.amount - b.amount;
        default: return b.datetime.localeCompare(a.datetime);
      }
    });
    return list;
  }, [txs, q, dir, type, minAmount, maxAmount, from, to, sort]);

  const totals = useMemo(() => computeTotals(filtered), [filtered]);
  const shown = filtered.slice(0, visible);
  const activeFilters =
    (dir !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (minAmount ? 1 : 0) +
    (maxAmount ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const clearFilters = () => {
    setDir('all'); setType('all'); setMinAmount(''); setMaxAmount('');
    setFrom(''); setTo(''); setSort('date-desc');
  };

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

  useEffect(() => setVisible(40), [q, dir, type, minAmount, maxAmount, from, to, sort]);

  // Tarihe göre grupla (yalnızca tarih sıralamasında başlık göster)
  const grouped = sort.startsWith('date');
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
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-md)', padding: '0 14px',
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
            position: 'relative', padding: '0 16px', borderRadius: 'var(--r-md)',
            background: showFilters || activeFilters ? 'var(--c-accent)' : 'var(--c-surface)',
            color: showFilters || activeFilters ? '#0A0A0A' : 'var(--c-textSecondary)',
            display: 'grid', placeItems: 'center',
          }}
        >
          <SlidersHorizontal size={18} />
          {activeFilters > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--c-out)', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: 'grid', placeItems: 'center', padding: '0 4px' }}>
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filtreler */}
      {showFilters && (
        <Card>
          <div style={{ display: 'grid', gap: 18 }}>
            {/* Hızlı tarih ön ayarları */}
            <div>
              <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarRange size={13} /> Tarih aralığı
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {([['today', 'Bugün'], ['week', 'Bu hafta'], ['month', 'Bu ay'], ['year', 'Bu yıl']] as const).map(([p, l]) => (
                  <button
                    key={p}
                    onClick={() => { const [f, t] = presetRange(p); setFrom(f); setTo(t); }}
                    style={chip(false)}
                  >
                    {l}
                  </button>
                ))}
                {(from || to) && (
                  <button onClick={() => { setFrom(''); setTo(''); }} style={chip(false)}>Temizle</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-textMuted)' }}>Başlangıç</span>
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
                </label>
                <label style={{ display: 'grid', gap: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--c-textMuted)' }}>Bitiş</span>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
              <FilterGroup label="Yön" value={dir} onChange={(v) => setDir(v as DirFilter)}
                options={[['all', 'Tümü'], ['in', 'Gelen'], ['out', 'Giden']]} />
              <FilterGroup label="Taraf" value={type} onChange={(v) => setType(v as TypeFilter)}
                options={[['all', 'Tümü'], ['person', 'Kişi'], ['firm', 'Firma']]} />
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6 }}>Min. Tutar</div>
                <input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} inputMode="decimal" placeholder="0" style={{ ...inp, width: 110 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6 }}>Max. Tutar</div>
                <input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} inputMode="decimal" placeholder="∞" style={{ ...inp, width: 110 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <ArrowDownUp size={12} /> Sıralama
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ ...inp, paddingRight: 8 }}>
                  <option value="date-desc">Tarih (yeni → eski)</option>
                  <option value="date-asc">Tarih (eski → yeni)</option>
                  <option value="amount-desc">Tutar (büyük → küçük)</option>
                  <option value="amount-asc">Tutar (küçük → büyük)</option>
                </select>
              </div>
            </div>

            {activeFilters > 0 && (
              <button onClick={clearFilters} style={{ justifySelf: 'start', ...chip(true) }}>
                Tüm filtreleri temizle ({activeFilters})
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Filtrelenmiş özet */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
        <span style={{ color: 'var(--c-textMuted)' }}>{filtered.length} işlem</span>
        <span style={{ display: 'flex', gap: 12 }} className="tabular">
          <span style={{ color: 'var(--c-in)' }}>+{formatMoney(totals.in)}</span>
          <span style={{ color: 'var(--c-out)' }}>−{formatMoney(totals.out)}</span>
          <span style={{ fontWeight: 700, color: totals.net >= 0 ? 'var(--c-in)' : 'var(--c-out)' }}>
            {totals.net >= 0 ? '+' : '−'}{formatMoney(Math.abs(totals.net))}
          </span>
        </span>
      </div>

      {/* Liste */}
      {grouped ? (
        groups.map(([day, items]) => (
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
        ))
      ) : (
        <Card style={{ padding: 6 }}>
          {shown.map((tx, i) => (
            <TransactionRow key={tx.id} tx={tx} index={i} onClick={setSelected} />
          ))}
        </Card>
      )}

      {filtered.length === 0 && (
        <p style={{ color: 'var(--c-textMuted)', textAlign: 'center', padding: 40 }}>Eşleşen işlem bulunamadı.</p>
      )}

      <div ref={sentinel} style={{ height: 1 }} />
      {selected && <TxDetailSheet tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const inp: React.CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r-sm)',
  padding: '8px 12px',
  fontSize: 14,
  colorScheme: 'dark',
};

function chip(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: 'var(--r-pill)',
    fontSize: 13,
    fontWeight: 600,
    background: active ? 'var(--c-accent)' : 'var(--c-surface)',
    color: active ? '#0A0A0A' : 'var(--c-textSecondary)',
    border: '1px solid var(--c-border)',
  };
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
