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
