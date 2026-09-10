const fs=require('fs'), vm=require('vm');
let code=fs.readFileSync('app.js','utf8');
// Extract useful functions into a sandbox by removing DOM bootstrap tail is cumbersome; execute with minimal DOM.
const sandbox={console,Intl,document:{querySelector:()=>({value:'0.05'}),querySelectorAll:()=>[],getElementById:()=>({value:'',innerHTML:'',textContent:'',disabled:false}),},window:{},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},setTimeout};
vm.createContext(sandbox); vm.runInContext(code+';globalThis.__api=window.DepositBonusChecker;',sandbox);
const api=sandbox.__api;
function assert(c,m){if(!c)throw new Error(m)}
assert(api.amount('150.000')===150000,'150.000');
assert(api.amount('IDR 49,370,000.00')===49370000,'IDR parser');
assert(api.isExcluded(['BEB@x','Safety Bet'])===true,'Safety Bet');
assert(api.isExcluded(['BEB@x','member lanjut main'])===true,'Member lanjut main');
const rows=api.parseSource('| BEB@A | x | 150.000 | 11/09/2026 02:13:32 AM | QR Pay | Confirmed | Abd |','QRIS');
assert(rows.length===1 && rows[0].amount===150000,'QR confirmed parse');
const bad=api.parseSource('| BEB@A | x | 150.000 | 11/09/2026 02:13:32 AM | QR Pay | Pending | Abd |','QRIS');
assert(bad.length===0,'Pending rejected');
const bonus=api.parseSource('| BEB@A | SCB A BONUS DEPOSIT HARIAN | 5.000 | 11/09/2026 02:21:03 AM | Agent Deposit | Confirmed | beb@mario08 |','BONUS');
assert(bonus[0].type==='BONUS','bonus parse');
console.log('ALL TESTS PASSED');
const header='User Name\tFrom Bank\tTo Bank\tAmount\tDate\tPayment Method\tStatus\tStatus Date\tRemark\tEdited By';
const headerRows=[
 header,
 'BEB@member01\tBCA A\tBCA B\t100.000\t11/09/2026 01:00:00 AM\tMember Deposit\tConfirmed\t11/09/2026 01:01:00 AM\t\tadmin_repeated',
 'BEB@member01\tDANA A\tDANA B\t250.000\t11/09/2026 02:00:00 AM\tMember Deposit\tConfirmed\t11/09/2026 02:01:00 AM\t\tadmin_repeated',
 'BEB@member01\tBCA A\tBCA B\t999.000\t11/09/2026 03:00:00 AM\tMember Deposit\tPending\t11/09/2026 03:01:00 AM\t\tadmin_repeated'
].join('\n');
const parsedHeader=api.parseSource(headerRows,'MANUAL');
assert(parsedHeader.length===2,'Header parser should use User Name and ignore Pending');
assert(parsedHeader[0].id==='beb@member01' && parsedHeader[1].id==='beb@member01','User Name is grouping key');
assert(parsedHeader[0].agent==='admin_repeated' && parsedHeader[1].agent==='admin_repeated','Edited By captured only as agent');
const editedOnlyDifferent='BEB@realmember\tBCA\tSCB\t200.000\t11/09/2026 04:00:00 AM\tMember Deposit\tConfirmed\t11/09/2026 04:01:00 AM\t\tBEB@anotheradmin';
const ep=api.parseSource(header+'\n'+editedOnlyDifferent,'MANUAL');
assert(ep.length===1 && ep[0].displayId==='BEB@realmember','Edited By must never become member');
console.log('USER NAME / EDITED BY TESTS PASSED');
