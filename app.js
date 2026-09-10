const state={type:"qris",rows:[]};
const cfg={
 qris:{title:"Deposit QRIS Pay",help:"Parser khusus format transaksi QR Pay seperti data sumber yang diberikan.",headers:["No","Member","Bank / E-Wallet","Nama","Akun / Nomor","Nominal","Transaction ID","Tanggal Transaksi","Metode","Status","Waktu Konfirmasi","Operator"]},
 manual:{title:"Deposit Manual",help:"Parser fleksibel untuk data deposit manual. Format akan dipetakan dari baris transaksi yang tersedia.",headers:["No","Member","Bank / Metode","Nama","Akun / Nomor","Nominal","Transaction ID","Tanggal","Status","Keterangan"]},
 newmember:{title:"New Member Harian",help:"Pembaca daftar member baru harian dan mencoba mencocokkan username/member, tanggal, serta data deposit.",headers:["No","Member","Tanggal","Deposit Pertama","Nominal","Sumber","Keterangan"]}
};

const $=id=>document.getElementById(id);
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{state.type=b.dataset.type;document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("sourceTitle").textContent=cfg[state.type].title;$("sourceHelp").textContent=cfg[state.type].help;render([]);});
$("clearBtn").onclick=()=>{$("rawData").value="";state.rows=[];render([])};
$("processBtn").onclick=process;
$("sampleBtn").onclick=()=>{$("rawData").value=samples[state.type];process()};
$("search").oninput=()=>filterRows();
$("csvBtn").onclick=exportCSV;

function clean(s){return (s||"").trim().replace(/\s+/g," ")}
function money(s){if(!s)return 0;let x=clean(s).replace(/[^\d.,-]/g,"");if(x.includes(".")&&x.includes(","))x=x.replace(/\./g,"").replace(",",".");else if(/^\d{1,3}(\.\d{3})+$/.test(x))x=x.replace(/\./g,"");else if(/^\d{1,3}(,\d{3})+$/.test(x))x=x.replace(/,/g,"");else x=x.replace(/,/g,"");let n=parseFloat(x);return Number.isFinite(n)?n:0}
function rupiah(n){return "Rp "+new Intl.NumberFormat("id-ID").format(n)}
function lines(raw){return raw.replace(/\r/g,"").split("\n").map(x=>x.trim()).filter(Boolean)}

function parseQRIS(raw){
 const a=lines(raw), out=[]; 
 for(let i=0;i<a.length;i++){
   const m=a[i].match(/^(\d+)\s+(BEB@\S+)\s+(.+)$/i);
   if(!m) continue;
   const row={no:m[1],member:m[2],bank:clean(m[3]),name:"",account:"",nominal:0,txid:"",date:"",method:"",status:"",confirm:"",operator:"",raw:[]};
   let j=i+1;
   row.name=clean(a[j++]||"");
   row.account=clean(a[j++]||"").replace(/\s+PrabuPay$/i,"");
   if(a[j] && /PrabuPay/i.test(a[j])) j++;
   const data=clean(a[j++]||"");
   const parts=data.split(/\s+/);
   if(parts.length>=3){row.txid=parts[parts.length-1];row.nominal=money(parts[parts.length-2]);}
   const detail=clean(a[j++]||"");
   const dm=detail.match(/^(.+?)\s+(QR\s*Pay)\s+(\S+)\s+View\s+(.+?)\s+(\S+)\s+(.+)$/i);
   if(dm){row.date=dm[1];row.method=dm[2];row.status=dm[3];row.confirm=dm[4];row.operator=dm[5]+" "+dm[6]}
   row.raw=a.slice(i,j); out.push(row); i=j-1;
 }
 return out;
}

function parseFlexible(raw,type){
 const a=lines(raw), out=[];
 // New member: one member per line is accepted, while tabular data is also handled.
 if(type==="newmember"){
   let no=0;
   a.forEach(line=>{
     if(/^(no|username|member|id member)/i.test(line)) return;
     const cols=line.split(/\t+|\|+|,(?=\s)/).map(clean).filter(Boolean);
     if(cols.length>=2){out.push({no:++no,member:cols[0],date:cols[1]||"",deposit:cols[2]||"",nominal:money(cols.find(x=>/\d/.test(x))||""),source:"",note:""});}
     else if(/BEB@/i.test(line)){out.push({no:++no,member:(line.match(/BEB@\S+/i)||[""])[0],date:"",deposit:"",nominal:0,source:"",note:""});}
   });
   return out;
 }
 // Manual parser: detect BEB@ and collect the nearby lines.
 for(let i=0;i<a.length;i++){
   const m=a[i].match(/^(\d+)?\s*(BEB@\S+)\s*(.*)$/i);
   if(!m) continue;
   let j=i+1, name=clean(m[3]), account="", nominal=0, txid="", date="", status="", method=clean(m[3]);
   if(!name) name=clean(a[j++]||"");
   const nearby=a.slice(j,j+7);
   nearby.forEach(x=>{if(!nominal && /\d/.test(x)) nominal=money(x); if(!txid && /^\d{10,}$/.test(x)) txid=x; if(!date && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(x)) date=x;if(!status&&/confirmed|pending|success|failed/i.test(x))status=x});
   account=clean(a[j++]||"");
   out.push({no:m[1]||out.length+1,member:m[2],bank:method,name,account,nominal,txid,date,status,note:"Terbaca dari format fleksibel"}); 
 }
 return out;
}

