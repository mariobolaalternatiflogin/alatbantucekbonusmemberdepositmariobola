(function(){'use strict';
const EXCLUSION_PHRASES=['SB','NO BONUS','SAFETY BET','SAFETY','NB','BATAL WD','WD DIKEMBALIKAN KE MEMBER','MEMBER LANJUT MAIN','WD DIKEMBALIKAN MEMBER LANJUT MAIN','TIDAK MAU BONUS'];
const BONUS_MARK='SCB A BONUS DEPOSIT HARIAN';
const MEMBER_PREFIX='BEB@';
const MAX_BONUS=100000;
const $=id=>document.getElementById(id);

function clean(s){return String(s??'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\\([@*])/g,'$1').replace(/\u00a0/g,' ').replace(/\*\*/g,'').replace(/__/g,'').replace(/`/g,'').trim()}
function normalize(s){return clean(s).replace(/\s+/g,' ').trim()}
function splitRows(text){
  text=String(text??'').replace(/\r/g,'');
  if(!text.trim())return[];
  return text.split('\n').filter(x=>x.trim()).filter(line=>{
    const t=line.trim().replace(/^\|/,'').replace(/\|$/,'').trim();
    return !/^[-:|\s]+$/.test(t) || !t.replace(/[|:\s-]/g,'');
  }).map(line=>{
    let x=line.trim();
    if(x.startsWith('|'))x=x.slice(1); if(x.endsWith('|'))x=x.slice(0,-1);
    if(x.includes('\t'))return x.split('\t').map(clean);
    if(x.includes('|'))return x.split('|').map(clean);
    return [clean(x)];
  }).filter(r=>r.some(Boolean));
}
function isHeader(row){
  const j=normalize(row.join(' ')).toUpperCase();
  return /USER\s*NAME/.test(j)&&(/STATUS/.test(j)||/DATE/.test(j));
}
function headerIndexes(row){
  const map={};
  row.forEach((v,i)=>{
    const k=normalize(v).toUpperCase();
    if(/^(USER\s*NAME|USERNAME|MEMBER|MEMBER\s*ID)$/.test(k))map.user=i;
    if(/^FROM\s*BANK$/.test(k)||/^SOURCE$/.test(k))map.from=i;
    if(/^TO\s*BANK$/.test(k)||/^DESTINATION$/.test(k))map.to=i;
    if(/^(AMOUNT|NOMINAL|DEPOSIT)$/.test(k))map.amount=i;
    if(/^(DATE|TRANSACTION\s*DATE|TANGGAL)$/.test(k))map.date=i;
    if(/PAYMENT\s*METHOD|METODE\s*PEMBAYARAN/.test(k))map.method=i;
    if(/^STATUS$/.test(k))map.status=i;
    if(/STATUS\s*DATE|CONFIRMED\s*DATE/.test(k))map.statusDate=i;
    if(/^REMARK|KETERANGAN$/.test(k))map.remark=i;
    if(/EDITED\s*BY|ADMIN|OPERATOR/.test(k))map.editedBy=i;
  });
  return map;
}
function inferDepositIndexes(row){
  if(row.length>=10){
    return {user:1,from:2,to:3,amount:4,date:5,method:6,status:7,statusDate:8,remark:9,editedBy:10};
  }
  return null;
}
function amount(s){
  let v=normalize(s).replace(/^Rp\.?\s*/i,'').replace(/^IDR\s*/i,'').replace(/[^\d.,-]/g,'');
  if(!v)return 0;
  const dots=(v.match(/\./g)||[]).length, commas=(v.match(/,/g)||[]).length;
  if(dots&&commas){
    const lastSep=Math.max(v.lastIndexOf('.'),v.lastIndexOf(','));
    const tail=v.slice(lastSep+1);
    if(tail.length===3){v=v.replace(/[.,]/g,'');}
    else if(v.lastIndexOf('.')>v.lastIndexOf(','))v=v.replace(/,/g,'');
    else v=v.replace(/\./g,'').replace(',','.');
  }else if(dots){
    const parts=v.split('.'); v=parts[parts.length-1].length===3?v.replace(/\./g,''):v;
  }else if(commas){
    const parts=v.split(','); v=parts[parts.length-1].length===3?v.replace(/,/g,''):v.replace(',','.');
  }
  const n=Number(v); return Number.isFinite(n)?n:0;
}
function rowAmount(row,idx){
  if(Number.isInteger(idx)&&row[idx]){const n=amount(row[idx]);if(n>0)return n;}
  return 0;
}
function memberFrom(row,idx){
  if(Number.isInteger(idx)&&row[idx]){
    const id=normalize(row[idx]);
    return id.startsWith(MEMBER_PREFIX)?id:'';
  }
  return '';
}
function dateOnly(v){const m=normalize(v).match(/(\d{1,2}\/\d{1,2}\/\d{4})/);return m?m[1]:''}
function dateTime(row,dateIdx,statusDateIdx){
  if(Number.isInteger(statusDateIdx)&&row[statusDateIdx]){const v=normalize(row[statusDateIdx]);if(dateOnly(v))return v;}
  if(Number.isInteger(dateIdx)&&row[dateIdx]){const v=normalize(row[dateIdx]);if(dateOnly(v))return v;}
  const joined=normalize(row.join(' '));
  const m=joined.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)/i);
  return m?m[1]:'';
}
function status(row,idx){
  if(Number.isInteger(idx)&&row[idx])return /\bconfirmed\b/i.test(row[idx])?'CONFIRMED':'';
  return /\bconfirmed\b/i.test(normalize(row.join(' ')))?'CONFIRMED':'';
}
function hasBonusMark(row,idxs){
  const parts=idxs?[row[idxs.to]||'',row[idxs.remark]||'',row[idxs.method]||'']:row;
  return normalize(parts.join(' ')).toUpperCase().includes(BONUS_MARK);
}
function type(row,idxs){
  const j=normalize(row.join(' '));
  if(hasBonusMark(row,idxs))return'BONUS';
  const m=idxs&&Number.isInteger(idxs.method)?normalize(row[idxs.method]||''):j;
  if(/QR\s*Pay|QRPay/i.test(m))return'QRIS';
  if(/Member\s*Deposit|Agent\s*Deposit/i.test(m))return'MANUAL';
  if(/QR\s*Pay|QRPay/i.test(j))return'QRIS';
  if(/Member\s*Deposit|Agent\s*Deposit/i.test(j))return'MANUAL';
  return'';
}
function noteText(row,idxs){
  if(!idxs)return normalize(row.join(' ')).toUpperCase();
  return normalize([row[idxs.remark]||'',row[idxs.to]||'',row[idxs.method]||''].join(' ')).toUpperCase();
}
function isExcluded(row,idxs){
  const j=noteText(row,idxs);
  return EXCLUSION_PHRASES.some(p=>new RegExp('(^|\\s|[^A-Z])'+p.replace(/\s+/g,'\\s+')+'($|\\s|[^A-Z])','i').test(j));
}
function agent(row,idxs){return idxs&&Number.isInteger(idxs.editedBy)?normalize(row[idxs.editedBy]||''):''}

function parseSource(text){
  const rows=splitRows(text),out=[];let idxs=null;
  for(const r of rows){
    if(isHeader(r)){idxs=headerIndexes(r);continue;}
    const use=idxs||inferDepositIndexes(r); if(!use)continue;
    const st=status(r,use.status); if(!st)continue;
    const id=memberFrom(r,use.user); if(!id)continue;
    const typ=type(r,use); if(!typ)continue;
    const dt=dateTime(r,use.date,use.statusDate),amt=rowAmount(r,use.amount); if(!dt||!amt)continue;
    out.push({id,displayId:id,amount:amt,dt,transactionDate:dateOnly(rowValue(r,use.date)||dt),transactionRawDate:normalize(rowValue(r,use.date)||dt),type:typ,excluded:isExcluded(r,use),agent:agent(r,use),raw:r.join(' | ')});
  }
  return out;
}
function rowValue(row,idx){return Number.isInteger(idx)?row[idx]||'':''}

function parseNewMembers(text){
  const rows=splitRows(text),out=[];let idxs=null;
  for(const r of rows){
    if(isHeader(r)){idxs=headerIndexes(r);continue;}
    const use=idxs||inferRegistrationIndexes(r);if(!use)continue;
    let id=memberFrom(r,use.user);
    if(!id){const candidate=r.map(normalize).find(x=>/^BEB@/.test(x));id=candidate||'';}
    if(!id)continue;
    const rawDate=rowValue(r,use.date)||r.map(dateOnly).find(Boolean)||'';
    const d=dateOnly(rawDate);if(!d)continue;
    const dt=normalize(rawDate);
    out.push({id,registrationDate:d,registrationTime:dt,agent:rowValue(r,use.editedBy),raw:r.join(' | ')});
  }
  const seen=new Set(),dedup=[];
  for(const x of out){const k=[x.id,x.registrationDate,x.registrationTime,x.raw].join('|');if(!seen.has(k)){seen.add(k);dedup.push(x);}}
  return dedup;
}
function inferRegistrationIndexes(row){
  if(row.length>=2){
    const userIndex=row.findIndex(x=>/^BEB@/.test(normalize(x)));
    const dateIndex=row.findIndex(x=>dateOnly(x));
    if(userIndex>=0&&dateIndex>=0)return{user:userIndex,date:dateIndex,editedBy:row.length-1};
  }
  return null;
}
function registrationMap(list){
  const m=new Map();
  for(const x of list){const old=m.get(x.id);if(!old||x.registrationDate<old.registrationDate|| (x.registrationDate===old.registrationDate&&parseDateTime(x.registrationTime)<parseDateTime(old.registrationTime)))m.set(x.id,x);}
  return m;
}
function parseRegistrationText(text){return parseNewMembers(text)}

function parseDateTime(v){
  const m=normalize(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?)?/i);
  if(!m)return Number.POSITIVE_INFINITY;
  let h=Number(m[4]||0);const min=Number(m[5]||0),sec=Number(m[6]||0),ap=(m[7]||'').toUpperCase();
  if(ap==='AM'&&h===12)h=0;if(ap==='PM'&&h<12)h+=12;
  return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),h,min,sec).getTime();
}
function dayKey(dt){return dateOnly(dt)}
function fmt(n){return new Intl.NumberFormat('id-ID').format(Math.round(n))}
function rate(){const el=document.querySelector('input[name=rate]:checked');return el?Number(el.value):0.05}
function audit(qrisText,manualText,newMemberText){
  const parsed=parseSource(String(qrisText||'')+'\n'+String(manualText||''));
  const seen=new Set(),all=parsed.filter(x=>{const k=[x.type,x.id,x.dt,x.amount,x.raw].join('|');if(seen.has(k))return false;seen.add(k);return true;});
  const deposits=all.filter(x=>x.type==='QRIS'||x.type==='MANUAL');
  const bonuses=all.filter(x=>x.type==='BONUS');
  const groups=new Map();
  for(const d of deposits){const k=d.id+'|'+dayKey(d.transactionDate||d.dt);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)}
  const bg=new Map();for(const b of bonuses){const k=b.id+'|'+dayKey(b.transactionDate||b.dt);if(!bg.has(k))bg.set(k,[]);bg.get(k).push(b)}
  const regMap=registrationMap(parseRegistrationText(newMemberText||''));
  const rows=[];
  for(const[k,ds]of groups){
    ds.sort((a,b)=>a.amount===b.amount?String(a.dt).localeCompare(String(b.dt)):b.amount-a.amount);
    const chronological=[...ds].sort((a,b)=>parseDateTime(a.transactionRawDate||a.dt)-parseDateTime(b.transactionRawDate||b.dt));
    const best=ds[0],first=chronological[0],bs=bg.get(k)||[],given=bs.reduce((s,x)=>s+x.amount,0),excluded=ds.some(x=>x.excluded),should=excluded?0:Math.min(MAX_BONUS,best.amount*rate());
    const reg=regMap.get(best.id);const sameDay=!!reg&&reg.registrationDate===dayKey(best.transactionDate||best.dt);
    let statusText,cls,detail;
    if(bs.length>1){statusText='DOBEL BONUS';cls='bad';detail=`Terdapat ${bs.length} data bonus confirmed pada hari yang sama.`}
    else if(excluded){statusText='TIDAK DAPAT BONUS';cls='bad';detail='Ada keterangan pengecualian pada data deposit.'}
    else if(given===0){statusText='BELUM DAPAT';cls='warn';detail='Belum ditemukan bonus deposit confirmed.'}
    else if(given===should){statusText='SESUAI';cls='ok';detail='Bonus sesuai dengan persentase terpilih dan batas maksimum Rp 100.000.'}
    else if(given>should){statusText='LEBIH';cls='warn';detail='Bonus yang diberikan lebih besar dari hak bonus.'}
    else{statusText='KURANG';cls='warn';detail='Bonus yang diberikan lebih kecil dari hak bonus.'}
    rows.push({id:best.displayId,all:ds.reduce((s,x)=>s+x.amount,0),depositHistory:ds.map(x=>x.amount),basis:best.amount,should,given,statusText,cls,time:first.dt,agent:best.agent,detail,day:k.split('|')[1],firstDeposit:first.amount,firstDepositTime:first.dt,registrationDate:reg?reg.registrationDate:'',sameDayNewMember:sameDay});
  }
  rows.sort((a,b)=>a.id.localeCompare(b.id));
  return{rows,all,registrations:[...regMap.values()]};
}
function process(){
  try{
    const qrisText=$('qris').value||'', manualText=$('transactions').value||'', newMemberText=$('newMembers').value||'';
    if(!qrisText.trim()&&!manualText.trim()&&!newMemberText.trim()){
      $('status').textContent='Belum ada data input';
      $('summary').textContent='Masukkan minimal data QRIS atau Deposit Manual + Bonus, lalu klik Proses & Audit.';
      render([],0,0);
      $('export').disabled=true;
      return;
    }
    const parsed=parseSource(qrisText+'\n'+manualText);
    const result=audit(qrisText,manualText,newMemberText);
    window.__lastRows=result.rows;
    render(result.rows,result.all.length,result.registrations.length,parsed);
    $('export').disabled=!result.rows.length;
    $('status').textContent=`Audit selesai • ${parsed.length} baris transaksi terbaca`;
  }catch(err){
    console.error('Deposit Bonus Checker audit error:',err);
    $('status').textContent='Terjadi error saat audit';
    $('summary').textContent='Parser mengalami error: '+(err&&err.message?err.message:String(err));
    $('export').disabled=true;
  }
}
function render(rows,count,regCount,parsed){
  const newCount=rows.filter(r=>r.sameDayNewMember).length;
  const txCount=Number.isFinite(parsed)?parsed:count;
  const depositCount=rows.reduce((n,r)=>n+(r.depositHistory?r.depositHistory.length:0),0);
  const bonusCount=txCount-depositCount;
  $('summary').textContent=`${rows.length} member berdeposit • ${txCount} baris transaksi terbaca • ${depositCount} deposit • ${Math.max(0,bonusCount)} bonus • Bonus ${rate()*100}% • Maks. Rp 100.000/member • ${regCount} data daftar • ${newCount} deposit pertama di hari daftar`;
  if(!rows.length&&txCount>0){
    $('summary').textContent+=` Tidak ada member yang memiliki deposit QRIS/manual valid. Data yang terbaca mungkin hanya berupa baris BONUS.`;
  }
  const body=$('resultBody');
  if(!rows.length){body.innerHTML='<tr><td colspan="13" class="empty">Tidak ada data yang memenuhi syarat.</td></tr>';return}
  body.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${esc(r.id)}</strong><br><small>${esc(r.day)}</small></td><td>${r.depositHistory.map(x=>`Rp ${fmt(x)}`).join('<br>')}<hr><strong>Total: Rp ${fmt(r.all)}</strong></td><td>Rp ${fmt(r.basis)}</td><td>Rp ${fmt(r.should)}</td><td>Rp ${fmt(r.given)}</td><td><span class="${r.cls}">${esc(r.statusText)}</span></td><td>${esc(r.time)}</td><td>${r.registrationDate?esc(r.registrationDate):'-'}</td><td>Rp ${fmt(r.firstDeposit)}<br><small>${esc(r.firstDepositTime)}</small></td><td>${r.sameDayNewMember?'<span class="ok">YA</span>':'-'}</td><td>${esc(r.agent)}</td><td>${esc(r.detail)}</td></tr>`).join('');
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function csv(){
  const rows=window.__lastRows||[];if(!rows.length)return;
  const head=['No','ID Member','Tanggal Audit','Riwayat Deposit','Total Deposit Hari Itu','Deposit Basis Bonus','Bonus Seharusnya','Bonus Diberikan','Status','Waktu Deposit Pertama','Tanggal Daftar','Deposit Pertama','New Member Deposit Hari Daftar','Agent','Keterangan'];
  const lines=[head,...rows.map((r,i)=>[i+1,r.id,r.day,r.depositHistory.map(x=>'Rp '+fmt(x)).join(' | '),r.all,r.basis,r.should,r.given,r.statusText,r.firstDepositTime,r.registrationDate,r.firstDeposit,r.sameDayNewMember?'YA':'TIDAK',r.agent,r.detail])].map(a=>a.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(','));
  const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hasil-audit-bonus.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)
}
const sampleQ=`| User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Status Date | Remark | Edited By |\n| BEB@widodari99 | DANA ALAYHIMUS SALAM 08**13423*** | PrabuPay mariobola_oauser | 150.000 | 11/09/2026 | QR Pay | Confirmed | 11/09/2026 02:14:08 AM | | beb@Abd |`;
const sampleT=`| 1 | BEB@Erikjsr98 | BCA<br>Herry eko Widyantoro | BCA YANA | 77.000 | 11/09/2026 02:35:08 AM | Member Deposit | Confirmed | 11/09/2026 02:36:25 AM | | beb@FeriT |\n| 2 | BEB@Erikjsr98 | BCA | SCB<br>SCB A BONUS DEPOSIT HARIAN 01 | 3.500 | 11/09/2026 03:40:31 AM | Agent Deposit | Confirmed | 11/09/2026 03:44:00 AM | | beb@mario08 |\n| 3 | BEB@okta23 | GO PAY | BCA YANA | 50.000 | 11/09/2026 02:50:00 AM | Agent Deposit | Confirmed | 11/09/2026 02:50:48 AM | | beb@mario08 |\n| 4 | BEB@okta23 | GO PAY | BRI RAHMAT | 165.000 | 11/09/2026 02:55:29 AM | Member Deposit | Confirmed | 11/09/2026 02:55:59 AM | | beb@mario08 |\n| 5 | BEB@okta23 | GO PAY | SCB SCB A BONUS DEPOSIT HARIAN 01 | 8.000 | 11/09/2026 02:56:11 AM | Agent Deposit | Confirmed | 11/09/2026 02:56:19 AM | | beb@mario08 |`;
const sampleN=`| User Name | Date | Edited By |\n| BEB@Erikjsr98 | 11/09/2026 01:00:00 AM | beb@Admin |\n| BEB@okta23 | 11/09/2026 02:00:00 AM | beb@Admin |`;
$('process').onclick=process;$('export').onclick=csv;document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>$(b.dataset.clear).value='');document.querySelectorAll('input[name=rate]').forEach(x=>x.onchange=()=>{if(window.__lastRows.length)process()});$('sample').onclick=()=>{$('qris').value=sampleQ;$('transactions').value=sampleT;$('newMembers').value=sampleN;process()};
window.__lastRows=[];
window.DepositBonusChecker={parseSource,parseNewMembers,parseRegistrationText,amount,isExcluded,audit,process,MAX_BONUS,MEMBER_PREFIX};
})();
