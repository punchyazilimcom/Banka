import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../assets/logo.svg';
import { NAV_ITEMS } from './nav';

/** Masaüstü sol navigasyon. */
export function Sidebar() {
  return (
    <aside
      style={{
        width: 244,
        flexShrink: 0,
        background: 'var(--c-card)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 14px',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 10px 22px' }}>
        <img src={logo} alt="Punch Yazılım" height={30} />
      </div>
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.path} to={item.path} end={item.path === '/'}>
          {({ isActive }) => (
            <motion.div
              whileHover={{ x: 3 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 'var(--r-md)',
                color: isActive ? '#0A0A0A' : 'var(--c-textSecondary)',
                background: isActive ? 'var(--c-accent)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: 14,
              }}
            >
              <item.icon size={19} />
              {item.label}
            </motion.div>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
