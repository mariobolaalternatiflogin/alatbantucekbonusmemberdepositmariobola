(function(){'use strict';
const EXCLUSION_PHRASES=['SB','NO BONUS','SAFETY BET','SAFETY','NB','BATAL WD','WD DIKEMBALIKAN KE MEMBER','MEMBER LANJUT MAIN','WD DIKEMBALIKAN MEMBER LANJUT MAIN','TIDAK MAU BONUS'];
const BONUS_MARK='SCB A BONUS DEPOSIT HARIAN';
const $=id=>document.getElementById(id);
function clean(s){return String(s??'').replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\u00a0/g,' ').trim()}
function normalize(s){return clean(s).replace(/\s+/g,' ').trim()}
function splitRows(text){text=text.replace(/\r/g,''); if(!text.trim())return [];
 let lines=text.split('\n').filter(x=>x.trim());
 lines=lines.filter(x=>!/^\s*\|?\s*-{2,}/.test(x));
 return lines.map(line=>{let x=line.trim(); if(x.startsWith('|'))x=x.slice(1); if(x.endsWith('|'))x=x.slice(0,-1); if(x.includes('\t'))return x.split('\t').map(clean); if(x.includes('|'))return x.split('|').map(clean); return [clean(x)];}).filter(r=>r.some(Boolean));
}
function isHeader(row){const j=normalize(row.join(' ')).toUpperCase(); return j.includes('USER NAME') && j.includes('EDITED BY') && j.includes('STATUS');}
function headerIndexes(row){const map={}; row.forEach((v,i)=>{const k=normalize(v).toUpperCase(); if(k==='USER NAME')map.user=i; if(k==='FROM BANK')map.from=i; if(k==='TO BANK')map.to=i; if(k==='AMOUNT')map.amount=i; if(k==='DATE')map.date=i; if(k==='PAYMENT METHOD')map.method=i; if(k==='STATUS')map.status=i; if(k==='STATUS DATE')map.statusDate=i; if(k==='REMARK')map.remark=i; if(k==='EDITED BY')map.editedBy=i;}); return map;}

function amount(s){let m=normalize(s).match(/(?:IDR\s*)?(\d[\d.,\s]*)/i); if(!m)return 0; let raw=m[1].replace(/\s/g,''); if(raw.includes('.')&&raw.includes(',')){const lastDot=raw.lastIndexOf('.'), lastComma=raw.lastIndexOf(','); if(lastDot>lastComma){raw=raw.replace(/,/g,'')}else{raw=raw.replace(/\./g,'').replace(',','.')}}else if(raw.includes('.')){const parts=raw.split('.'); raw=(parts[parts.length-1].length===3)?raw.replace(/\./g,''):raw}else if(raw.includes(',')){const parts=raw.split(','); raw=(parts[parts.length-1].length===3)?raw.replace(/,/g,''):raw.replace(',','.')} let n=Number(raw); return Number.isFinite(n)?n:0}
function rowAmount(row,idx){if(Number.isInteger(idx)&&row[idx]){const n=amount(row[idx]);if(n>0)return n} const candidates=row.map(normalize).filter(x=>x&&!/\d{1,2}\/\d{1,2}\/\d{4}/.test(x)&&!/:\d{2}\b/.test(x)&&!/^\d{8,}$/.test(x)); const marked=candidates.filter(x=>/[.,]/.test(x)||/IDR/i.test(x)).map(amount).filter(n=>n>0); if(marked.length)return Math.min(...marked.filter(n=>n<1e10)); const nums=candidates.map(amount).filter(n=>n>0&&n<1e8); return nums.length?Math.min(...nums):0}
function memberFrom(row,idx){if(Number.isInteger(idx)&&row[idx])return normalize(row[idx]); let m=normalize(row[0]||'').match(/\b(BEB@[^\s|]+)\b/i); return m?m[1]:'UNKNOWN'}
function dateTime(row,idx){if(Number.isInteger(idx)&&row[idx]){const v=normalize(row[idx]); if(/\d{1,2}\/\d{1,2}\/\d{4}/.test(v))return v} let joined=normalize(row.join(' ')); let m=joined.match(/(\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)/i); return m?m[1]:''}
function status(row,idx){if(Number.isInteger(idx)&&row[idx])return /\bconfirmed\b/i.test(row[idx])?'CONFIRMED':''; let j=normalize(row.join(' ')); return /\bconfirmed\b/i.test(j)?'CONFIRMED':''}
function type(row,idxs){let j=normalize(row.join(' ')); if(idxs&&Number.isInteger(idxs.method)){const m=normalize(row[idxs.method]); const all=normalize((row[idxs.to]||'')+' '+(row[idxs.remark]||'')+' '+m); if(/SCB A BONUS DEPOSIT HARIAN/i.test(all))return 'BONUS'; if(/QR\s*Pay|QRPay/i.test(m))return 'QRIS'; if(/Member Deposit|Agent Deposit/i.test(m))return 'MANUAL';} if(/SCB A BONUS DEPOSIT HARIAN/i.test(j))return 'BONUS'; if(/\bQR\s*Pay\b|QRPay/i.test(j))return 'QRIS'; if(/Member Deposit|Agent Deposit/i.test(j))return 'MANUAL'; return ''}
function noteText(row,idxs){if(idxs){return normalize([row[idxs.remark],row[idxs.to],row[idxs.method]].filter(Boolean).join(' ')).toUpperCase()} return normalize(row.join(' ')).toUpperCase()}
function isExcluded(row,idxs){let j=noteText(row,idxs);return EXCLUSION_PHRASES.some(p=>new RegExp('(^|\\s|[^A-Z])'+p.replace(/\s+/g,'\\s+')+'($|\\s|[^A-Z])','i').test(j))}
function agent(row,idxs){if(idxs&&Number.isInteger(idxs.editedBy))return normalize(row[idxs.editedBy]||''); return ''}
function parseSource(text, forcedType){const rows=splitRows(text), out=[]; let idxs=null; for(const r of rows){if(isHeader(r)){idxs=headerIndexes(r);continue;} let st=status(r,idxs?.status); if(!st)continue; let typ=forcedType||type(r,idxs); if(!typ)continue; let id=memberFrom(r,idxs?.user); if(!id||id==='UNKNOWN')continue; let dt=dateTime(r,idxs?.date); let amt=rowAmount(r,idxs?.amount); if(!amt)continue; out.push({id:id.toLowerCase(),displayId:id,amount:amt,dt,type:typ,excluded:isExcluded(r,idxs),agent:agent(r,idxs),raw:r.join(' | ')});} return out}
function dayKey(dt){let m=dt.match(/(\d{1,2}\/\d{1,2}\/\d{4})/); return m?m[1]:''}
function fmt(n){return new Intl.NumberFormat('id-ID').format(Math.round(n))}
function rate(){return Number(document.querySelector('input[name=rate]:checked').value)}
function process(){
 const q=parseSource($('qris').value,'QRIS'), man=parseSource($('manual').value,'MANUAL'), bon1=parseSource($('bonus').value,'BONUS');
 const autoBonus=man.filter(x=>x.raw.toUpperCase().includes(BONUS_MARK)).map(x=>({...x,type:'BONUS'}));
 const manual=man.filter(x=>!x.raw.toUpperCase().includes(BONUS_MARK));
 const bonuses=bon1.concat(autoBonus);
 const deposits=q.concat(manual).filter(x=>x.type==='QRIS'||x.type==='MANUAL');
 const groups=new Map(); for(const d of deposits){const k=d.id+'|'+dayKey(d.dt); if(!groups.has(k))groups.set(k,[]); groups.get(k).push(d)}
 const bg=new Map(); for(const b of bonuses){const k=b.id+'|'+dayKey(b.dt); if(!bg.has(k))bg.set(k,[]); bg.get(k).push(b)}
 const rows=[]; for(const [k,ds] of groups){ds.sort((a,b)=>b.amount-a.amount); const best=ds[0], key=k, bs=bg.get(key)||[], given=bs.reduce((s,x)=>s+x.amount,0), excluded=ds.some(x=>x.excluded)||best.excluded; const should=excluded?0:best.amount*rate(); let statusText, cls, detail;
 if(bs.length>1){statusText='DOBEL BONUS';cls='bad';detail=`Terdapat ${bs.length} data bonus pada hari yang sama.`}
 else if(excluded){statusText='TIDAK DAPAT BONUS';cls='bad';detail='Ada keterangan pengecualian pada data deposit.'}
 else if(given===0){statusText='BELUM DAPAT';cls='warn';detail='Belum ditemukan bonus deposit yang confirmed.'}
 else if(given===should){statusText='SESUAI';cls='ok';detail='Bonus sesuai dengan persentase terpilih.'}
 else if(given>should){statusText='LEBIH';cls='warn';detail='Bonus yang diberikan lebih besar dari hak bonus.'}
 else {statusText='KURANG';cls='warn';detail='Bonus yang diberikan lebih kecil dari hak bonus.'}
 rows.push({id:best.displayId,all:ds.reduce((s,x)=>s+x.amount,0),basis:best.amount,should,given,statusText,cls,time:best.dt,agent:bs[0]?.agent||best.agent,detail,day:key.split('|')[1]}); }
 rows.sort((a,b)=>a.id.localeCompare(b.id)); render(rows,q.length+manual.length+bonuses.length); window.__lastRows=rows; $('export').disabled=!rows.length;
}
function render(rows,count){$('summary').textContent=`${rows.length} member • ${count} baris Confirmed terbaca • Bonus ${rate()*100}%`; const body=$('resultBody'); if(!rows.length){body.innerHTML='<tr><td colspan="10" class="empty">Tidak ada data yang memenuhi syarat.</td></tr>';return} body.innerHTML=rows.map((r,i)=>`<tr><td>${i+1}</td><td><strong>${esc(r.id)}</strong><br><small>${esc(r.day)}</small></td><td>Rp ${fmt(r.all)}</td><td>Rp ${fmt(r.basis)}</td><td>Rp ${fmt(r.should)}</td><td>Rp ${fmt(r.given)}</td><td><span class="${r.cls}">${esc(r.statusText)}</span></td><td>${esc(r.time)}</td><td>${esc(r.agent)}</td><td>${esc(r.detail)}</td></tr>`).join('')}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function csv(){const rows=window.__lastRows||[]; if(!rows.length)return; const head=['No','ID Member','Seluruh Deposit Hari Itu','Deposit Basis Bonus','Bonus Seharusnya','Bonus Diberikan','Status','Waktu Confirmed','Agent','Keterangan']; const lines=[head,...rows.map((r,i)=>[i+1,r.id,r.all,r.basis,r.should,r.given,r.statusText,r.time,r.agent,r.detail])].map(a=>a.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')); const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hasil-audit-bonus.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
const sampleQ=`| BEB@widodari99 | DANA ALAYHIMUS SALAM 08**13423*** | PrabuPay mariobola_oauser 4398778b-be92-469d-bd58-cb6a18a886e7 | 150.000 | 17890640120298099 | | 11/09/2026 02:13:32 AM | QR Pay | Confirmed | View | 11/09/2026 02:14:08 AM | Abd | QRPay User |`;
const sampleM=`| BEB@Erikjsr98 | BCA Herry eko Widyantoro 1660163588 | BCA YANA 6125279965 | 77.000 | 11/09/2026 02:35:08 AM | Member Deposit | Confirmed | 11/09/2026 02:36:25 AM | | beb@FeriT |\n| BEB@Brudu | BNI Muhammad abduh nasution 1819875750 | SCB SCB A BONUS DEPOSIT HARIAN 01 | 5.000 | 11/09/2026 02:21:03 AM | Agent Deposit | Confirmed | 11/09/2026 02:21:06 AM | | beb@mario08 |`;
$('process').onclick=()=>{process();$('status').textContent='Audit selesai'}; $('export').onclick=csv; document.querySelectorAll('[data-clear]').forEach(b=>b.onclick=()=>$(b.dataset.clear).value=''); $('sample').onclick=()=>{$('qris').value=sampleQ;$('manual').value=sampleM;$('bonus').value='';process();};
window.DepositBonusChecker={parseSource,amount,isExcluded,process};
})();
