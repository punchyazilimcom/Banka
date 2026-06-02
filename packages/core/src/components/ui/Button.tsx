import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'surface';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: Variant;
  full?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  title?: string;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--c-accent)', color: '#0A0A0A', fontWeight: 700 },
  surface: { background: 'var(--c-surface)', color: 'var(--c-text)' },
  ghost: { background: 'transparent', color: 'var(--c-textSecondary)', border: '1px solid var(--c-border)' },
};

export function Button({ children, onClick, variant = 'primary', full, disabled, type = 'button', title }: ButtonProps) {
  return (
    <motion.button
      type={type}
      title={title}
      whileTap={{ scale: 0.96 }}
      whileHover={{ filter: 'brightness(1.08)' }}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles[variant],
        width: full ? '100%' : undefined,
        padding: '12px 18px',
        borderRadius: 'var(--r-md)',
        fontSize: 14,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
        transition: 'filter .15s',
      }}
    >
      {children}
    </motion.button>
  );
}
