/**
 * Biyometrik giriş. Mobilde (Capacitor) bir biyometri eklentisiyle değiştirilir;
 * web/masaüstünde WebAuthn varsa kullanılır, yoksa sessizce false döner.
 */
export async function tryBiometric(): Promise<boolean> {
  try {
    // Capacitor native köprüsü mevcutsa onu kullan (apps/mobile tarafından enjekte edilir)
    const cap = (window as any).Capacitor;
    if (cap?.Plugins?.BiometricAuth?.authenticate) {
      const res = await cap.Plugins.BiometricAuth.authenticate({
        reason: 'Garanti Transfer Takip girişi',
      });
      return !!res?.verified;
    }
    // Web fallback: WebAuthn varlık kontrolü (demo amaçlı kabul)
    if (window.PublicKeyCredential) {
      return await (PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
    }
  } catch {
    /* yoksay */
  }
  return false;
}
