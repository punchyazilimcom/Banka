import { motion } from 'framer-motion';
import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  glass?: boolean;
  glow?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  delay?: number;
}

/** Premium glassmorphism kart, giriş animasyonlu. */
export function Card({ children, glass, glow, onClick, style, className = '', delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={onClick ? { y: -3 } : undefined}
      onClick={onClick}
      className={`${glass ? 'glass' : ''} ${className}`}
      style={{
        background: glass ? undefined : 'var(--c-card)',
        border: '1px solid var(--c-border)',
        borderRadius: 'var(--r-lg)',
        padding: 'var(--s-lg)',
        boxShadow: glow ? 'var(--shadow-glow)' : 'var(--shadow-card)',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}
