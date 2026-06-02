import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './nav';

/** Mobil alt sekme çubuğu. */
export function BottomTabs() {
  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'stretch',
        background: 'var(--c-card)',
        borderTop: '1px solid var(--c-border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          style={{ flex: 1 }}
        >
          {({ isActive }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '9px 2px',
                color: isActive ? 'var(--c-accent)' : 'var(--c-textMuted)',
                fontSize: 10,
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <item.icon size={21} />
              <span style={{ lineHeight: 1.1, textAlign: 'center' }}>
                {item.label.split(' ')[0]}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
