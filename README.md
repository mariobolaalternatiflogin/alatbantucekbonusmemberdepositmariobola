[Uploading README.md…]()
# Deposit Bonus Checker — Final

Tool lokal untuk mengaudit bonus deposit harian dari data copy-paste mentah.

## Input

1. **Data QRIS Pay** — paste export QR Pay.
2. **Data Deposit Manual + Bonus Deposit** — paste satu sumber gabungan Member Deposit / Agent Deposit / bonus.
3. **Data Daftar New Member Harian** — paste daftar member baru pada hari tersebut.

## Parser copy-paste

Parser sengaja dibuat toleran terhadap data seperti export Anda:

- tabel Markdown dengan `|`;
- header ada atau tidak ada;
- `<br>` di dalam sel;
- Markdown `**nominal**`;
- escape seperti `BEB\@username`;
- nominal Indonesia seperti `250.000`, `1,140.000`, `2,000.000`, serta format IDR desimal;
- posisi kolom transaksi 11 kolom seperti data export Anda meskipun header tidak ikut tercopy.

## Aturan audit

- Hanya baris **Confirmed** yang diproses.
- Member hanya jika `User Name` diawali tepat `BEB@` huruf besar. `beb@` tidak dianggap member.
- `SCB A BONUS DEPOSIT HARIAN` selalu diklasifikasikan sebagai **BONUS**.
- QR Pay diklasifikasikan sebagai **QRIS**.
- Member Deposit / Agent Deposit yang bukan bonus diklasifikasikan sebagai **MANUAL**.
- Semua deposit valid pada tanggal yang sama ditampilkan satu per satu.
- Deposit terbesar pada tanggal tersebut menjadi **basis bonus**.
- Bonus maksimal adalah **Rp100.000 per member per hari**.
- Bonus confirmed lebih dari satu pada hari yang sama diberi status **DOBEL BONUS**.
- Duplikat hanya dihapus bila identitas transaksi lengkap sama; transaksi berbeda tetap dipertahankan.

## New Member

Data daftar new member digunakan sebagai sumber pembanding, bukan sebagai transaksi.

Tool mengambil:

- ID `BEB@`;
- tanggal daftar;
- waktu daftar bila tersedia;
- agent/operator bila tersedia.

Kemudian tool mencari transaksi QRIS + manual confirmed paling awal untuk member tersebut. Jika **tanggal daftar = tanggal deposit pertama**, kolom **New Member Hari Daftar** menjadi `YA`.

Jadi audit dapat menjawab:

> Member mana yang baru daftar hari ini dan langsung melakukan deposit pertama pada hari yang sama?

## Export

Tombol Export CSV menyimpan hasil audit termasuk riwayat deposit, basis bonus, bonus diberikan, tanggal daftar, waktu deposit pertama, dan indikator New Member.

## Jalankan

Buka `index.html` langsung di browser. Tidak membutuhkan server atau database.
