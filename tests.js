(function(){
const A=window.DepositBonusChecker; const assert=(c,m)=>{if(!c)throw new Error(m)};
const header=`| User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Status Date | Remark | Edited By |\n`;
const input=header+`| BEB@TEST | BCA A | BCA B | 5.000.000 | 11/09/2026 | Member Deposit | Confirmed | 11/09/2026 01:00:00 AM | | beb@Admin1 |\n| BEB@TEST | BCA A | BCA B | 50.000 | 11/09/2026 | Member Deposit | Confirmed | 11/09/2026 01:05:00 AM | | beb@Admin2 |\n| beb@Admin1 | BCA A | BCA B | 99.000.000 | 11/09/2026 | Member Deposit | Confirmed | 11/09/2026 01:10:00 AM | | beb@Admin3 |\n| BEB@TEST | SCB | SCB A BONUS DEPOSIT HARIAN 01 | 100.000 | 11/09/2026 | Agent Deposit | Confirmed | 11/09/2026 01:06:00 AM | | beb@Admin4 |`;
let p=A.parseSource(input);assert(p.length===3,'Header parser count salah');assert(p.filter(x=>x.id==='BEB@TEST').length===3,'Semua transaksi BEB@ harus diproses');assert(p.some(x=>x.type==='BONUS'),'Marker bonus gagal');assert(p.filter(x=>x.type==='MANUAL').length===2,'Manual count gagal');assert(A.amount('5.000.000')===5000000,'Format nominal titik gagal');assert(A.amount('2,000.000')===2000000,'Format nominal campuran gagal');assert(A.amount('IDR 49,370,000.00')===49370000,'Format IDR desimal gagal');
const headerless=`| 1 | BEB@RAW | DANA<br>Nama | SCB<br>SCB A BONUS DEPOSIT HARIAN 01 | **9.000** | 11/09/2026 12:05:48 AM | Agent Deposit | Confirmed | 11/09/2026 12:06:56 AM | | beb@Admin |\n| 2 | BEB@RAW | BCA<br>Nama | BCA YANA | **250.000** | 11/09/2026 12:07:28 AM | Member Deposit | Confirmed | 11/09/2026 12:09:03 AM | | beb@Admin |`;
p=A.parseSource(headerless);assert(p.length===2,'Headerless Markdown gagal dibaca');assert(p[0].type==='BONUS','Headerless bonus gagal');assert(p[1].amount===250000,'Headerless amount gagal');
const reg=`| User Name | Date | Edited By |\n| BEB@RAW | 10/09/2026 11:00:00 PM | beb@Admin |\n| BEB@OTHER | 10/09/2026 11:00:00 PM | beb@Admin |`;
const audited=A.audit('',headerless,reg);assert(audited.rows.length===1,'Audit grouping salah');assert(audited.rows[0].sameDayNewMember===false,'Tanggal daftar beda harus false');
const reg2=`| User Name | Date | Edited By |\n| BEB@RAW | 11/09/2026 11:00:00 AM | beb@Admin |`;
const audited2=A.audit('',headerless,reg2);assert(audited2.rows[0].sameDayNewMember===true,'New member same-day gagal');assert(audited2.rows[0].firstDeposit===250000,'Deposit pertama harus transaksi deposit paling awal');
const ordering=`| 1 | BEB@TIME | X | X | 100.000 | 11/09/2026 01:00:00 AM | Member Deposit | Confirmed | 11/09/2026 01:00:01 AM | | a |\n| 2 | BEB@TIME | X | X | 50.000 | 11/09/2026 12:30:00 AM | Member Deposit | Confirmed | 11/09/2026 12:30:01 AM | | a |`;
const o=A.audit('',ordering,reg2).rows[0];assert(o.firstDeposit===50000,'Urutan AM 12:30 harus lebih awal dari AM 01:00');
console.log('ALL PARSER/NEW-MEMBER TESTS PASSED');
})();
