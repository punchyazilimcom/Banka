import { describe, it, expect } from 'vitest';
import { parseGarantiMail, htmlToText } from '../src/parser.js';
import { classifyCounterparty, normalizeName } from '@gtt/shared';

// ── Gerçek Garanti BBVA bildirim mailleri (kullanıcı örnekleri) ─────────

const GERCEK_GIDEN = `Gerçekleşen İşlem
Para Transferi Bilgilendirmesi

Havale
Değerli Müşterimiz,
Para transferi işleminiz gerçekleşmiştir.

Gönderen Bilgileri:
HALİL KAPLAN
ETLİK - 774
6292400


Alıcı  Bilgileri:
İREM KAPLAN
DEMETEVLER - 530
TR720006200053000006620808

6620808


Tutar: 3.000,00 TL
İşlem Tarihi: 03.06.2026 12:59
Açıklama: iremmm`;

const GERCEK_GELEN = `Gerçekleşen İşlem
Gelen Para Transferi

Değerli Müşterimiz,

Aşağıda detayları bulunan hesabınıza para transferi gerçekleşti.

Hesap No: 774-****400

Gönderici Ad Soyad: Getir Perakende Lojistik A.ş.

Tutar: 1.589,37 TL

Açıklama: Toplu Havale-eft - Otomatik`;

describe('GERÇEK format — giden (Alıcı Bilgileri sonraki satır)', () => {
  const tx = parseGarantiMail({ mailId: 'g1', text: GERCEK_GIDEN })!;
  it('ayrıştırılır', () => expect(tx).not.toBeNull());
  it('yön: giden', () => expect(tx.direction).toBe('out'));
  it('tutar: 3000', () => expect(tx.amount).toBe(3000));
  it('alıcı: İREM KAPLAN', () => expect(tx.counterpartyName).toBe('İREM KAPLAN'));
  it('tip: kişi', () => expect(tx.counterpartyType).toBe('person'));
  it('kanal: Havale', () => expect(tx.channel).toBe('Havale'));
  it('tarih: 2026-06-03', () => expect(tx.datetime.startsWith('2026-06-03')).toBe(true));
  it('açıklama: iremmm', () => expect(tx.description).toContain('iremmm'));
});

describe('GERÇEK format — gelen (Gönderici Ad Soyad aynı satır)', () => {
  const tx = parseGarantiMail({ mailId: 'g2', text: GERCEK_GELEN })!;
  it('ayrıştırılır', () => expect(tx).not.toBeNull());
  it('yön: gelen', () => expect(tx.direction).toBe('in'));
  it('tutar: 1589.37', () => expect(tx.amount).toBe(1589.37));
  it('gönderici: Getir', () => expect(tx.counterpartyName).toContain('Getir'));
  it('tip: firma (A.ş.)', () => expect(tx.counterpartyType).toBe('firm'));
});

// ── Örnek Garanti BBVA bildirim mailleri ───────────────────────────────

const GELEN_FAST_KISI = `Sayın müşterimiz,
TR33 0006 2000 1234 0006 6789 01 numaralı hesabınıza FAST ile 1.500,00 TL tutarında para gelmiştir.
Gönderen: AHMET YILMAZ
Açıklama: Kira ödemesi
Tarih: 15.03.2024 14:32
Kullanılabilir Bakiye: 12.345,67 TL`;

const GIDEN_EFT_FIRMA = `Sayın müşterimiz,
TR33 0006 2000 1234 0006 6789 01 numaralı hesabınızdan EFT ile 25.750,00 TL tutarında transfer gönderildi.
Alıcı: ABC İNŞAAT SAN. VE TİC. LTD. ŞTİ.
Açıklama: Fatura no 2024-0042
Tarih: 16.03.2024 09:05
Kullanılabilir Bakiye: 8.900,00 TL`;

const GELEN_HAVALE_VKN = `Sayın müşterimiz, hesabınıza Havale ile 500,00 TL gelmiştir.
Gönderen: 1234567890
Tarih: 17.03.2024 11:00`;

const GIDEN_FAST_HTML = `<html><body>
<p>Değerli müşterimiz,</p>
<table><tr><td>Hesabınızdan</td><td>FAST</td><td>ile</td><td>3.250,50 TL</td></tr></table>
<p>Alıcı: MEHMET DEMİR</p>
<p>Açıklama: Borç ödeme</p>
<p>Tarih: 18.03.2024 16:45</p>
<p>Kullanılabilir Bakiye: 1.000,00 TL</p>
</body></html>`;

const SPAM_MAIL = `Kampanya! Garanti BBVA kredi kartınıza özel faiz oranları. Detaylar için tıklayın.`;

// ── Testler ─────────────────────────────────────────────────────────────

