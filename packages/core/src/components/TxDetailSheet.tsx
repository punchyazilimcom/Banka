import { motion } from 'framer-motion';
import { X, Building2, User, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { type Transaction, formatMoney } from '@gtt/shared';
import { useStore } from '../store/useStore';

interface Props {
  tx: Transaction;
  onClose: () => void;
}

/** İşlem detayı + kişi/firma sınıflandırma düzeltmesi (kalıcı). */
export function TxDetailSheet({ tx, onClose }: Props) {
  const correctType = useStore((s) => s.correctType);
  const isIn = tx.direction === 'in';
  const color = isIn ? 'var(--c-in)' : 'var(--c-out)';
  const dt = new Date(tx.datetime).toLocaleString('tr-TR');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="glass"
        style={{
          width: 460,
          maxWidth: '100%',
          margin: '0 auto',
          borderTopLeftRadius: 'var(--r-lg)',
          borderTopRightRadius: 'var(--r-lg)',
          borderBottom: 'none',
          padding: 'var(--s-lg)',
          marginBottom: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 13, color: 'var(--c-textMuted)' }}>İşlem Detayı</span>
          <button onClick={onClose}>
            <X size={20} color="var(--c-textSecondary)" />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--r-md)',
              display: 'grid',
              placeItems: 'center',
              background: isIn ? 'rgba(46,204,113,0.16)' : 'rgba(255,77,77,0.16)',
              color,
            }}
          >
            {isIn ? <ArrowDownLeft size={26} /> : <ArrowUpRight size={26} />}
          </div>
          <div>
            <div className="tabular" style={{ fontSize: 26, fontWeight: 800, color }}>
              {isIn ? '+' : '−'}
              {formatMoney(tx.amount, tx.currency).replace(/^[-−]/, '')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--c-textMuted)' }}>
              {isIn ? 'Gelen' : 'Giden'} · {tx.channel}
            </div>
          </div>
        </div>

        <Detail label="Karşı Taraf" value={tx.counterpartyName} />
        {tx.iban && <Detail label="IBAN" value={tx.iban} mono />}
        {tx.description && <Detail label="Açıklama" value={tx.description} />}
        <Detail label="Tarih" value={dt} />
        {tx.balanceAfter != null && <Detail label="İşlem Sonrası Bakiye" value={formatMoney(tx.balanceAfter, tx.currency)} />}

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 8 }}>
            Sınıflandırma (düzeltme kalıcı kaydedilir)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TypeBtn
              active={tx.counterpartyType === 'person'}
              onClick={() => correctType(tx.counterpartyName, 'person')}
              icon={<User size={16} />}
              label="Kişi"
            />
            <TypeBtn
              active={tx.counterpartyType === 'firm'}
              onClick={() => correctType(tx.counterpartyName, 'firm')}
              icon={<Building2 size={16} />}
              label="Firma"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '7px 0', fontSize: 14 }}>
      <span style={{ color: 'var(--c-textMuted)' }}>{label}</span>
      <span
        className={mono ? 'tabular' : ''}
        style={{ textAlign: 'right', fontWeight: 500, wordBreak: 'break-all', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </span>
    </div>
  );
}

function TypeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: '11px',
        borderRadius: 'var(--r-md)',
        fontSize: 14,
        fontWeight: 600,
        background: active ? 'var(--c-accent)' : 'var(--c-surface)',
        color: active ? '#0A0A0A' : 'var(--c-textSecondary)',
        border: '1px solid var(--c-border)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
