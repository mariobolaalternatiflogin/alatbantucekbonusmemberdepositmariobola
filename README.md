[README.md](https://github.com/user-attachments/files/32074092/README.md)
# Deposit Bonus Checker — Versi Kita

Aplikasi HTML/CSS/JS standalone untuk audit bonus deposit harian. Tidak memakai backend dan tidak mengirim data keluar browser.

## Cara pakai
1. Buka `index.html` di browser atau upload seluruh folder ke hosting statis seperti GitHub Pages.
2. Pilih Bonus 5% atau 10%.
3. Paste data QRIS Pay, Deposit Manual, dan Bonus Deposit.
4. Klik **Proses & Audit Bonus**.
5. Hasil dapat diekspor ke CSV.

## Aturan implementasi
- Hanya baris dengan `Confirmed` yang diproses.
- `SCB A BONUS DEPOSIT HARIAN` diklasifikasikan sebagai BONUS, walaupun sumbernya Agent Deposit.
- Agent Deposit tanpa marker tersebut masuk Deposit Manual.
- Semua deposit valid pada tanggal yang sama ditampilkan sebagai total riwayat; deposit terbesar dipakai sebagai basis bonus.
- Pengecualian: SB, NO BONUS, Safety, Safety Bet, NB, BATAL WD, WD DIKEMBALIKAN KE MEMBER, MEMBER LANJUT MAIN, WD DIKEMBALIKAN MEMBER LANJUT MAIN, Tidak mau bonus.
- Lebih dari satu bonus confirmed untuk member + tanggal yang sama = DOBEL BONUS.
- Data diproses lokal di browser.