describe('parseGarantiMail - gelen FAST (kişi)', () => {
  const tx = parseGarantiMail({ mailId: 'm1', text: GELEN_FAST_KISI })!;

  it('işlemi ayrıştırır', () => expect(tx).not.toBeNull());
  it('yön: gelen', () => expect(tx.direction).toBe('in'));
  it('tutar: 1500', () => expect(tx.amount).toBe(1500));
  it('para birimi: TRY', () => expect(tx.currency).toBe('TRY'));
  it('kanal: FAST', () => expect(tx.channel).toBe('FAST'));
  it('karşı taraf: AHMET YILMAZ', () =>
    expect(tx.counterpartyName).toContain('AHMET YILMAZ'));
  it('tip: kişi', () => expect(tx.counterpartyType).toBe('person'));
  it('IBAN çıkarılır', () =>
    expect(tx.iban).toBe('TR330006200012340006678901'));
  it('açıklama: Kira ödemesi', () =>
    expect(tx.description).toContain('Kira'));
  it('bakiye: 12345.67', () => expect(tx.balanceAfter).toBe(12345.67));
  it('tarih ISO', () => expect(tx.datetime.startsWith('2024-03-15')).toBe(true));
});

describe('parseGarantiMail - giden EFT (firma)', () => {
  const tx = parseGarantiMail({ mailId: 'm2', text: GIDEN_EFT_FIRMA })!;

  it('yön: giden', () => expect(tx.direction).toBe('out'));
  it('tutar: 25750', () => expect(tx.amount).toBe(25750));
  it('kanal: EFT', () => expect(tx.channel).toBe('EFT'));
  it('tip: firma (LTD ŞTİ)', () => expect(tx.counterpartyType).toBe('firm'));
  it('karşı taraf adı firma içerir', () =>
    expect(tx.counterpartyName).toContain('ABC'));
  it('bakiye: 8900', () => expect(tx.balanceAfter).toBe(8900));
});

describe('parseGarantiMail - gelen Havale (VKN ile firma)', () => {
  const tx = parseGarantiMail({ mailId: 'm3', text: GELEN_HAVALE_VKN })!;

  it('yön: gelen', () => expect(tx.direction).toBe('in'));
  it('tutar: 500', () => expect(tx.amount).toBe(500));
  it('kanal: Havale', () => expect(tx.channel).toBe('Havale'));
  it('10 haneli VKN → firma', () => expect(tx.counterpartyType).toBe('firm'));
});

describe('parseGarantiMail - HTML gövde (giden FAST)', () => {
  const text = htmlToText(GIDEN_FAST_HTML);
  const tx = parseGarantiMail({ mailId: 'm4', text })!;

  it('HTML temizlenir ve ayrıştırılır', () => expect(tx).not.toBeNull());
  it('yön: giden', () => expect(tx.direction).toBe('out'));
  it('tutar: 3250.5', () => expect(tx.amount).toBe(3250.5));
  it('karşı taraf: MEHMET DEMİR', () =>
    expect(tx.counterpartyName).toContain('MEHMET'));
  it('tip: kişi', () => expect(tx.counterpartyType).toBe('person'));
});

describe('parseGarantiMail - transfer olmayan mail', () => {
  it('null döner (kampanya maili)', () =>
    expect(parseGarantiMail({ mailId: 'm5', text: SPAM_MAIL })).toBeNull());
});

describe('idempotency', () => {
  it('aynı mail aynı id üretir', () => {
    const a = parseGarantiMail({ mailId: 'dup', text: GELEN_FAST_KISI })!;
    const b = parseGarantiMail({ mailId: 'dup', text: GELEN_FAST_KISI })!;
    expect(a.id).toBe(b.id);
  });
  it('farklı mailId farklı id üretir', () => {
    const a = parseGarantiMail({ mailId: 'x1', text: GELEN_FAST_KISI })!;
    const b = parseGarantiMail({ mailId: 'x2', text: GELEN_FAST_KISI })!;
    expect(a.id).not.toBe(b.id);
  });
});

describe('sınıflandırma override (kullanıcı düzeltmesi)', () => {
  it('override kişiyi firmaya çevirir', () => {
    const key = normalizeName('AHMET YILMAZ');
    const overrides = {
      [key]: { nameKey: key, type: 'firm' as const, updatedAt: 'now' },
    };
    expect(classifyCounterparty('Ahmet Yılmaz', overrides)).toBe('firm');
  });
  it('override olmadan kişi kalır', () =>
    expect(classifyCounterparty('Ahmet Yılmaz')).toBe('person'));
  it('firma ekleri tanınır', () => {
    expect(classifyCounterparty('XYZ GIDA SAN TİC')).toBe('firm');
    expect(classifyCounterparty('Ayşe Kaya')).toBe('person');
  });
});
