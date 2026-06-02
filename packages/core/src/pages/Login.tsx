import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete, Fingerprint, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.svg';
import { hasPin, setPin, verifyPin } from '../lib/pin';
import { useStore } from '../store/useStore';
import { Footer } from '../components/layout/Footer';
import { tryBiometric } from '../lib/biometric';

type Phase = 'splash' | 'pin';

export function Login() {
  const [phase, setPhase] = useState<Phase>('splash');
  const setAuthed = useStore((s) => s.setAuthed);
  const isSetup = !hasPin();
  const [entry, setEntry] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setPhase('pin'), 1700);
    return () => clearTimeout(t);
  }, []);

  const submit = async (pin: string) => {
    if (isSetup) {
      if (confirm === null) {
        setConfirm(pin);
        setEntry('');
        return;
      }
      if (confirm !== pin) {
        setError('PIN eşleşmedi, tekrar deneyin');
        setConfirm(null);
        setEntry('');
        return;
      }
      await setPin(pin);
      setAuthed(true);
      return;
    }
    if (await verifyPin(pin)) {
      setAuthed(true);
    } else {
      setError('Hatalı PIN');
      setEntry('');
    }
  };

  const press = (d: string) => {
    setError('');
    const next = (entry + d).slice(0, 6);
    setEntry(next);
    if (next.length === 6) setTimeout(() => submit(next), 120);
  };

  const biometric = async () => {
    if (await tryBiometric()) setAuthed(true);
  };

  const prompt = isSetup
    ? confirm === null
      ? 'Yeni PIN belirleyin'
      : 'PIN’i doğrulayın'
    : 'PIN ile giriş yapın';

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(120% 80% at 50% -10%, #1a1700 0%, var(--c-bg) 55%)',
      }}
    >
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 20 }}>
        <AnimatePresence mode="wait">
          {phase === 'splash' ? (
            <motion.div
              key="splash"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <img src={logo} alt="Punch Yazılım" height={64} className="glow-pulse" />
            </motion.div>
          ) : (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ width: 320, maxWidth: '92vw', textAlign: 'center' }}
            >
              <img src={logo} alt="Punch Yazılım" height={40} style={{ marginBottom: 26 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={16} color="var(--c-accent)" />
                <h3 style={{ fontSize: 16 }}>{prompt}</h3>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '24px 0 8px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{ scale: i < entry.length ? 1.15 : 1 }}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: i < entry.length ? 'var(--c-accent)' : 'var(--c-surface)',
                      border: '1px solid var(--c-border)',
                    }}
                  />
                ))}
              </div>

              <div style={{ height: 20, color: 'var(--c-out)', fontSize: 13 }}>{error}</div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  marginTop: 14,
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <Key key={d} onClick={() => press(d)}>
                    {d}
                  </Key>
                ))}
                <Key onClick={biometric} ghost>
                  <Fingerprint size={22} />
                </Key>
                <Key onClick={() => press('0')}>0</Key>
                <Key onClick={() => setEntry((e) => e.slice(0, -1))} ghost>
                  <Delete size={20} />
                </Key>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
}

function Key({ children, onClick, ghost }: { children: React.ReactNode; onClick: () => void; ghost?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      style={{
        height: 60,
        borderRadius: 'var(--r-md)',
        background: ghost ? 'transparent' : 'var(--c-card)',
        border: '1px solid var(--c-border)',
        fontSize: 22,
        fontWeight: 600,
        display: 'grid',
        placeItems: 'center',
        color: ghost ? 'var(--c-textSecondary)' : 'var(--c-text)',
      }}
    >
      {children}
    </motion.button>
  );
}
