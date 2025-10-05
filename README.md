# finance-fire-calculator
finance fire-calculator personal-finance retirement javascript html css chartjs irr swr asset-allocation drawdown
# Erken Emeklilik Hesaplayıcı (FIRE) — Çok Varlıklı + Esnek Katkı + Çekim Testi

**Ne yapar?**
- Emeklilikte **aylık harcama** ve **SWR** ile **gereken portföyü** hesaplar (bugünün parası → nominal).
- **Sigorta/güvenlik fonu** için ayrı hedef/getiri; hedefe ulaşınca katkıyı emekliliğe **aktarabilir**.
- Emeklilik portföyü içinde **Gayrimenkul / Hisse / Kripto / Emtia / Eurobond**:
  - **Yüzde** veya **Miktar** modunda başlangıç + aylık katkı.
  - Her varlık için **ayrı yıllık getiri**.
- **Esnek katkı takvimi**: “0–4 yıl X €, 5–9 yıl Y € …”.
- **Post-FI çalışma**: FI sonrası N yıl ayda M € katkı ile büyüt.
- **Çekim & Güvenlik Testi**:
  - Girilen aylık çekim (bugünün parası) seçili ufukta sürdürülebilir mi?
  - **Maks. sürdürülebilir aylık çekim** (bugünün parasıyla) — otomatik hesap.
  - “Stres testi” için beklenen getiriden puan düşüp tekrar test.
- **Grafik**, **CSV indir**, **paylaşılabilir link**, **IRR (XIRR)**.

## Nasıl kurarım? (kısaca)
1. GitHub’da yeni repo → 4 dosyayı oluştur:
   - `index.html`
   - `assets/style.css`
   - `assets/script.js`
   - `README.md`
2. **Settings → Pages → Build and deployment**
   - **Source**: “Deploy from a branch”
   - **Branch**: `main` ve **/ (root)**
3. Sayfa 1 dakika içinde yayında. URL’yi repo açıklamasına ekleyebilirsin.

## Esnek Katkı Örneği
- Emeklilik: `0–4 yıl: 1000 €`, `5–9 yıl: 1500 €`, `10–11 yıl: 800 €`, `12–14 yıl: 2000 €`
- Sigorta: `0–2 yıl: 300 €`, `3–4 yıl: 0 €`
> Takvim varsa o yıllarda “varsayılan” katkılar **yerine geçer**.

## Notlar
- Gereken portföy (reel): `(Harcama − Pasif) × 12 / SWR`
- Enflasyon aylığa indirgenir; projeksiyonlar **nominal**dir.
- Varlık katkıları dağılıma göre eklenir (**otomatik rebalance yok**).
- FI sonrası (varsa) çekim yapılmaz; sadece girilen katkı eklenir. Sonrasında çekim testi başlar.
- IRR para ağırlıklı getiri; TWR için ayrı bir revizyon istersen eklenebilir.

## Lisans
MIT
