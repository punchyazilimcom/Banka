import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import logo from '../assets/logo.svg';
import { signInEmail } from '../lib/firebase';
import { Footer } from '../components/layout/Footer';
import { Button } from '../components/ui/Button';

/**
 * Firebase modunda buluttan veri okumadan önce hesap girişi.
 * Oturum Firebase tarafından kalıcı tutulur → yalnızca ilk açılışta sorulur.
 */
export function FirebaseLogin() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      await signInEmail(email.trim(), pass);
      // onAuthStateChanged App'te yakalar, ekran geçer
    } catch (e: any) {
      setError(
        /invalid|wrong|not-found|credential/i.test(String(e?.code ?? e))
          ? 'E-posta veya şifre hatalı'
          : 'Giriş başarısız: ' + (e?.code ?? e),
      );
      setBusy(false);
    }
  };

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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: 340, maxWidth: '92vw', textAlign: 'center' }}
        >
          <img src={logo} alt="Punch Yazılım" height={44} className="glow-pulse" style={{ marginBottom: 24 }} />
          <h3 style={{ fontSize: 17, marginBottom: 6 }}>Hesap Girişi</h3>
          <p style={{ fontSize: 13, color: 'var(--c-textMuted)', marginBottom: 22 }}>
            Bulut verinize erişmek için giriş yapın
          </p>

          <div style={{ display: 'grid', gap: 12, textAlign: 'left' }}>
            <InputRow icon={<Mail size={17} />}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-posta"
                autoCapitalize="none"
                style={inputStyle}
              />
            </InputRow>
            <InputRow icon={<Lock size={17} />}>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Şifre"
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                style={inputStyle}
              />
            </InputRow>
          </div>

          <div style={{ height: 22, color: 'var(--c-out)', fontSize: 13, marginTop: 6 }}>{error}</div>

          <Button full onClick={submit} disabled={busy || !email || !pass}>
            <LogIn size={16} /> {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>

          <p style={{ fontSize: 11, color: 'var(--c-textMuted)', marginTop: 16, lineHeight: 1.5 }}>
            Hesap, Firebase konsolundan oluşturulur (E-posta/Şifre sağlayıcısı).
            Oturum cihazda güvenli saklanır.
          </p>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: 'none',
  border: 'none',
  outline: 'none',
  padding: '13px 0',
  fontSize: 15,
};

function InputRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--c-card)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--r-md)',
        padding: '0 14px',
        color: 'var(--c-textMuted)',
      }}
    >
      {icon}
      {children}
    </div>
  );
}
