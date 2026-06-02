import logo from '../../assets/logo.svg';

/**
 * HER ekranın altında sabit imza: "Punch Yazılım tarafından geliştirilmiştir"
 * + küçük logo, sarı ince üst çizgi, %60 opak beyaz metin.
 */
export function Footer() {
  return (
    <footer
      className="no-select"
      style={{
        borderTop: '1px solid var(--c-accent)',
        opacity: 1,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        background: 'var(--c-bg)',
      }}
    >
      <img src={logo} alt="Punch Yazılım" height={16} style={{ opacity: 0.9 }} />
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 0.3 }}>
        Punch Yazılım tarafından geliştirilmiştir
      </span>
    </footer>
  );
}
