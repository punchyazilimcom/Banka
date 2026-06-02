import { motion } from 'framer-motion';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import logo from '../../assets/logo.svg';
import { useStore } from '../../store/useStore';

interface Props {
  title: string;
}

export function TopBar({ title }: Props) {
  const reload = useStore((s) => s.reload);
  const usingMock = useStore((s) => s.usingMock);

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        borderBottom: '1px solid var(--c-border)',
        background: 'var(--c-bg)',
        position: 'sticky',
        top: 0,
        zIndex: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={logo} alt="Punch Yazılım" height={26} />
        <div
          style={{ width: 1, height: 22, background: 'var(--c-border)' }}
          aria-hidden
        />
        <h2 style={{ fontSize: 17 }}>{title}</h2>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span
          title={usingMock ? 'Örnek veri (backend kapalı)' : 'Bağlı'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: usingMock ? 'var(--c-out)' : 'var(--c-in)',
          }}
        >
          {usingMock ? <WifiOff size={15} /> : <Wifi size={15} />}
          {usingMock ? 'Demo' : 'Canlı'}
        </span>
        <motion.button
          whileTap={{ rotate: 180 }}
          onClick={() => reload()}
          title="Yenile"
          style={{ color: 'var(--c-textSecondary)', display: 'grid', placeItems: 'center' }}
        >
          <RefreshCw size={18} />
        </motion.button>
      </div>
    </header>
  );
}
