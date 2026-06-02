"use client";
import { useState, useEffect, useCallback, useRef } from "react";

type Priority = "High"|"Medium"|"Low";
type Status   = "Needed"|"In Progress"|"Procured";
type Vendor   = "Amazon"|"Costco"|"Sam's Club"|"Walmart Business"|"Restaurant Depot"|"Home Depot"|"Best Buy"|"Target"|"Uline"|"TBD";

interface Item { id:string;name:string;dept:string;qty:number;unit:string;price:number|null;priority:Priority;vendor:Vendor;status:Status;link:string;notes:string;createdAt?:string; }
interface AISingle { vendor:string;estimatedPrice:number;savings:string;reasoning:string;alternativeVendor:string;alternativePrice:number;tip:string; }
interface AIBulk { itemName:string;recommendedVendor:string;estimatedPrice:number;currentPrice:number|null;savingsNote:string;reasoning:string;alternativeVendor?:string;alternativePrice?:number; }

const DEPTS=["Nazafat","Audio Video","Mawaid Sabeel","Security & Parking","Communication & Help Desk","IT & Security Checking","Najwa Niyaz Team","Tazeen","Atfal","Flow Management","Photography","Medical"] as const;
const DEPT_ICONS:Record<string,string>={"Nazafat":"🧹","Audio Video":"🎬","Mawaid Sabeel":"🍽️","Security & Parking":"🚗","Communication & Help Desk":"📞","IT & Security Checking":"💻","Najwa Niyaz Team":"🎤","Tazeen":"🌸","Atfal":"👶","Flow Management":"🔄","Photography":"📷","Medical":"🏥"};
const VENDORS:Vendor[]=["Amazon","Costco","Sam's Club","Walmart Business","Restaurant Depot","Home Depot","Best Buy","Target","Uline","TBD"];
const PRICE_HINTS:Record<string,string>={
  "Amazon":"Competitive pricing, fast Prime delivery",
  "Costco":"Bulk pricing, avg 20–40% below retail",
  "Sam's Club":"Warehouse bulk pricing",
  "Walmart Business":"Competitive retail, volume discounts",
  "Restaurant Depot":"Wholesale foodservice pricing",
  "Home Depot":"Contractor/retail pricing",
  "Best Buy":"Retail electronics pricing",
  "Target":"Retail, good for décor & general supplies",
  "Uline":"Wholesale industrial/packaging supplies",
};
const VENDOR_COLORS:Record<string,string>={
  "Amazon":"bg-amber-100 text-amber-800 border-amber-300",
  "Costco":"bg-blue-100 text-blue-800 border-blue-300",
  "Sam's Club":"bg-sky-100 text-sky-800 border-sky-300",
  "Walmart Business":"bg-cyan-100 text-cyan-800 border-cyan-300",
  "Restaurant Depot":"bg-red-100 text-red-800 border-red-300",
  "Home Depot":"bg-orange-100 text-orange-800 border-orange-300",
  "Best Buy":"bg-indigo-100 text-indigo-800 border-indigo-300",
  "Target":"bg-rose-100 text-rose-800 border-rose-300",
  "Uline":"bg-emerald-100 text-emerald-800 border-emerald-300",
  "TBD":"bg-gray-100 text-gray-600 border-gray-300",
};
const VENDOR_RULES:Record<string,Vendor[]>={
  "Nazafat":["Costco","Amazon","Walmart Business","Home Depot","Uline"],
  "Audio Video":["Amazon","Best Buy","Walmart Business"],
  "Mawaid Sabeel":["Restaurant Depot","Costco","Sam's Club","Walmart Business"],
  "Security & Parking":["Amazon","Walmart Business","Home Depot"],
  "Communication & Help Desk":["Amazon","Best Buy","Walmart Business"],
  "IT & Security Checking":["Amazon","Best Buy","Costco"],
  "Najwa Niyaz Team":["Amazon","Walmart Business","Costco"],
  "Tazeen":["Amazon","Costco","Walmart Business","Target"],
  "Atfal":["Amazon","Walmart Business","Target","Costco"],
  "Flow Management":["Amazon","Home Depot","Walmart Business","Uline"],
  "Photography":["Amazon","Best Buy","Costco"],
  "Medical":["Amazon","Costco","Walmart Business"],
};

// Smart search links — filtered for quality results
function vendorSearchLink(vendor:string, itemName:string):string {
  const q = encodeURIComponent(itemName);
  switch(vendor) {
    case "Amazon":         return `https://www.amazon.com/s?k=${q}&rh=p_72%3A1248879011&s=price-asc-rank`; // 4★+ sorted by price
    case "Costco":         return `https://www.costco.com/CatalogSearch?keyword=${q}&sortBy=item.relevance`;
    case "Sam's Club":     return `https://www.samsclub.com/s/${q}?xid=plp_search`;
    case "Walmart Business": return `https://www.walmart.com/search?q=${q}&sort=price_low`;
    case "Restaurant Depot": return `https://www.restaurantdepot.com/search?query=${q}`;
    case "Home Depot":     return `https://www.homedepot.com/s/${q}?NCNI-5&sortby=price&order=asc`;
    case "Best Buy":       return `https://www.bestbuy.com/site/searchpage.jsp?st=${q}&sp=-priceSortAsc`;
    case "Target":         return `https://www.target.com/s?searchTerm=${q}&sortBy=priceAsc`;
    case "Uline":          return `https://www.uline.com/BL_3/Search?keywords=${q}`;
    default:               return `https://www.google.com/search?q=${q}+cheapest+price+buy`;
  }
}

const fmt=(n:number|null)=>n!=null?`$${Number(n).toFixed(2)}`:"—";
const totalCost=(i:Item)=>i.price&&i.qty?i.price*i.qty:0;

const C={
  navy:"#0f2d3d",teal:"#1a3d4f",tealMid:"#1e4d63",
  gold:"#c9a84c",goldLight:"#e2c97e",goldPale:"#f5ecd0",
  white:"#ffffff",cream:"#f7f5f0",
  border:"#2a5068",borderGold:"rgba(201,168,76,0.35)",
};

