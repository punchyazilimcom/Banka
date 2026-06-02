import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { injectThemeVars } from './theme/tokens';
import { Login } from './pages/Login';
import { FirebaseLogin } from './pages/FirebaseLogin';
import { firebaseAuthRequired, onAuth } from './lib/firebase';
import { initPush } from './lib/push';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { Contacts } from './pages/Contacts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { requestNotificationPermission } from './lib/notify';

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22 },
};

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...fade} style={{ height: '100%' }}>
      {children}
    </motion.div>
  );
}

export default function App() {
  const authed = useStore((s) => s.authed);
  const init = useStore((s) => s.init);
  const theme = useStore((s) => s.settings.theme);

  // Firebase modunda buluta erişim için oturum gerekir.
  const needFirebase = firebaseAuthRequired();
  const [fbUser, setFbUser] = useState<unknown | null | undefined>(needFirebase ? undefined : null);

  useEffect(() => {
    injectThemeVars();
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!needFirebase) return;
    let unsub = () => {};
    onAuth((u) => setFbUser(u)).then((fn) => (unsub = fn));
    return () => unsub();
  }, [needFirebase]);

  useEffect(() => {
    if (authed) {
      void init();
      requestNotificationPermission();
      void initPush();
    }
  }, [authed, init]);

  // 1) Firebase oturumu yükleniyor
  if (needFirebase && fbUser === undefined) {
    return <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--c-textMuted)' }}>Yükleniyor…</div>;
  }
  // 2) Firebase girişi gerekli
  if (needFirebase && fbUser === null) return <FirebaseLogin />;
  // 3) Yerel PIN kilidi
  if (!authed) return <Login />;

  return (
    <HashRouter>
      <AppShell>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Page><Dashboard /></Page>} />
            <Route path="/transactions" element={<Page><Transactions /></Page>} />
            <Route path="/contacts" element={<Page><Contacts /></Page>} />
            <Route path="/reports" element={<Page><Reports /></Page>} />
            <Route path="/settings" element={<Page><Settings /></Page>} />
          </Routes>
        </AnimatePresence>
      </AppShell>
    </HashRouter>
  );
}
