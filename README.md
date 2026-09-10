[README.md](https://github.com/user-attachments/files/32076076/README.md)
# Deposit Bonus Checker V3

Tool lokal untuk audit bonus deposit harian. Versi final dengan batas bonus maksimal Rp 100.000 per member per hari.

## Aturan utama
- Identitas member **hanya** dari kolom `User Name` dengan prefix tepat `BEB@` (huruf besar).
- `beb@...` adalah admin dan tidak pernah diproses sebagai member.
- `Edited By` hanya dicatat sebagai admin yang melakukan proses; tidak pernah menjadi ID/member dan tidak dipakai untuk grouping.
- Hanya `Status = Confirmed` yang diproses.
- Data QR Pay adalah deposit QRIS.
- Pada sumber gabungan Deposit Manual + Bonus Deposit: jika ada `SCB A BONUS DEPOSIT HARIAN`, transaksi diklasifikasikan sebagai BONUS DEPOSIT; selain itu Member Deposit/Agent Deposit adalah DEPOSIT MANUAL.
- Untuk satu member dan satu hari, semua deposit valid dijabarkan satu per satu sebagai riwayat. Total hari ditampilkan sebagai informasi.
- Deposit **terbesar** pada hari tersebut menjadi dasar bonus; bukan total deposit.
- Bonus = persentase terpilih (5% atau 10%) dari deposit terbesar, dengan maksimum **Rp 100.000 per member per hari**.
- Pengecualian bonus: SB, NO BONUS, Safety, Safety Bet, NB, BATAL WD, WD DIKEMBALIKAN KE MEMBER, MEMBER LANJUT MAIN, WD DIKEMBALIKAN MEMBER LANJUT MAIN, Tidak mau bonus.
- Beberapa bonus confirmed pada hari yang sama menghasilkan `DOBEL BONUS`.
- Admin pada output diambil dari `Edited By` transaksi deposit yang menjadi basis.

## Penggunaan
Buka `index.html` di browser, pilih 5%/10%, paste QRIS dan sumber gabungan transaksi, lalu klik `Proses & Audit Bonus`.

- Bonus **tidak pernah melebihi Rp 100.000** per member per hari. Contoh: deposit terbesar Rp 5.000.000 pada rate 5% menghasilkan hak bonus Rp 100.000, bukan Rp 250.000.
- Riwayat deposit menampilkan **setiap deposit valid satu per satu**; total hari hanya informasi tambahan. Hanya deposit terbesar yang menjadi basis perhitungan bonus.
- Sumber Deposit Manual dan Bonus Deposit sengaja digabung dalam satu input; filter `SCB A BONUS DEPOSIT HARIAN` menentukan klasifikasinya.
- Duplikasi baris yang sama persis (hasil paste ganda) diabaikan agar tidak menggandakan deposit/bonus.