// ── AI SINGLE POPUP ─────────────────────────────────────────────────────────
function AISinglePopup({result,itemName,onClose,onApply}:{result:AISingle;itemName:string;onClose:()=>void;onApply:(v:string,p:number)=>void}){
  const searchUrl = vendorSearchLink(result.vendor, itemName);
  const altUrl    = result.alternativeVendor ? vendorSearchLink(result.alternativeVendor, itemName) : null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(10,25,35,0.88)"}}>
      <div className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border" style={{background:C.teal,borderColor:C.borderGold,maxHeight:"92vh",overflowY:"auto"}}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{borderColor:C.border}}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{color:C.gold}}>🤖 AI Vendor Analysis</div>
            <div className="text-sm font-semibold" style={{color:C.goldLight}}>{itemName}</div>
          </div>
          <button onClick={onClose} className="text-2xl w-9 h-9 flex items-center justify-center rounded-full" style={{color:C.gold,background:"rgba(201,168,76,0.1)"}}>×</button>
        </div>
        <div className="p-4 space-y-3">
          {/* Best pick */}
          <div className="rounded-xl p-4 border" style={{background:C.navy,borderColor:C.gold}}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>✅ Cheapest Vendor</div>
              <div className="text-xl font-bold" style={{color:"#4ade80"}}>${result.estimatedPrice?.toFixed(2)}</div>
            </div>
            <div className="text-lg font-bold mb-1" style={{color:C.white}}>{result.vendor}</div>
            <div className="text-xs mb-1" style={{color:C.goldPale}}>{result.savings}</div>
            <div className="text-xs mb-3" style={{color:"#a0c4d4"}}>{result.reasoning}</div>
            {/* Search link */}
            <a href={searchUrl} target="_blank" rel="noopener"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition"
              style={{background:C.gold,color:C.navy}}>
              🛒 Shop on {result.vendor}
              <span className="text-xs opacity-70">(sorted cheapest first)</span>
            </a>
          </div>
          {/* Alternative */}
          {result.alternativeVendor&&(
            <div className="rounded-xl p-3 border" style={{background:"rgba(255,255,255,0.04)",borderColor:C.border}}>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{color:"#8ab0c0"}}>🔄 Alternative</div>
                  <div className="text-sm font-medium mt-0.5" style={{color:C.goldPale}}>{result.alternativeVendor}</div>
                </div>
                <span className="text-base font-bold" style={{color:"#fbbf24"}}>${result.alternativePrice?.toFixed(2)}</span>
              </div>
              {altUrl&&(
                <a href={altUrl} target="_blank" rel="noopener"
                  className="flex items-center justify-center gap-1 w-full py-2 rounded-lg text-xs font-semibold border"
                  style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>
                  🔍 Search on {result.alternativeVendor}
                </a>
              )}
            </div>
          )}
          {result.tip&&(
            <div className="rounded-xl p-3" style={{background:"rgba(201,168,76,0.1)",border:`1px solid ${C.borderGold}`}}>
              <span className="text-xs" style={{color:C.goldLight}}>💡 {result.tip}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Dismiss</button>
            <button onClick={()=>onApply(result.vendor,result.estimatedPrice)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>Apply to Item</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── DEPT AI PANEL ────────────────────────────────────────────────────────────
function DeptAIPanel({dept,results,loading,error,onApplyAll,onApplyOne,onClose}:{
  dept:string;results:AIBulk[]|null;loading:boolean;error:string|null;
  onApplyAll:(r:AIBulk[])=>void;onApplyOne:(r:AIBulk)=>void;onClose:()=>void;
}){
  const icon=DEPT_ICONS[dept]||"📦";
  const totalEstimated=results?results.reduce((s,r)=>s+(r.estimatedPrice||0),0):0;
  const totalSavings=results?results.reduce((s,r)=>{
    if(r.currentPrice&&r.estimatedPrice&&r.currentPrice>r.estimatedPrice)return s+(r.currentPrice-r.estimatedPrice);
    return s;
  },0):0;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(10,25,35,0.92)"}}>
      <div className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col border" style={{background:C.teal,borderColor:C.borderGold,maxHeight:"92vh"}}>
        <div className="px-5 pt-5 pb-4 border-b shrink-0" style={{borderColor:C.border,background:`linear-gradient(135deg,${C.navy},${C.teal})`}}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>AI Vendor Analysis</span>
              </div>
              <div className="text-lg font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight}}>{dept}</div>
              <div className="text-xs mt-0.5" style={{color:"#8ab0c0"}}>Groq · Llama 3.3 70B · Links sorted cheapest first</div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-xl" style={{color:C.gold,background:"rgba(201,168,76,0.1)"}}>×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading&&(
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="text-5xl" style={{animation:"spin 1.5s linear infinite",display:"inline-block"}}>⚙️</div>
              <div className="text-sm font-medium" style={{color:C.goldLight}}>Analyzing {dept} items…</div>
              <div className="text-xs" style={{color:"#6a8a9a"}}>Finding cheapest vendors + building shop links</div>
            </div>
          )}
          {error&&(
            <div className="m-5 rounded-xl p-4 border" style={{background:"rgba(176,48,48,0.15)",borderColor:"#b03030",color:"#f5a0a0"}}>
              <div className="font-bold mb-1">⚠️ Error</div>
              <div className="text-sm">{error}</div>
              {error.includes("GROQ_API_KEY")&&(
                <div className="mt-3 p-3 rounded-lg text-xs" style={{background:"rgba(201,168,76,0.1)",color:C.goldLight}}>
                  Add <strong>GROQ_API_KEY</strong> in Vercel → Settings → Environment Variables, then redeploy.
                </div>
              )}
            </div>
          )}
          {results&&!loading&&(
            <div className="p-4 space-y-3">
              {/* Summary */}
              <div className="rounded-xl p-4 grid grid-cols-3 gap-3 border" style={{background:C.navy,borderColor:C.borderGold}}>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{color:"#8ab0c0"}}>Items</div>
                  <div className="text-2xl font-bold" style={{color:C.goldLight}}>{results.length}</div>
                </div>
                <div className="text-center border-x" style={{borderColor:C.border}}>
                  <div className="text-xs uppercase tracking-wider mb-1" style={{color:"#8ab0c0"}}>AI Est. Total</div>
                  <div className="text-xl font-bold" style={{color:C.gold}}>${totalEstimated.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs uppercase tracking-wider mb-1" style={{color:"#8ab0c0"}}>Savings</div>
                  <div className="text-xl font-bold" style={{color:totalSavings>0?"#4ade80":C.goldLight}}>{totalSavings>0?`$${totalSavings.toFixed(2)}`:"—"}</div>
                </div>
              </div>
              {/* Per-item results */}
              {results.map((r,i)=>{
                const saved=r.currentPrice&&r.estimatedPrice&&r.currentPrice>r.estimatedPrice?r.currentPrice-r.estimatedPrice:null;
                const shopUrl=vendorSearchLink(r.recommendedVendor,r.itemName);
                const altUrl=r.alternativeVendor?vendorSearchLink(r.alternativeVendor,r.itemName):null;
                return (
                  <div key={i} className="rounded-xl border overflow-hidden" style={{borderColor:C.border,background:"rgba(255,255,255,0.03)"}}>
                    <div className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm mb-0.5 truncate" style={{color:C.white}}>{r.itemName}</div>
                          <div className="text-xs" style={{color:"#7a9ab0"}}>{r.reasoning}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="font-bold text-sm" style={{color:C.gold}}>{r.recommendedVendor}</div>
                          <div className="text-lg font-bold" style={{color:saved?"#4ade80":C.goldLight}}>${r.estimatedPrice?.toFixed(2)}</div>
                          {saved&&<div className="text-xs" style={{color:"#86efac"}}>saves ${saved.toFixed(2)}</div>}
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-2 mt-3">
                        <a href={shopUrl} target="_blank" rel="noopener"
                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold"
                          style={{background:C.gold,color:C.navy}}>
                          🛒 Shop {r.recommendedVendor}
                        </a>
                        {altUrl&&(
                          <a href={altUrl} target="_blank" rel="noopener"
                            className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs border"
                            style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>
                            🔍 {r.alternativeVendor}
                          </a>
                        )}
                        <button onClick={()=>onApplyOne(r)}
                          className="py-2 px-3 rounded-lg text-xs font-bold border"
                          style={{background:"rgba(201,168,76,0.15)",borderColor:C.gold,color:C.gold}}>
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {results&&!loading&&(
          <div className="px-5 pb-5 pt-3 border-t flex gap-3 shrink-0" style={{borderColor:C.border}}>
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Close</button>
            <button onClick={()=>onApplyAll(results)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
              ✅ Apply All {results.length}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}:{onLogin:()=>void}){
  const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [show,setShow]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setLoading(true);setErr("");
    const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    if(r.ok){onLogin();}else{const d=await r.json();setErr(d.error||"Incorrect password");}
    setLoading(false);
  }
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.teal} 50%,${C.tealMid} 100%)`}}>
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:"repeating-linear-gradient(45deg,#c9a84c 0,#c9a84c 1px,transparent 0,transparent 50%)",backgroundSize:"20px 20px"}}/>
      <div className="relative flex flex-col items-center w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/its_logo.png" alt="Anjuman e Imadi" className="w-24 h-24 object-cover rounded-full border-4 mb-4 mx-auto" style={{borderColor:C.gold,background:"#000"}}/>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight}}>Anjuman e Imadi</h1>
          <h2 className="text-xl font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.gold}}>Sugarland TX</h2>
          <p className="mt-1 tracking-widest text-xs uppercase" style={{color:C.goldPale,opacity:0.7}}>Procurement Portal · NGO</p>
        </div>
        <div className="w-full rounded-2xl shadow-2xl border p-6 sm:p-8" style={{background:C.teal,borderColor:C.borderGold}}>
          <div className="rounded-lg px-4 py-2 mb-5" style={{background:C.navy,borderLeft:`4px solid ${C.gold}`}}>
            <span style={{color:C.gold}} className="text-sm font-semibold uppercase tracking-wider">🔐 Secure Access</span>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{color:C.gold}}>Password</label>
              <div className="relative">
                <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl pr-12 text-sm focus:outline-none"
                  style={{background:C.navy,border:`2px solid ${C.border}`,color:C.white}} placeholder="Enter password" autoFocus
                  onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/>
                <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-3 text-lg" style={{color:C.gold}}>{show?"🙈":"👁️"}</button>
              </div>
            </div>
            {err&&<div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{background:"rgba(176,48,48,0.2)",border:"1px solid #b03030",color:"#f5a0a0"}}>⚠️ {err}</div>}
            <button type="submit" disabled={loading||!pw} className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
              {loading?"Verifying…":"Enter Portal →"}
            </button>
          </form>
        </div>
        <p className="mt-5 text-xs text-center" style={{color:C.gold,opacity:0.5}}>Anjuman e Imadi Sugarland TX · its52.com</p>
      </div>
    </div>
  );
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function ItemModal({item,onSave,onClose}:{item:Partial<Item>|null;onSave:(d:any)=>void;onClose:()=>void}){
  const [form,setForm]=useState<any>(item?{...item,price:item.price??""}: {name:"",dept:"",qty:1,unit:"",price:"",priority:"Medium",vendor:"TBD",status:"Needed",link:"",notes:""});
  const [saving,setSaving]=useState(false);
  const f=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}));
  async function submit(e:React.FormEvent){e.preventDefault();if(!form.name||!form.dept)return;setSaving(true);await onSave({...form,price:form.price===""?null:parseFloat(form.price),qty:parseInt(form.qty)||1});setSaving(false);}
  const inp:React.CSSProperties={background:C.navy,border:`2px solid ${C.border}`,color:C.white,width:"100%",padding:"0.6rem 0.85rem",borderRadius:"0.625rem",fontSize:"0.875rem",outline:"none",fontFamily:"inherit"};
  const fo=(e:any)=>(e.target.style.borderColor=C.gold);
  const fb=(e:any)=>(e.target.style.borderColor=C.border);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(10,25,35,0.88)"}}>
      <div className="rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border overflow-y-auto" style={{background:C.teal,borderColor:C.borderGold,maxHeight:"92vh"}}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{borderColor:C.border}}>
          <span className="text-lg font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight}}>{item?.id?"Edit Item":"Add New Item"}</span>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-xl" style={{color:C.gold,background:"rgba(201,168,76,0.1)"}}>×</button>
        </div>
        <form onSubmit={submit} className="p-5 grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="lbl">Item Name *</label><input style={inp} value={form.name} onChange={e=>f("name",e.target.value)} placeholder="e.g. Trash bags…" required onFocus={fo} onBlur={fb}/></div>
          <div><label className="lbl">Department *</label><select style={inp} value={form.dept} onChange={e=>f("dept",e.target.value)} required><option value="">Select…</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label className="lbl">Priority</label><select style={inp} value={form.priority} onChange={e=>f("priority",e.target.value)}>{["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label className="lbl">Quantity</label><input style={inp} type="number" min="1" value={form.qty} onChange={e=>f("qty",e.target.value)} onFocus={fo} onBlur={fb}/></div>
          <div><label className="lbl">Unit</label><input style={inp} value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="pcs, boxes…" onFocus={fo} onBlur={fb}/></div>
          <div><label className="lbl">Vendor</label>
            <select style={inp} value={form.vendor} onChange={e=>f("vendor",e.target.value)}>{VENDORS.map(v=><option key={v}>{v}</option>)}</select>
            {form.vendor&&form.vendor!=="TBD"&&<p className="text-xs mt-1" style={{color:C.goldLight}}>💡 {PRICE_HINTS[form.vendor]}</p>}
          </div>
          <div><label className="lbl">Est. Unit Price ($)</label><input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={e=>f("price",e.target.value)} placeholder="0.00" onFocus={fo} onBlur={fb}/></div>
          <div><label className="lbl">Status</label><select style={inp} value={form.status} onChange={e=>f("status",e.target.value)}>{["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="col-span-2"><label className="lbl">Product Link (URL)</label><input style={inp} type="url" value={form.link} onChange={e=>f("link",e.target.value)} placeholder="https://…" onFocus={fo} onBlur={fb}/></div>
          <div className="col-span-2"><label className="lbl">Notes</label><input style={inp} value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="Special instructions…" onFocus={fo} onBlur={fb}/></div>
          <div className="col-span-2 flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border" style={{background:"transparent",borderColor:C.border,color:C.goldPale}}>Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>{saving?"Saving…":"Save Item"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SIDEBAR CONTENT ──────────────────────────────────────────────────────────
function SidebarContent({items,deptFilter,setDeptFilter,vendorFilter,setVendorFilter,onAIDept,onClose}:{
  items:Item[];deptFilter:string;setDeptFilter:(d:string)=>void;
  vendorFilter:string;setVendorFilter:(v:string)=>void;
  onAIDept:(d:string)=>void;onClose?:()=>void;
}){
  function selectDept(d:string){setDeptFilter(d);onClose&&onClose();}
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4">
      {/* Departments */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-4 h-0.5 rounded" style={{background:C.gold}}/>
          <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>Departments</p>
        </div>
        <button onClick={()=>selectDept("All")} className="w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 text-sm border"
          style={deptFilter==="All"?{background:C.gold,color:C.navy,fontWeight:700,borderColor:C.gold}:{background:"transparent",color:"#d4e8f0",borderColor:"transparent"}}>
          <span>🏠</span><span className="flex-1">All Departments</span>
          <span className="text-xs rounded-full px-1.5 py-0.5" style={deptFilter==="All"?{background:C.navy,color:C.gold}:{background:"rgba(255,255,255,0.1)",color:"#a0bcc8"}}>{items.length}</span>
        </button>
        {DEPTS.map(d=>{
          const count=items.filter(i=>i.dept===d).length;
          const isActive=deptFilter===d;
          return (
            <div key={d} className="flex items-center gap-1 mb-0.5 group">
              <button onClick={()=>selectDept(d)} className="flex-1 text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm border"
                style={isActive?{background:C.gold,color:C.navy,fontWeight:700,borderColor:C.gold}:{background:"transparent",color:"#d4e8f0",borderColor:"transparent"}}>
                <span>{DEPT_ICONS[d]}</span>
                <span className="flex-1 truncate text-xs">{d}</span>
                <span className="text-xs rounded-full px-1.5 py-0.5 shrink-0" style={isActive?{background:C.navy,color:C.gold}:{background:"rgba(255,255,255,0.1)",color:"#a0bcc8"}}>{count}</span>
              </button>
              <button onClick={()=>onAIDept(d)} title={`AI analyze ${d}`}
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs border opacity-40 group-hover:opacity-100 transition-opacity"
                style={{background:C.navy,borderColor:C.border,color:C.gold}}>
                🤖
              </button>
            </div>
          );
        })}
      </div>
      {/* Vendors */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="w-4 h-0.5 rounded" style={{background:C.gold}}/>
          <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>Vendors</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All",...VENDORS].map(v=>(
            <button key={v} onClick={()=>setVendorFilter(v)} className="text-xs px-2.5 py-1 rounded-full border"
              style={vendorFilter===v?{background:C.gold,color:C.navy,borderColor:C.gold,fontWeight:700}:{background:"transparent",color:"#c0d8e4",borderColor:C.border}}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {/* AI tip */}
      <div className="rounded-xl p-3 border mt-auto" style={{background:"rgba(201,168,76,0.07)",borderColor:C.borderGold}}>
        <div className="text-xs font-bold mb-1" style={{color:C.gold}}>🤖 AI Tip</div>
        <div className="text-xs" style={{color:"#8ab0c0"}}>Tap <strong style={{color:C.gold}}>🤖</strong> next to any department for AI cheapest vendor analysis with shop links.</div>
      </div>
    </div>
  );
}

// ── ITEM CARD (mobile) ───────────────────────────────────────────────────────
function ItemCard({item,onEdit,onDelete,onAI,onQuickStatus,aiLoading}:{
  item:Item;onEdit:()=>void;onDelete:()=>void;onAI:()=>void;
  onQuickStatus:(s:Status)=>void;aiLoading:boolean;
}){
  const rowTotal=totalCost(item);
  const pBg=item.priority==="High"?"#fee2e2":item.priority==="Medium"?"#fef3c7":"#dcfce7";
  const pColor=item.priority==="High"?"#991b1b":item.priority==="Medium"?"#92400e":"#166534";
  const linkUrl=item.link||(item.vendor&&item.vendor!=="TBD"?vendorSearchLink(item.vendor,item.name):null);
  return (
    <div className="rounded-xl border overflow-hidden mb-2" style={{background:C.white,borderColor:"#d8e8f0"}}>
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{color:C.navy}}>{item.name}</div>
            {item.notes&&<div className="text-xs mt-0.5 truncate" style={{color:"#6a8a9a"}}>{item.notes}</div>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={onAI} disabled={aiLoading} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border"
              style={{background:C.navy,borderColor:C.gold,color:C.gold}}>
              {aiLoading?<span style={{animation:"spin 1s linear infinite",display:"inline-block",fontSize:"0.7rem"}}>⟳</span>:"🤖"}
            </button>
            <button onClick={onEdit} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border" style={{borderColor:"#b8d8e8",color:C.tealMid,background:"#eef4f8"}}>✏️</button>
            <button onClick={onDelete} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm border" style={{borderColor:"#f5c0b8",color:"#b03030",background:"#fef2f2"}}>✕</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-xs px-2 py-0.5 rounded-full border" style={{background:"#e8f4f8",color:C.tealMid,borderColor:"#b8d8e8"}}>{item.dept}</span>
          <span className="text-xs px-2 py-0.5 rounded-full border font-semibold" style={{background:pBg,color:pColor,borderColor:pBg}}>{item.priority}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VENDOR_COLORS[item.vendor]||""}`}>{item.vendor}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span style={{color:"#8ab0c0"}}>{item.qty}{item.unit?" "+item.unit:""} × {fmt(item.price)}</span>
            {rowTotal>0&&<span className="ml-2 font-bold" style={{color:C.tealMid}}>= {fmt(rowTotal)}</span>}
          </div>
          <select value={item.status} onChange={e=>onQuickStatus(e.target.value as Status)}
            className="text-xs px-2 py-1 rounded-lg border focus:outline-none cursor-pointer font-medium"
            style={{background:item.status==="Procured"?"#dcfce7":item.status==="In Progress"?"#fef3c7":"#f1f5f9",
              color:item.status==="Procured"?"#166534":item.status==="In Progress"?"#92400e":"#64748b",
              borderColor:"transparent"}}>
            {["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
        {linkUrl&&(
          <a href={linkUrl} target="_blank" rel="noopener" className="mt-2 flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-xs border"
            style={{borderColor:"#b8d8e8",color:C.tealMid,background:"#eef4f8"}}>
            {item.link?"🔗 View Product":"🔍 Search on "+item.vendor}
          </a>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────
function ProcurementApp({onLogout}:{onLogout:()=>void}){
  const [items,setItems]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"list"|"summary">("list");
  const [deptFilter,setDeptFilter]=useState("All");
  const [vendorFilter,setVendorFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState<Partial<Item>|null|"new">(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [aiSingleResult,setAiSingleResult]=useState<{result:AISingle;item:Item}|null>(null);
  const [aiLoading,setAiLoading]=useState<string|null>(null);
  const [deptAI,setDeptAI]=useState<{dept:string;results:AIBulk[]|null;loading:boolean;error:string|null}|null>(null);
  const overlayRef=useRef<HTMLDivElement>(null);

  const load=useCallback(async()=>{setLoading(true);const r=await fetch("/api/items");if(r.ok)setItems(await r.json());setLoading(false);},[]);
  useEffect(()=>{load();},[load]);

  async function saveItem(data:any){
    if(data.id){await fetch(`/api/items/${data.id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});}
    else{await fetch("/api/items",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});}
    setModal(null);load();
  }
  async function deleteItem(id:string){if(!confirm("Remove this item?"))return;await fetch(`/api/items/${id}`,{method:"DELETE"});load();}
  async function quickUpdate(id:string,patch:Partial<Item>){
    await fetch(`/api/items/${id}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});
    setItems(prev=>prev.map(i=>i.id===id?{...i,...patch}:i));
  }

  async function aiAnalyzeSingle(item:Item){
    setAiLoading(item.id);
    const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:[item],mode:"single"})});
    const d=await r.json();
    if(d.result)setAiSingleResult({result:d.result,item});
    else alert("AI error: "+d.error);
    setAiLoading(null);
  }
  async function aiApplySingle(vendor:string,price:number){
    if(!aiSingleResult)return;
    await quickUpdate(aiSingleResult.item.id,{vendor:vendor as Vendor,price});
    setAiSingleResult(null);
  }
  async function aiAnalyzeDept(dept:string){
    const deptItems=items.filter(i=>i.dept===dept);
    if(!deptItems.length){alert(`No items in ${dept} yet.`);return;}
    setDeptAI({dept,results:null,loading:true,error:null});
    const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:deptItems,mode:"dept",dept})});
    const d=await r.json();
    if(d.result){setDeptAI({dept,results:Array.isArray(d.result)?d.result:[d.result],loading:false,error:null});}
    else{setDeptAI({dept,results:null,loading:false,error:d.error||"Unknown error"});}
  }
  async function aiApplyOne(r:AIBulk){
    const item=items.find(i=>i.name===r.itemName||i.name.toLowerCase()===r.itemName.toLowerCase());
    if(item)await quickUpdate(item.id,{vendor:r.recommendedVendor as Vendor,price:r.estimatedPrice});
  }
  async function aiApplyAll(results:AIBulk[]){
    for(const r of results)await aiApplyOne(r);
    setDeptAI(null);load();
  }

  const filtered=items.filter(i=>{
    if(deptFilter!=="All"&&i.dept!==deptFilter)return false;
    if(vendorFilter!=="All"&&i.vendor!==vendorFilter)return false;
    if(search&&!i.name.toLowerCase().includes(search.toLowerCase())&&!i.dept.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const grandTotal=items.reduce((s,i)=>s+totalCost(i),0);

  return (
    <div className="min-h-screen" style={{background:C.cream}}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 shadow-lg" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Mobile hamburger */}
          <button className="sm:hidden flex flex-col gap-1.5 p-1.5 rounded-lg" style={{background:"rgba(201,168,76,0.1)"}} onClick={()=>setSidebarOpen(s=>!s)}>
            <span className="block w-5 h-0.5 rounded" style={{background:C.gold}}/>
            <span className="block w-5 h-0.5 rounded" style={{background:C.gold}}/>
            <span className="block w-5 h-0.5 rounded" style={{background:C.gold}}/>
          </button>
          <img src="/its_logo.png" alt="Logo" className="w-9 h-9 rounded-full border-2 object-cover" style={{borderColor:C.gold,background:"#000"}}/>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold leading-tight truncate" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight,fontSize:"1rem"}}>Anjuman e Imadi <span className="hidden sm:inline">· Sugarland TX</span></h1>
            <p className="text-xs tracking-wider uppercase hidden sm:block" style={{color:C.gold,opacity:0.7}}>Procurement Portal</p>
          </div>
          <div className="hidden md:flex gap-3">
            {[["📦",items.length,"Items"],["💰",grandTotal>0?fmt(grandTotal):"$0","Budget"],["✅",items.filter(i=>i.status==="Procured").length,"Done"]].map(([ic,v,l])=>(
              <div key={String(l)} className="text-center px-2 py-1 rounded-lg" style={{background:"rgba(201,168,76,0.1)",border:`1px solid ${C.borderGold}`}}>
                <div className="font-bold text-sm leading-tight" style={{color:C.goldLight}}>{String(ic)} {String(v)}</div>
                <div className="text-xs uppercase tracking-wider" style={{color:C.gold,opacity:0.7}}>{String(l)}</div>
              </div>
            ))}
          </div>
          {/* Mobile stats - compact */}
          <div className="flex md:hidden gap-2 text-xs" style={{color:C.goldLight}}>
            <span className="font-bold">{items.length} items</span>
            {grandTotal>0&&<span style={{color:C.gold}}>{fmt(grandTotal)}</span>}
          </div>
          <button onClick={onLogout} className="text-xs px-2.5 py-1.5 rounded-lg border hidden sm:block" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Sign Out</button>
        </div>
      </header>

      <div className="flex relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen&&(
          <div ref={overlayRef} className="fixed inset-0 z-30 sm:hidden" style={{background:"rgba(10,25,35,0.7)"}} onClick={()=>setSidebarOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-72 border-r overflow-hidden" style={{background:C.teal,borderColor:C.border}} onClick={e=>e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{borderColor:C.border,background:C.navy}}>
                <span className="text-sm font-bold" style={{color:C.gold}}>Departments & Vendors</span>
                <button onClick={()=>setSidebarOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{color:C.gold,background:"rgba(201,168,76,0.1)"}}>×</button>
              </div>
              <SidebarContent items={items} deptFilter={deptFilter} setDeptFilter={setDeptFilter}
                vendorFilter={vendorFilter} setVendorFilter={setVendorFilter}
                onAIDept={aiAnalyzeDept} onClose={()=>setSidebarOpen(false)}/>
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="hidden sm:flex flex-col w-64 shrink-0 border-r" style={{background:C.teal,borderColor:C.border,minHeight:"calc(100vh - 65px)"}}>
          <SidebarContent items={items} deptFilter={deptFilter} setDeptFilter={setDeptFilter}
            vendorFilter={vendorFilter} setVendorFilter={setVendorFilter} onAIDept={aiAnalyzeDept}/>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-x-hidden">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {(["list","summary"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold border"
                style={tab===t?{background:C.gold,color:C.navy,borderColor:C.gold}:{background:"transparent",borderColor:C.border,color:"#8ab0c0"}}>
                {t==="list"?"📋 Items":"📊 Summary"}
              </button>
            ))}
          </div>

          {tab==="list"&&(
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg min-w-0" style={{background:C.teal,borderLeft:`4px solid ${C.gold}`}}>
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wide truncate" style={{fontFamily:"'Playfair Display',serif",color:C.gold}}>
                    {deptFilter==="All"?"All Departments":deptFilter}
                  </h2>
                  {deptFilter!=="All"&&(
                    <button onClick={()=>aiAnalyzeDept(deptFilter)} className="shrink-0 px-2 py-1 rounded-lg text-xs font-bold border flex items-center gap-1"
                      style={{background:C.navy,borderColor:C.gold,color:C.gold}}>
                      🤖
                    </button>
                  )}
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…"
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none w-32 sm:w-44"
                  style={{background:C.teal,border:`2px solid ${C.border}`,color:"#e0f0f8"}}
                  onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/>
                <button onClick={()=>setModal("new")} className="px-3 sm:px-4 py-2 rounded-lg text-sm font-bold shadow whitespace-nowrap"
                  style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
                  + Add
                </button>
              </div>

              {/* Department AI banner — shown when dept selected */}
              {deptFilter!=="All"&&(
                <div className="mb-4 rounded-xl border overflow-hidden" style={{borderColor:C.borderGold}}>
                  <div className="px-4 py-3 flex items-center justify-between gap-3" style={{background:`linear-gradient(135deg,${C.navy},${C.tealMid})`,borderBottom:`2px solid ${C.gold}`}}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{DEPT_ICONS[deptFilter]}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>AI Vendor Intelligence</div>
                        <div className="text-xs truncate" style={{color:"#6a8a9a"}}>Find cheapest vendors for all {deptFilter} items</div>
                      </div>
                    </div>
                    <button onClick={()=>aiAnalyzeDept(deptFilter)}
                      className="shrink-0 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 border"
                      style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderColor:C.gold,color:C.gold}}>
                      🤖 <span className="hidden sm:inline">Find Cheapest</span>
                      <span className="text-xs opacity-60">({items.filter(i=>i.dept===deptFilter).length})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MOBILE: Card view */}
              <div className="sm:hidden">
                {loading?(
                  <div className="text-center py-12" style={{color:"#8ab0c0"}}>Loading…</div>
                ):filtered.length===0?(
                  <div className="text-center py-12" style={{color:"#8ab0c0"}}>
                    <div className="text-4xl mb-3">📦</div>
                    <div>No items. Tap <strong style={{color:C.gold}}>+ Add</strong></div>
                  </div>
                ):filtered.map(item=>(
                  <ItemCard key={item.id} item={item}
                    onEdit={()=>setModal(item)}
                    onDelete={()=>deleteItem(item.id)}
                    onAI={()=>aiAnalyzeSingle(item)}
                    onQuickStatus={s=>quickUpdate(item.id,{status:s})}
                    aiLoading={aiLoading===item.id}/>
                ))}
              </div>

              {/* DESKTOP: Table view */}
              <div className="hidden sm:block rounded-xl border overflow-hidden shadow-lg" style={{borderColor:C.border}}>
                <div className="px-4 py-2 flex items-center justify-between" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{filtered.length} item{filtered.length!==1?"s":""}</span>
                  <span className="text-xs" style={{color:"#6a8a9a"}}>🤖 = AI price analysis + shop links</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{minWidth:"900px",background:C.white}}>
                    <thead>
                      <tr style={{background:`linear-gradient(135deg,${C.teal},${C.tealMid})`}}>
                        {["Item","Dept","Qty","Unit Price","Total","Priority","Vendor","AI","Link","Status",""].map(h=>(
                          <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap" style={{color:C.gold,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading?(
                        <tr><td colSpan={11} className="text-center py-16" style={{color:"#8ab0c0"}}>Loading…</td></tr>
                      ):filtered.length===0?(
                        <tr><td colSpan={11} className="text-center py-16" style={{color:"#8ab0c0"}}>
                          <div className="text-5xl mb-3">📦</div>
                          <div>No items. Click <strong style={{color:C.gold}}>+ Add</strong></div>
                        </td></tr>
                      ):filtered.map((item,idx)=>{
                        const rowTotal=totalCost(item);
                        const pBg=item.priority==="High"?"#fee2e2":item.priority==="Medium"?"#fef3c7":"#dcfce7";
                        const pColor=item.priority==="High"?"#991b1b":item.priority==="Medium"?"#92400e":"#166534";
                        const sBg=item.status==="Procured"?"#dcfce7":item.status==="In Progress"?"#fef3c7":"#f1f5f9";
                        const sColor=item.status==="Procured"?"#166534":item.status==="In Progress"?"#92400e":"#64748b";
                        const linkUrl=item.link||(item.vendor&&item.vendor!=="TBD"?vendorSearchLink(item.vendor,item.name):null);
                        const isAnalyzing=aiLoading===item.id;
                        return (
                          <tr key={item.id} style={{background:idx%2===0?C.white:"#f9fbfc",borderTop:"1px solid #e8f0f4"}}
                            onMouseEnter={e=>(e.currentTarget.style.background=C.goldPale)}
                            onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?C.white:"#f9fbfc")}>
                            <td className="px-3 py-3"><div className="font-semibold text-sm" style={{color:C.navy}}>{item.name}</div>{item.notes&&<div className="text-xs mt-0.5 truncate max-w-[140px]" style={{color:"#6a8a9a"}}>{item.notes}</div>}</td>
                            <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full border whitespace-nowrap" style={{background:"#e8f4f8",color:C.tealMid,borderColor:"#b8d8e8"}}>{item.dept}</span></td>
                            <td className="px-3 py-3"><input type="number" defaultValue={item.qty} min="1" onBlur={e=>quickUpdate(item.id,{qty:parseInt(e.target.value)||1})} className="w-12 text-center border rounded-lg px-1 py-1 text-sm focus:outline-none" style={{background:"#eef4f8",borderColor:"#b8d8e8",color:C.navy}}/></td>
                            <td className="px-3 py-3 text-sm" style={{color:"#4a6a7a"}}>{fmt(item.price)}</td>
                            <td className="px-3 py-3 text-sm font-bold" style={{color:rowTotal>0?C.tealMid:"#aaa"}}>{rowTotal>0?fmt(rowTotal):"—"}</td>
                            <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full border font-semibold" style={{background:pBg,color:pColor,borderColor:pBg}}>{item.priority}</span></td>
                            <td className="px-3 py-3"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${VENDOR_COLORS[item.vendor]||""}`}>{item.vendor}</span></td>
                            <td className="px-3 py-3">
                              <button onClick={()=>aiAnalyzeSingle(item)} disabled={!!aiLoading}
                                className="text-xs px-2 py-1 rounded-lg border font-bold disabled:opacity-40 flex items-center"
                                style={{background:isAnalyzing?"rgba(201,168,76,0.2)":C.navy,borderColor:C.gold,color:C.gold}}>
                                {isAnalyzing?<span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span>:"🤖"}
                              </button>
                            </td>
                            <td className="px-3 py-3">{linkUrl?<a href={linkUrl} target="_blank" rel="noopener" className="text-xs px-2 py-1 rounded-lg border whitespace-nowrap" style={{color:C.tealMid,borderColor:"#b8d8e8",background:"#eef4f8"}}>{item.link?"🔗 View":"🔍 Search"}</a>:<span style={{color:"#ccc",fontSize:"0.75rem"}}>—</span>}</td>
                            <td className="px-3 py-3">
                              <select value={item.status} onChange={e=>quickUpdate(item.id,{status:e.target.value as Status})} className="text-xs px-2 py-1 rounded-lg border focus:outline-none cursor-pointer font-medium" style={{background:sBg,color:sColor,borderColor:sBg}}>
                                {["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <button onClick={()=>setModal(item)} className="border rounded-lg px-2 py-1 text-xs mr-1" style={{borderColor:"#b8d8e8",color:C.tealMid,background:"#eef4f8"}}>✏️</button>
                              <button onClick={()=>deleteItem(item.id)} className="border rounded-lg px-2 py-1 text-xs" style={{borderColor:"#f5c0b8",color:"#b03030",background:"#fef2f2"}}>✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab==="summary"&&<SummaryTab items={items} grandTotal={grandTotal} onAnalyzeDept={aiAnalyzeDept}/>}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 sm:hidden border-t z-20" style={{background:C.navy,borderColor:C.border}}>
        <div className="flex">
          <button onClick={()=>setSidebarOpen(true)} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <span className="text-lg">☰</span>
            <span className="text-xs" style={{color:C.gold}}>Depts</span>
          </button>
          <button onClick={()=>setTab("list")} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <span className="text-lg">📋</span>
            <span className="text-xs" style={{color:tab==="list"?C.gold:"#6a8a9a"}}>Items</span>
          </button>
          <button onClick={()=>setModal("new")} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <span className="text-xl font-bold" style={{color:C.gold}}>+</span>
            <span className="text-xs" style={{color:C.gold}}>Add</span>
          </button>
          <button onClick={()=>setTab("summary")} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <span className="text-lg">📊</span>
            <span className="text-xs" style={{color:tab==="summary"?C.gold:"#6a8a9a"}}>Summary</span>
          </button>
          <button onClick={onLogout} className="flex-1 py-3 flex flex-col items-center gap-0.5">
            <span className="text-lg">🔓</span>
            <span className="text-xs" style={{color:"#6a8a9a"}}>Out</span>
          </button>
        </div>
      </div>

      {/* Padding for mobile bottom nav */}
      <div className="h-16 sm:hidden"/>

      {modal&&<ItemModal item={modal==="new"?{}:modal} onSave={saveItem} onClose={()=>setModal(null)}/>}
      {aiSingleResult&&<AISinglePopup result={aiSingleResult.result} itemName={aiSingleResult.item.name} onClose={()=>setAiSingleResult(null)} onApply={aiApplySingle}/>}
      {deptAI&&<DeptAIPanel dept={deptAI.dept} results={deptAI.results} loading={deptAI.loading} error={deptAI.error} onClose={()=>setDeptAI(null)} onApplyOne={aiApplyOne} onApplyAll={aiApplyAll}/>}

      <style>{`
        .lbl{display:block;font-size:0.72rem;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.35rem;}
        select option{background:${C.navy};color:${C.white};}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}

// ── SUMMARY TAB ──────────────────────────────────────────────────────────────
function SummaryTab({items,grandTotal,onAnalyzeDept}:{items:Item[];grandTotal:number;onAnalyzeDept:(d:string)=>void}){
  const procured=items.filter(i=>i.status==="Procured").length;
  const inProgress=items.filter(i=>i.status==="In Progress").length;
  const needed=items.filter(i=>i.status==="Needed").length;
  const highPri=items.filter(i=>i.priority==="High").length;
  const priced=items.filter(i=>i.price).length;
  const f=(n:number)=>`$${n.toFixed(2)}`;
  const VENDORS_LIST:Vendor[]=["Amazon","Costco","Sam's Club","Walmart Business","Restaurant Depot","Home Depot","Best Buy","Target","Uline","TBD"];
  const vData=VENDORS_LIST.map(v=>({v,count:items.filter(i=>i.vendor===v).length,cost:items.filter(i=>i.vendor===v).reduce((s,i)=>s+(i.price&&i.qty?i.price*i.qty:0),0)})).filter(x=>x.count>0);
  const maxCount=Math.max(...vData.map(x=>x.count),1);
  function exportCSV(){
    const rows=[["Item","Dept","Qty","Unit","Unit Price","Total","Priority","Vendor","Status","Link","Notes"],...items.map(i=>[i.name,i.dept,i.qty,i.unit,i.price??"",(i.price&&i.qty)?i.price*i.qty:"",i.priority,i.vendor,i.status,i.link,i.notes])];
    const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="anjuman_procurement.csv";a.click();
  }
  const SH=({title}:{title:string})=>(
    <div className="px-4 py-2" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{title}</span>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[["Total",items.length,C.goldLight],["Budget",grandTotal>0?f(grandTotal):"$0",C.gold],["Procured",procured,"#4ade80"],["In Progress",inProgress,"#fbbf24"],["Needed",needed,"#94a3b8"],["High Pri",highPri,"#f87171"]].map(([label,val,color])=>(
          <div key={String(label)} className="rounded-xl border shadow-sm overflow-hidden" style={{background:C.white,borderColor:"#d8e8f0"}}>
            <div className="px-3 py-1.5" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{String(label)}</p>
            </div>
            <div className="px-3 py-3">
              <p className="text-xl sm:text-2xl font-bold" style={{color:String(color)}}>{String(val)}</p>
              {String(label)==="Budget"&&<p className="text-xs mt-0.5" style={{color:"#8ab0c0"}}>{priced}/{items.length} priced</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="Budget by Department — Tap 🤖 for AI Analysis"/>
        <div className="bg-white divide-y divide-slate-100">
          {DEPTS.filter(d=>items.some(i=>i.dept===d)).map(d=>{
            const cost=items.filter(i=>i.dept===d).reduce((s,i)=>s+(i.price&&i.qty?i.price*i.qty:0),0);
            const count=items.filter(i=>i.dept===d).length;
            const pct=grandTotal>0?Math.round(cost/grandTotal*100):0;
            return (
              <div key={d} className="flex items-center gap-3 px-4 py-3">
                <span className="text-base">{DEPT_ICONS[d]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium truncate" style={{color:C.navy}}>{d} <span style={{color:"#8ab0c0",fontSize:"0.7rem"}}>({count})</span></span>
                    <span className="font-bold text-sm ml-2 shrink-0" style={{color:cost>0?C.tealMid:"#aaa"}}>{cost>0?f(cost):"—"}</span>
                  </div>
                  {cost>0&&<div className="h-1.5 rounded-full overflow-hidden" style={{background:"#eef4f8"}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:`linear-gradient(90deg,${C.tealMid},${C.gold})`}}/>
                  </div>}
                </div>
                <button onClick={()=>onAnalyzeDept(d)} className="shrink-0 px-2 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1"
                  style={{background:C.navy,borderColor:C.gold,color:C.gold}}>🤖</button>
              </div>
            );
          })}
          <div className="flex justify-between items-center px-4 py-3 border-t-2" style={{borderColor:C.gold}}>
            <span className="font-bold text-sm" style={{color:C.navy}}>Total Estimate</span>
            <span className="text-lg sm:text-xl font-bold" style={{color:C.tealMid}}>{grandTotal>0?f(grandTotal):"$0.00"}</span>
          </div>
        </div>
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="By Vendor"/>
        <div className="bg-white p-4 space-y-3">
          {vData.map(({v,count,cost})=>(
            <div key={v} className="flex items-center gap-3">
              <div className="w-24 sm:w-36 text-xs sm:text-sm font-medium truncate" style={{color:C.navy}}>{v}</div>
              <div className="flex-1 rounded-full h-2" style={{background:"#eef4f8"}}><div className="h-2 rounded-full" style={{width:`${Math.round(count/maxCount*100)}%`,background:`linear-gradient(90deg,${C.tealMid},${C.gold})`}}/></div>
              <div className="w-12 text-xs text-right shrink-0" style={{color:"#8ab0c0"}}>{count}</div>
              <div className="w-16 text-xs font-semibold text-right shrink-0" style={{color:C.tealMid}}>{cost>0?f(cost):""}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="Export"/>
        <div className="bg-white p-4"><button onClick={exportCSV} className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{borderColor:C.tealMid,color:C.tealMid}}>⬇ Export CSV</button></div>
      </div>
    </div>
  );
}

export default function Home(){
  const [authed,setAuthed]=useState<boolean|null>(null);
  useEffect(()=>{fetch("/api/items").then(r=>setAuthed(r.ok)).catch(()=>setAuthed(false));},[]);
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});setAuthed(false);}
  if(authed===null)return(
    <div className="min-h-screen flex items-center justify-center" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`}}>
      <img src="/its_logo.png" alt="Loading" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",background:"#000",animation:"spin 2s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(!authed)return<LoginScreen onLogin={()=>setAuthed(true)}/>;
  return<ProcurementApp onLogout={logout}/>;
}
