(()=>{"use strict";
const $=id=>document.getElementById(id);
let last=[];

function clean(s){
  return String(s??"").replace(/<br\s*\/?>/gi," ").replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/gi," ").replace(/\\([@*])/g,"$1")
    .replace(/\u00a0/g," ").replace(/\*\*/g,"").replace(/__/g,"")
    .replace(/`/g,"").trim();
}
const norm=s=>clean(s).replace(/\s+/g," ").trim();
function rows(text){
  text=String(text||"").replace(/\r/g,"");
  return text.split("\n").map(x=>x.trim()).filter(Boolean).filter(x=>{
    const t=x.replace(/^\|/,"").replace(/\|$/,"").trim();
    return !/^[-:|\s]+$/.test(t);
  }).map(line=>{
    let x=line.trim();
    if(x.startsWith("|"))x=x.slice(1);
    if(x.endsWith("|"))x=x.slice(0,-1);
    return x.includes("\t")?x.split("\t").map(clean):
           x.includes("|")?x.split("|").map(clean):[clean(x)];
  }).filter(r=>r.some(Boolean));
}
function header(r){
  const s=norm(r.join(" ")).toUpperCase();
  return /USER\s*NAME|USERNAME|MEMBER\s*ID/.test(s) &&
         /AMOUNT|NOMINAL|DEPOSIT|DATE|STATUS/.test(s);
}
function indexes(r){
  const m={};
  r.forEach((v,i)=>{
    const k=norm(v).toUpperCase();
    if(/^(USER\s*NAME|USERNAME|MEMBER|MEMBER\s*ID)$/.test(k))m.user=i;
    if(/^(AMOUNT|NOMINAL|DEPOSIT)$/.test(k))m.amount=i;
    if(/^(DATE|TRANSACTION\s*DATE|TANGGAL)$/.test(k))m.date=i;
    if(/^STATUS$/.test(k))m.status=i;
    if(/PAYMENT\s*METHOD|METODE\s*PEMBAYARAN/.test(k))m.method=i;
    if(/STATUS\s*DATE|CONFIRMED\s*DATE/.test(k))m.statusDate=i;
    if(/REMARK|KETERANGAN/.test(k))m.remark=i;
    if(/EDITED\s*BY|ADMIN|OPERATOR/.test(k))m.agent=i;
    if(/^FROM\s*BANK|SOURCE$/.test(k))m.from=i;
    if(/^TO\s*BANK|DESTINATION$/.test(k))m.to=i;
  });
  return m;
}
function infer(r){
  if(r.length>=10)return{user:1,amount:4,date:5,method:6,status:7,statusDate:8,remark:9,agent:10,to:3};
  return null;
}
function money(s){
  let v=norm(s).replace(/^Rp\.?\s*/i,"").replace(/^IDR\s*/i,"").replace(/[^\d.,-]/g,"");
  if(!v)return 0;
  const d=(v.match(/\./g)||[]).length,c=(v.match(/,/g)||[]).length;
  if(d&&c){
    const last=Math.max(v.lastIndexOf("."),v.lastIndexOf(","));
    const tail=v.slice(last+1);
    if(tail.length===3)v=v.replace(/[.,]/g,"");
    else if(v.lastIndexOf(".")>v.lastIndexOf(","))v=v.replace(/,/g,"");
    else v=v.replace(/\./g,"").replace(",",".");
  }else if(d){
    const p=v.split(".");v=p[p.length-1].length===3?v.replace(/\./g,""):v;
  }else if(c){
    const p=v.split(",");v=p[p.length-1].length===3?v.replace(/,/g,""):v.replace(",",".");
  }
  const n=Number(v);return Number.isFinite(n)?n:0;
}
function date(s){
  const m=norm(s).match(/(\d{1,2}\/\d{1,2}\/\d{4})/);return m?m[1]:"";
}
function time(s){
  const m=norm(s).match(/\d{1,2}\/\d{1,2}\/\d{4}\s+(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM)?)/i);
  return m?m[1]:"";
}
function member(r,i){
  const prefix=norm($("prefix").value)||"BEB@";
  const v=(Number.isInteger(i)?norm(r[i]):"");
  if(v.startsWith(prefix))return v;
  return r.map(norm).find(x=>x.startsWith(prefix))||"";
}
function type(r,m){
  const mark=(norm($("bonusMark").value)||"SCB A BONUS DEPOSIT HARIAN").toUpperCase();
  const all=norm(r.join(" ")).toUpperCase();
  if(all.includes(mark))return"BONUS";
  const method=Number.isInteger(m.method)?norm(r[m.method]||""):all;
  if(/QR\s*PAY|QRPAY/.test(method)||/QR\s*PAY|QRPAY/.test(all))return"QRIS";
  if(/MEMBER\s*DEPOSIT|AGENT\s*DEPOSIT/.test(method)||/MEMBER\s*DEPOSIT|AGENT\s*DEPOSIT/.test(all))return"MANUAL";
  return"OTHER";
}
function validStatus(r,i){
  const want=(norm($("validStatus").value)||"Confirmed").toUpperCase();
  const got=Number.isInteger(i)?norm(r[i]).toUpperCase():norm(r.join(" ")).toUpperCase();
  return got.includes(want);
}
function parse(){
  const out=[];let ix=null;
  for(const r of rows($("source").value)){
    if(header(r)){ix=indexes(r);continue}
    const m=ix||infer(r);if(!m)continue;
    if(!validStatus(r,m.status))continue;
    const id=member(r,m.user);if(!id)continue;
    const amount=Number.isInteger(m.amount)?money(r[m.amount]):0;if(!amount)continue;
    const dt=Number.isInteger(m.statusDate)&&date(r[m.statusDate])?norm(r[m.statusDate]):
             (Number.isInteger(m.date)?norm(r[m.date]):norm(r.join(" ")));
    const d=date(dt);if(!d)continue;
    const typ=type(r,m);
    out.push({
      id,day:d,clock:time(dt),amount,type:typ,
      agent:Number.isInteger(m.agent)?norm(r[m.agent]||""):"",
      note:Number.isInteger(m.remark)?norm(r[m.remark]||""):norm(r.join(" ")),
      raw:r.join(" | ")
    });
  }
  const seen=new Set();
  return out.filter(x=>{
    const k=[x.id,x.day,x.clock,x.amount,x.type,x.raw].join("|");
    if(seen.has(k))return false;seen.add(k);return true;
  });
}
function fmt(n){return new Intl.NumberFormat("id-ID").format(Math.round(n))}
function render(data){
  last=data;
  const members=new Set(data.map(x=>x.id));
  $("sRows").textContent=data.length;
  $("sValid").textContent=data.filter(x=>x.type!=="OTHER").length;
  $("sMembers").textContent=members.size;
  $("sBonus").textContent=data.filter(x=>x.type==="BONUS").length;
  $("summary").textContent=`${data.length} baris valid • ${members.size} member unik • ${data.filter(x=>x.type==="BONUS").length} bonus • parser versi kita`;
  $("status").textContent=`Selesai • ${data.length} baris terbaca`;
  $("export").disabled=!data.length;
  const body=$("resultBody");
  if(!data.length){body.innerHTML='<tr><td colspan="9" class="empty">Tidak ada baris yang memenuhi aturan parser.</td></tr>';return}
  body.innerHTML=data.map((x,i)=>{
    const cls=x.type.toLowerCase();
    return `<tr><td>${i+1}</td><td><strong>${esc(x.id)}</strong></td><td>${esc(x.day)}</td><td>${esc(x.clock||"-")}</td>
    <td>Rp ${fmt(x.amount)}</td><td><span class="badge ${cls}">${esc(x.type)}</span></td>
    <td><span class="ok">VALID</span></td><td>${esc(x.agent||"-")}</td><td>${esc(x.note||"-")}</td></tr>`;
  }).join("");
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function exportCSV(){
  if(!last.length)return;
  const head=["No","ID Member","Tanggal","Waktu","Nominal","Tipe","Agent","Keterangan","Raw"];
  const lines=[head,...last.map((x,i)=>[i+1,x.id,x.day,x.clock,x.amount,x.type,x.agent,x.note,x.raw])]
    .map(a=>a.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(","));
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="hasil-parser-versi-kita.csv";a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
$("process").onclick=()=>{try{render(parse())}catch(e){$("status").textContent="Error parser";$("summary").textContent=e.message}};
$("clear").onclick=()=>{$("source").value="";render([]);$("status").textContent="Siap digunakan"};
$("export").onclick=exportCSV;
$("sample").onclick=()=>{
$("source").value=`| User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Status Date | Remark | Edited By |
| BEB@contoh01 | BCA | BCA YANA | 250.000 | 11/09/2026 | QR Pay | Confirmed | 11/09/2026 10:30:10 AM | Deposit | admin01 |
| BEB@contoh01 | BCA | SCB A BONUS DEPOSIT HARIAN 01 | 12.500 | 11/09/2026 | Agent Deposit | Confirmed | 11/09/2026 10:35:10 AM | Bonus | admin02 |
| BEB@contoh02 | DANA | BCA | 1,500.000 | 11/09/2026 | Member Deposit | Confirmed | 11/09/2026 11:00:00 AM | | admin03 |`;
render(parse());
};
})();
