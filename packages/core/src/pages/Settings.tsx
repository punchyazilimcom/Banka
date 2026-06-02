import { useState } from 'react';
import { Mail, Palette, RefreshCw, Database, Tags, Building2, User, Bell } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const IMAP_KEY = 'gtt.imap.settings';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const overrides = useStore((s) => s.overrides);
  const correctType = useStore((s) => s.correctType);
  const txs = useStore((s) => s.transactions);

  const [imap, setImap] = useState(() => {
    try {
      return { host: 'imap.gmail.com', port: 993, user: '', mailbox: 'INBOX', ...JSON.parse(localStorage.getItem(IMAP_KEY) ?? '{}') };
    } catch {
      return { host: 'imap.gmail.com', port: 993, user: '', mailbox: 'INBOX' };
    }
  });

  const saveImap = () => {
    localStorage.setItem(IMAP_KEY, JSON.stringify(imap));
    alert('IMAP ayarları kaydedildi. Şifre worker tarafında .env içinde güvenli saklanır.');
  };

  const setTheme = (theme: 'dark' | 'light') => {
    updateSettings({ theme });
    document.documentElement.dataset.theme = theme;
  };

  const backup = () => {
    const blob = new Blob([JSON.stringify({ transactions: txs, overrides, settings }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garanti-yedek-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 640 }}>
      {/* IMAP */}
      <Card>
        <SectionTitle icon={<Mail size={18} />}>IMAP Hesabı</SectionTitle>
        <p style={{ fontSize: 12, color: 'var(--c-textMuted)', marginBottom: 14 }}>
          Worker mailleri okur. Şifre koda/UI'a yazılmaz; worker .env üzerinden güvenli alınır.
        </p>
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="Sunucu" value={imap.host} onChange={(v) => setImap({ ...imap, host: v })} />
          <Field label="Port" value={String(imap.port)} onChange={(v) => setImap({ ...imap, port: Number(v) || 993 })} />
          <Field label="Kullanıcı (e-posta)" value={imap.user} onChange={(v) => setImap({ ...imap, user: v })} />
          <Field label="Klasör" value={imap.mailbox} onChange={(v) => setImap({ ...imap, mailbox: v })} />
        </div>
        <div style={{ marginTop: 14 }}>
          <Button onClick={saveImap}>Kaydet</Button>
        </div>
      </Card>

      {/* Senkron */}
      <Card>
        <SectionTitle icon={<RefreshCw size={18} />}>Senkron Sıklığı</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {[30, 60, 300].map((sec) => (
            <button
              key={sec}
              onClick={() => updateSettings({ syncIntervalSec: sec })}
              style={pill(settings.syncIntervalSec === sec)}
            >
              {sec < 60 ? `${sec} sn` : `${sec / 60} dk`}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--c-textMuted)', marginTop: 10 }}>
          Not: Worker IMAP IDLE ile gerçek zamanlı dinler; bu sıklık yalnızca yedek tam taramadır.
        </p>
      </Card>

      {/* Bildirim */}
      <Card>
        <SectionTitle icon={<Bell size={18} />}>Bildirimler</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => updateSettings({ notificationsEnabled: true })} style={pill(settings.notificationsEnabled)}>Açık</button>
          <button onClick={() => updateSettings({ notificationsEnabled: false })} style={pill(!settings.notificationsEnabled)}>Kapalı</button>
        </div>
      </Card>

      {/* Tema */}
      <Card>
        <SectionTitle icon={<Palette size={18} />}>Tema</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => setTheme('dark')} style={pill(settings.theme === 'dark')}>Karanlık</button>
          <button onClick={() => setTheme('light')} style={pill(settings.theme === 'light')}>Aydınlık</button>
        </div>
      </Card>

      {/* Yedek */}
      <Card>
        <SectionTitle icon={<Database size={18} />}>Yedekleme</SectionTitle>
        <p style={{ fontSize: 12, color: 'var(--c-textMuted)', margin: '8px 0 14px' }}>
          Tüm işlemleri ve ayarları JSON olarak dışa aktarın.
        </p>
        <Button variant="surface" onClick={backup}>JSON Yedeği İndir</Button>
      </Card>

      {/* Sınıflandırma düzeltmeleri */}
      <Card>
        <SectionTitle icon={<Tags size={18} />}>Sınıflandırma Düzeltmeleri</SectionTitle>
        {Object.keys(overrides).length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--c-textMuted)', marginTop: 10 }}>
            Henüz düzeltme yok. Bir işlemde kişi/firma değiştirdiğinizde burada listelenir.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {Object.values(overrides).map((o) => (
              <div key={o.nameKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--c-surface)', borderRadius: 'var(--r-sm)' }}>
                <span style={{ fontSize: 13 }}>{o.nameKey}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => correctType(o.nameKey, 'person')} style={miniPill(o.type === 'person')}>
                    <User size={13} /> Kişi
                  </button>
                  <button onClick={() => correctType(o.nameKey, 'firm')} style={miniPill(o.type === 'firm')}>
                    <Building2 size={13} /> Firma
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--c-accent)' }}>
      {icon} {children}
    </h4>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: 12, color: 'var(--c-textMuted)' }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', fontSize: 14 }}
      />
    </label>
  );
}

const pill = (active: boolean): React.CSSProperties => ({
  padding: '9px 18px',
  borderRadius: 'var(--r-pill)',
  fontSize: 13,
  fontWeight: 600,
  background: active ? 'var(--c-accent)' : 'var(--c-surface)',
  color: active ? '#0A0A0A' : 'var(--c-textSecondary)',
});

const miniPill = (active: boolean): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 10px',
  borderRadius: 'var(--r-pill)',
  fontSize: 12,
  fontWeight: 600,
  background: active ? 'var(--c-accent)' : 'var(--c-card)',
  color: active ? '#0A0A0A' : 'var(--c-textSecondary)',
  border: '1px solid var(--c-border)',
});