function process(){
 const raw=$("rawData").value.trim();
 if(!raw){alert("Silakan paste data sumber terlebih dahulu.");return}
 state.rows=state.type==="qris"?parseQRIS(raw):parseFlexible(raw,state.type);
 render(state.rows);
}

function render(rows){
 const headers=cfg[state.type].headers;
 $("headRow").innerHTML=headers.map(h=>`<th>${h}</th>`).join("");
 $("bodyRows").innerHTML=rows.length?rows.map((r,idx)=>{
   if(state.type==="qris") return `<tr><td>${r.no}</td><td>${r.member}</td><td>${r.bank}</td><td>${r.name}</td><td>${r.account}</td><td>${rupiah(r.nominal)}</td><td>${r.txid}</td><td>${r.date}</td><td>${r.method}</td><td class="${/confirmed/i.test(r.status)?"ok":"warn"}">${r.status}</td><td>${r.confirm}</td><td>${r.operator}</td></tr>`;
   if(state.type==="manual") return `<tr><td>${r.no}</td><td>${r.member}</td><td>${r.bank||""}</td><td>${r.name||""}</td><td>${r.account||""}</td><td>${rupiah(r.nominal)}</td><td>${r.txid||""}</td><td>${r.date||""}</td><td>${r.status||""}</td><td>${r.note||""}</td></tr>`;
   return `<tr><td>${r.no}</td><td>${r.member}</td><td>${r.date}</td><td>${r.deposit}</td><td>${rupiah(r.nominal)}</td><td>${r.source}</td><td>${r.note}</td></tr>`;
 }).join(""):`<tr><td colspan="${headers.length}" style="text-align:center;padding:35px;color:#657894">Belum ada hasil</td></tr>`;
 updateStats(rows);
}
function updateStats(rows){
 const total=rows.reduce((s,r)=>s+(r.nominal||0),0);
 const members=new Set(rows.map(r=>r.member).filter(Boolean));
 $("count").textContent=rows.length;$("total").textContent=rupiah(total);$("unique").textContent=members.size;
 $("errors").textContent=rows.filter(r=>!r.member||(!r.nominal&&state.type!=="newmember")).length;
 $("resultNote").textContent=rows.length?`${rows.length} data berhasil dibaca dari sumber ${cfg[state.type].title}.`:"Belum ada data yang diproses.";
}
function filterRows(){
 const q=clean($("search").value).toLowerCase();
 if(!q){render(state.rows);return}
 render(state.rows.filter(r=>Object.values(r).join(" ").toLowerCase().includes(q)));
}
function exportCSV(){
 if(!state.rows.length){alert("Belum ada data untuk diexport.");return}
 const headers=cfg[state.type].headers;
 const vals=state.rows.map(r=>state.type==="qris"?[r.no,r.member,r.bank,r.name,r.account,r.nominal,r.txid,r.date,r.method,r.status,r.confirm,r.operator]:state.type==="manual"?[r.no,r.member,r.bank,r.name,r.account,r.nominal,r.txid,r.date,r.status,r.note]:[r.no,r.member,r.date,r.deposit,r.nominal,r.source,r.note]);
 const csv=[headers,...vals].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
 const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`mariobolamari-${state.type}.csv`;a.click();URL.revokeObjectURL(url);
}

const samples={
qris:`1 BEB@contohuser DANA
Nama Contoh
08**12345*** PrabuPay
mariobola_oauser
4398778b-be92-469d-bd58-cb6a18a886e7 50.000 17890663489061606
10/09/2026 11:59:36 PM QR Pay Confirmed View 11/09/2026 12:00:25 AM Abd QRPay User`,
manual:`1 BEB@contohmanual BCA
Nama Contoh
1234567890
50000
11/09/2026 01:00:00 AM Manual Confirmed`,
newmember:`BEB@memberbaru1\t11/09/2026\tBelum Deposit
BEB@memberbaru2\t11/09/2026\t50.000`
};
render([]);
