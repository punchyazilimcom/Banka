import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomTabs } from './BottomTabs';
import { TopBar } from './TopBar';
import { Footer } from './Footer';
import { NAV_ITEMS } from './nav';
import { useIsMobile } from '../../lib/useMediaQuery';
import { NewTxToast } from '../NewTxToast';
import { PullToRefresh } from './PullToRefresh';
import { useStore } from '../../store/useStore';

/** Responsive uygulama kabuğu: masaüstü sidebar, mobil bottom-tab. */
export function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const reload = useStore((s) => s.reload);
  const title =
    NAV_ITEMS.find((n) => (n.path === '/' ? pathname === '/' : pathname.startsWith(n.path)))?.label ??
    'Garanti Transfer Takip';

  const padding = isMobile ? '16px 14px 24px' : '24px 28px';
  const inner = (
    <div style={{ padding, maxWidth: 1180, width: '100%', margin: '0 auto' }}>{children}</div>
  );

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {!isMobile && <Sidebar />}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <TopBar title={title} />
        {isMobile ? (
          <PullToRefresh onRefresh={() => reload()} style={{ flex: 1 }}>
            {inner}
          </PullToRefresh>
        ) : (
          <main style={{ flex: 1, overflowY: 'auto' }}>{inner}</main>
        )}
        {isMobile && <BottomTabs />}
        <Footer />
      </div>
      <NewTxToast />
    </div>
  );
}
