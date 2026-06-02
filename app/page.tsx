"use client";
import { useState, useEffect, useCallback } from "react";

type Priority = "High"|"Medium"|"Low";
type Status   = "Needed"|"In Progress"|"Procured";
type Vendor   = "Amazon"|"Costco"|"Sam's Club"|"Walmart Business"|"Restaurant Depot"|"Home Depot"|"Best Buy"|"Target"|"Uline"|"TBD";

interface Item {
  id:string;name:string;dept:string;qty:number;unit:string;
  price:number|null;priority:Priority;vendor:Vendor;status:Status;
  link:string;notes:string;createdAt?:string;
}
interface AISingle {
  vendor:string;estimatedPrice:number;savings:string;
  reasoning:string;alternativeVendor:string;alternativePrice:number;tip:string;
}
interface AIBulk {
  itemName:string;recommendedVendor:string;estimatedPrice:number;
  currentPrice:number|null;savingsNote:string;reasoning:string;
}

const DEPTS=["Nazafat","Audio Video","Mawaid Sabeel","Security & Parking","Communication & Help Desk","IT & Security Checking","Najwa Niyaz Team","Tazeen","Atfal","Flow Management","Photography","Medical"] as const;
const DEPT_ICONS:Record<string,string>={"Nazafat":"🧹","Audio Video":"🎬","Mawaid Sabeel":"🍽️","Security & Parking":"🚗","Communication & Help Desk":"📞","IT & Security Checking":"💻","Najwa Niyaz Team":"🎤","Tazeen":"🌸","Atfal":"👶","Flow Management":"🔄","Photography":"📷","Medical":"🏥"};
const VENDORS:Vendor[]=["Amazon","Costco","Sam's Club","Walmart Business","Restaurant Depot","Home Depot","Best Buy","Target","Uline","TBD"];
const VENDOR_SEARCH:Record<string,(q:string)=>string>={
  "Amazon":q=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  "Costco":q=>`https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(q)}`,
  "Sam's Club":q=>`https://www.samsclub.com/s/${encodeURIComponent(q)}`,
  "Walmart Business":q=>`https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  "Restaurant Depot":q=>`https://www.restaurantdepot.com/search?query=${encodeURIComponent(q)}`,
  "Home Depot":q=>`https://www.homedepot.com/s/${encodeURIComponent(q)}`,
  "Best Buy":q=>`https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
  "Target":q=>`https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  "Uline":q=>`https://www.uline.com/BL_3/Search?keywords=${encodeURIComponent(q)}`,
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

const fmt=(n:number|null)=>n!=null?`$${Number(n).toFixed(2)}`:"—";
const totalCost=(i:Item)=>i.price&&i.qty?i.price*i.qty:0;

const C={
  navy:"#0f2d3d",teal:"#1a3d4f",tealMid:"#1e4d63",tealLight:"#235a72",
  gold:"#c9a84c",goldLight:"#e2c97e",goldPale:"#f5ecd0",
  white:"#ffffff",cream:"#f7f5f0",
  border:"#2a5068",borderGold:"rgba(201,168,76,0.35)",red:"#b03030",
};

// ─── AI SINGLE RESULT POPUP ───────────────────────────────────────────────────
function AISinglePopup({result,itemName,onClose,onApply}:{result:AISingle;itemName:string;onClose:()=>void;onApply:(v:string,p:number)=>void}){
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(10,25,35,0.85)"}}>
      <div className="rounded-2xl shadow-2xl w-full max-w-md border" style={{background:C.teal,borderColor:C.borderGold}}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b" style={{borderColor:C.border}}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5" style={{color:C.gold}}>🤖 AI Vendor Analysis</div>
            <div className="text-sm font-semibold" style={{color:C.goldLight}}>{itemName}</div>
          </div>
          <button onClick={onClose} className="text-2xl" style={{color:C.gold}}>×</button>
        </div>
        <div className="p-5 space-y-3">
          {/* Best pick */}
          <div className="rounded-xl p-4 border" style={{background:C.navy,borderColor:C.gold}}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>✅ Best Pick</div>
              <div className="text-lg font-bold" style={{color:"#4ade80"}}>${result.estimatedPrice?.toFixed(2)}</div>
            </div>
            <div className="text-base font-bold mb-1" style={{color:C.white}}>{result.vendor}</div>
            <div className="text-xs" style={{color:C.goldPale}}>{result.savings}</div>
            <div className="text-xs mt-1" style={{color:"#a0c4d4"}}>{result.reasoning}</div>
          </div>
          {/* Alternative */}
          {result.alternativeVendor&&(
            <div className="rounded-xl p-3 border" style={{background:"rgba(255,255,255,0.04)",borderColor:C.border}}>
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{color:"#8ab0c0"}}>🔄 Alternative</div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium" style={{color:C.goldPale}}>{result.alternativeVendor}</span>
                <span className="text-sm font-bold" style={{color:"#fbbf24"}}>${result.alternativePrice?.toFixed(2)}</span>
              </div>
            </div>
          )}
          {/* Tip */}
          {result.tip&&(
            <div className="rounded-xl p-3" style={{background:"rgba(201,168,76,0.1)",border:`1px solid ${C.borderGold}`}}>
              <span className="text-xs" style={{color:C.goldLight}}>💡 {result.tip}</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm border" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Dismiss</button>
            <button onClick={()=>onApply(result.vendor,result.estimatedPrice)} className="flex-1 py-2 rounded-xl text-sm font-bold" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
              Apply to Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI BULK RESULTS PANEL ────────────────────────────────────────────────────
function AIBulkPanel({results,onClose,onApplyAll}:{results:AIBulk[];onClose:()=>void;onApplyAll:(results:AIBulk[])=>void}){
  const totalCurrentEst=results.reduce((s,r)=>s+(r.currentPrice||r.estimatedPrice||0),0);
  const totalAI=results.reduce((s,r)=>s+(r.estimatedPrice||0),0);
  const savings=totalCurrentEst-totalAI;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(10,25,35,0.9)"}}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border" style={{background:C.teal,borderColor:C.borderGold}}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between shrink-0" style={{borderColor:C.border}}>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>🤖 AI Bulk Vendor Analysis</div>
            <div className="text-lg font-bold mt-0.5" style={{color:C.goldLight}}>{results.length} items analyzed by Llama 3.3</div>
          </div>
          <button onClick={onClose} className="text-2xl" style={{color:C.gold}}>×</button>
        </div>
        {/* Savings summary */}
        {savings>0&&(
          <div className="mx-6 mt-4 rounded-xl p-3 flex items-center gap-4 border shrink-0" style={{background:C.navy,borderColor:"rgba(74,222,128,0.4)"}}>
            <span className="text-2xl">💰</span>
            <div>
              <div className="text-xs font-bold uppercase" style={{color:"#4ade80"}}>Potential Savings</div>
              <div className="text-xl font-bold" style={{color:"#4ade80"}}>${savings.toFixed(2)}</div>
            </div>
            <div className="ml-auto text-right text-xs" style={{color:"#a0c4d4"}}>
              <div>AI est. total: <strong style={{color:C.goldLight}}>${totalAI.toFixed(2)}</strong></div>
            </div>
          </div>
        )}
        {/* Results list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {results.map((r,i)=>{
            const saved=r.currentPrice&&r.estimatedPrice?r.currentPrice-r.estimatedPrice:null;
            return (
              <div key={i} className="rounded-xl p-3 border flex items-start gap-3" style={{background:"rgba(255,255,255,0.04)",borderColor:C.border}}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate" style={{color:C.white}}>{r.itemName}</div>
                  <div className="text-xs mt-0.5" style={{color:"#8ab0c0"}}>{r.reasoning}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-bold text-sm" style={{color:C.gold}}>{r.recommendedVendor}</div>
                  <div className="font-bold" style={{color:"#4ade80"}}>${r.estimatedPrice?.toFixed(2)}</div>
                  {saved&&saved>0&&<div className="text-xs" style={{color:"#86efac"}}>saves ${saved.toFixed(2)}</div>}
                </div>
              </div>
            );
          })}
        </div>
        {/* Actions */}
        <div className="px-6 pb-5 pt-3 border-t flex gap-3 shrink-0" style={{borderColor:C.border}}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Dismiss</button>
          <button onClick={()=>onApplyAll(results)} className="flex-1 py-2.5 rounded-xl text-sm font-bold" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
            ✅ Apply All Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({onLogin}:{onLogin:()=>void}){
  const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [loading,setLoading]=useState(false); const [show,setShow]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setErr("");
    const r=await fetch("/api/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password:pw})});
    if(r.ok){onLogin();}else{const d=await r.json();setErr(d.error||"Incorrect password");}
    setLoading(false);
  }
  return (
    <div className="min-h-screen flex items-center justify-center" style={{background:`linear-gradient(160deg,${C.navy} 0%,${C.teal} 50%,${C.tealMid} 100%)`}}>
      <div className="absolute inset-0 opacity-5" style={{backgroundImage:"repeating-linear-gradient(45deg,#c9a84c 0,#c9a84c 1px,transparent 0,transparent 50%)",backgroundSize:"20px 20px"}}/>
      <div className="relative flex flex-col items-center w-full px-4">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 border-4" style={{background:`linear-gradient(135deg,${C.teal},${C.navy})`,borderColor:C.gold}}>
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-4xl font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight}}>Ashara Sugarland</h1>
          <p className="mt-1 tracking-widest text-xs uppercase" style={{color:C.goldPale,opacity:0.7}}>Procurement Management · NGO</p>
        </div>
        <div className="w-full max-w-md rounded-2xl shadow-2xl border p-8" style={{background:C.teal,borderColor:C.borderGold}}>
          <div className="rounded-lg px-4 py-2 mb-6 flex items-center gap-2" style={{background:C.navy,borderLeft:`4px solid ${C.gold}`}}>
            <span style={{color:C.gold}} className="text-sm font-semibold uppercase tracking-wider">🔐 Secure Access</span>
          </div>
          <p className="text-sm mb-5" style={{color:C.goldPale,opacity:0.8}}>Enter your access password to continue</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{color:C.gold}}>Password</label>
              <div className="relative">
                <input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl pr-12 text-sm focus:outline-none"
                  style={{background:C.navy,border:`2px solid ${C.border}`,color:C.white}}
                  placeholder="Enter password" autoFocus
                  onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/>
                <button type="button" onClick={()=>setShow(s=>!s)} className="absolute right-3 top-3 text-lg" style={{color:C.gold}}>{show?"🙈":"👁️"}</button>
              </div>
            </div>
            {err&&<div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{background:"rgba(176,48,48,0.2)",border:"1px solid #b03030",color:"#f5a0a0"}}>⚠️ {err}</div>}
            <button type="submit" disabled={loading||!pw} className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
              {loading?"Verifying…":"Enter Procurement Portal →"}
            </button>
          </form>
        </div>
        <p className="mt-6 text-xs" style={{color:C.gold,opacity:0.5}}>Ashara Sugarland NGO · Confidential · its52.com</p>
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function ItemModal({item,onSave,onClose}:{item:Partial<Item>|null;onSave:(d:any)=>void;onClose:()=>void}){
  const [form,setForm]=useState<any>(item?{...item,price:item.price??""}: {name:"",dept:"",qty:1,unit:"",price:"",priority:"Medium",vendor:"TBD",status:"Needed",link:"",notes:""});
  const [saving,setSaving]=useState(false);
  const f=(k:string,v:any)=>setForm((p:any)=>({...p,[k]:v}));
  async function submit(e:React.FormEvent){
    e.preventDefault(); if(!form.name||!form.dept)return;
    setSaving(true);
    await onSave({...form,price:form.price===""?null:parseFloat(form.price),qty:parseInt(form.qty)||1});
    setSaving(false);
  }
  const inp={background:C.navy,border:`2px solid ${C.border}`,color:C.white,width:"100%",padding:"0.6rem 0.85rem",borderRadius:"0.625rem",fontSize:"0.875rem",outline:"none",fontFamily:"inherit"};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(10,25,35,0.85)"}}>
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border" style={{background:C.teal,borderColor:C.borderGold}}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{borderColor:C.border}}>
          <span className="text-lg font-bold" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight}}>{item?.id?"Edit Item":"Add New Item"}</span>
          <button onClick={onClose} className="text-2xl" style={{color:C.gold}}>×</button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="lbl">Item Name *</label><input style={inp} value={form.name} onChange={e=>f("name",e.target.value)} placeholder="e.g. Trash bags…" required onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div><label className="lbl">Department *</label><select style={inp} value={form.dept} onChange={e=>f("dept",e.target.value)} required><option value="">Select…</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select></div>
          <div><label className="lbl">Priority</label><select style={inp} value={form.priority} onChange={e=>f("priority",e.target.value)}>{["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}</select></div>
          <div><label className="lbl">Quantity</label><input style={inp} type="number" min="1" value={form.qty} onChange={e=>f("qty",e.target.value)} onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div><label className="lbl">Unit</label><input style={inp} value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="pcs, boxes…" onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div><label className="lbl">Vendor</label><select style={inp} value={form.vendor} onChange={e=>f("vendor",e.target.value)}>{VENDORS.map(v=><option key={v}>{v}</option>)}</select>
            {form.vendor&&form.vendor!=="TBD"&&<p className="text-xs mt-1" style={{color:C.goldLight}}>💡 {PRICE_HINTS[form.vendor]}</p>}</div>
          <div><label className="lbl">Est. Unit Price ($)</label><input style={inp} type="number" min="0" step="0.01" value={form.price} onChange={e=>f("price",e.target.value)} placeholder="0.00" onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div><label className="lbl">Status</label><select style={inp} value={form.status} onChange={e=>f("status",e.target.value)}>{["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="col-span-2"><label className="lbl">Product Link (URL)</label><input style={inp} type="url" value={form.link} onChange={e=>f("link",e.target.value)} placeholder="https://…" onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div className="col-span-2"><label className="lbl">Notes</label><input style={inp} value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="Special instructions…" onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/></div>
          <div className="col-span-2 flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm border" style={{background:"transparent",borderColor:C.border,color:C.goldPale}}>Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-60" style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>{saving?"Saving…":"Save Item"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function ProcurementApp({onLogout}:{onLogout:()=>void}){
  const [items,setItems]=useState<Item[]>([]);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState<"list"|"summary">("list");
  const [deptFilter,setDeptFilter]=useState("All");
  const [vendorFilter,setVendorFilter]=useState("All");
  const [search,setSearch]=useState("");
  const [modal,setModal]=useState<Partial<Item>|null|"new">(null);
  const [aiBox,setAiBox]=useState(false);
  // AI state
  const [aiSingleResult,setAiSingleResult]=useState<{result:AISingle;item:Item}|null>(null);
  const [aiBulkResult,setAiBulkResult]=useState<AIBulk[]|null>(null);
  const [aiLoading,setAiLoading]=useState<string|null>(null); // itemId or "bulk"

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

  // AI: analyze single item
  async function aiAnalyzeSingle(item:Item){
    setAiLoading(item.id);
    const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:[item],mode:"single"})});
    const d=await r.json();
    if(d.result)setAiSingleResult({result:d.result,item});
    else alert("AI error: "+d.error);
    setAiLoading(null);
  }

  // AI: apply single result to item
  async function aiApplySingle(vendor:string,price:number){
    if(!aiSingleResult)return;
    await quickUpdate(aiSingleResult.item.id,{vendor:vendor as Vendor,price});
    setAiSingleResult(null);
  }

  // AI: analyze all visible items
  async function aiAnalyzeBulk(){
    const scope=filtered.length>0?filtered:items;
    if(scope.length===0){alert("No items to analyze.");return;}
    setAiLoading("bulk");
    const r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({items:scope,mode:"bulk"})});
    const d=await r.json();
    if(d.result)setAiBulkResult(Array.isArray(d.result)?d.result:[d.result]);
    else alert("AI error: "+d.error);
    setAiLoading(null);
  }

  // AI: apply all bulk results
  async function aiApplyAll(results:AIBulk[]){
    for(const r of results){
      const item=items.find(i=>i.name===r.itemName||i.name.toLowerCase().includes(r.itemName.toLowerCase()));
      if(item&&r.recommendedVendor&&r.estimatedPrice){
        await quickUpdate(item.id,{vendor:r.recommendedVendor as Vendor,price:r.estimatedPrice});
      }
    }
    setAiBulkResult(null);
    load();
  }

  const filtered=items.filter(i=>{
    if(deptFilter!=="All"&&i.dept!==deptFilter)return false;
    if(vendorFilter!=="All"&&i.vendor!==vendorFilter)return false;
    if(search&&!i.name.toLowerCase().includes(search.toLowerCase())&&!i.dept.toLowerCase().includes(search.toLowerCase()))return false;
    return true;
  });
  const grandTotal=items.reduce((s,i)=>s+totalCost(i),0);
  const aiTextSuggest=(()=>{
    const u=items.filter(i=>i.vendor==="TBD");
    if(!u.length)return"✅ All items have vendors assigned!";
    const lines=DEPTS.map(d=>{const ud=items.filter(i=>i.dept===d&&i.vendor==="TBD");return ud.length?`• ${d} (${ud.length} unassigned) → ${VENDOR_RULES[d]?.[0]??"Amazon"}`:null;}).filter(Boolean);
    return`${u.length} items need a vendor:\n${lines.join("\n")}`;
  })();

  return (
    <div className="min-h-screen" style={{background:C.cream}}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 shadow-lg" style={{background:`linear-gradient(135deg,${C.navy} 0%,${C.teal} 100%)`,borderBottom:`2px solid ${C.gold}`}}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 text-xl" style={{background:C.tealMid,borderColor:C.gold}}>🌿</div>
            <div>
              <h1 className="font-bold leading-tight" style={{fontFamily:"'Playfair Display',serif",color:C.goldLight,fontSize:"1.1rem"}}>Ashara Sugarland</h1>
              <p className="text-xs tracking-widest uppercase" style={{color:C.gold,opacity:0.7}}>Procurement Management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-4">
              {[["📦",items.length,"Items"],["💰",grandTotal>0?fmt(grandTotal):"$0","Budget"],["✅",items.filter(i=>i.status==="Procured").length,"Procured"]].map(([ic,v,l])=>(
                <div key={String(l)} className="text-center px-3 py-1 rounded-lg" style={{background:"rgba(201,168,76,0.1)",border:`1px solid ${C.borderGold}`}}>
                  <div className="font-bold text-base leading-tight" style={{color:C.goldLight}}>{String(ic)} {String(v)}</div>
                  <div className="text-xs uppercase tracking-wider" style={{color:C.gold,opacity:0.7}}>{String(l)}</div>
                </div>
              ))}
            </div>
            <button onClick={onLogout} className="text-xs px-3 py-1.5 rounded-lg border" style={{borderColor:C.border,color:C.goldPale,background:"transparent"}}>Sign Out</button>
          </div>
        </div>
      </header>

      <div className="flex" style={{minHeight:"calc(100vh - 65px)"}}>
        {/* SIDEBAR */}
        <aside className="w-64 shrink-0 border-r overflow-y-auto p-4" style={{background:C.teal,borderColor:C.border}}>
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3 px-2"><div className="w-4 h-0.5 rounded" style={{background:C.gold}}/><p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>Departments</p></div>
            {["All",...DEPTS].map(d=>(
              <button key={d} onClick={()=>setDeptFilter(d)} className="w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2 text-sm border"
                style={deptFilter===d?{background:C.gold,color:C.navy,fontWeight:700,borderColor:C.gold}:{background:"transparent",color:"#d4e8f0",borderColor:"transparent"}}>
                <span>{d==="All"?"🏠":DEPT_ICONS[d]}</span>
                <span className="flex-1 truncate">{d}</span>
                <span className="text-xs rounded-full px-1.5 py-0.5" style={deptFilter===d?{background:C.navy,color:C.gold}:{background:"rgba(255,255,255,0.1)",color:"#a0bcc8"}}>
                  {d==="All"?items.length:items.filter(i=>i.dept===d).length}
                </span>
              </button>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3 px-2"><div className="w-4 h-0.5 rounded" style={{background:C.gold}}/><p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>Vendors</p></div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {["All",...VENDORS].map(v=>(
                <button key={v} onClick={()=>setVendorFilter(v)} className="text-xs px-2.5 py-1 rounded-full border"
                  style={vendorFilter===v?{background:C.gold,color:C.navy,borderColor:C.gold,fontWeight:700}:{background:"transparent",color:"#c0d8e4",borderColor:C.border}}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(["list","summary"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} className="px-5 py-2 rounded-lg text-sm font-semibold border"
                style={tab===t?{background:C.gold,color:C.navy,borderColor:C.gold}:{background:"transparent",borderColor:C.border,color:"#8ab0c0"}}>
                {t==="list"?"📋 Item List":"📊 Summary & Budget"}
              </button>
            ))}
          </div>

          {tab==="list"&&(
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <div className="flex-1 flex items-center gap-3 px-4 py-2 rounded-lg" style={{background:C.teal,borderLeft:`4px solid ${C.gold}`}}>
                  <h2 className="text-lg font-bold uppercase tracking-wide" style={{fontFamily:"'Playfair Display',serif",color:C.gold}}>{deptFilter==="All"?"All Departments":deptFilter}</h2>
                </div>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search…"
                  className="px-3 py-2 rounded-lg text-sm focus:outline-none w-40"
                  style={{background:C.teal,border:`2px solid ${C.border}`,color:"#e0f0f8"}}
                  onFocus={e=>(e.target.style.borderColor=C.gold)} onBlur={e=>(e.target.style.borderColor=C.border)}/>
                <button onClick={()=>setAiBox(s=>!s)} className="px-3 py-2 rounded-lg text-sm font-semibold border"
                  style={{background:"transparent",borderColor:C.border,color:"#8ab0c0"}}>
                  📋 Suggest
                </button>
                {/* AI BULK ANALYZE BUTTON */}
                <button onClick={aiAnalyzeBulk} disabled={aiLoading==="bulk"}
                  className="px-4 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 disabled:opacity-60"
                  style={{background:`linear-gradient(135deg,${C.navy},${C.tealMid})`,borderColor:C.gold,color:C.gold}}>
                  {aiLoading==="bulk"?<span className="animate-spin">⟳</span>:"🤖"}
                  {aiLoading==="bulk"?"Analyzing…":"AI Find Cheapest"}
                </button>
                <button onClick={()=>setModal("new")} className="px-4 py-2 rounded-lg text-sm font-bold shadow"
                  style={{background:`linear-gradient(135deg,${C.tealMid},${C.gold})`,color:C.navy}}>
                  + Add Item
                </button>
              </div>

              {aiBox&&(
                <div className="mb-5 p-4 rounded-xl border" style={{background:C.teal,borderLeft:`4px solid ${C.gold}`,borderColor:C.borderGold}}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{color:C.gold}}>📋 Quick Suggestions</p>
                  <pre className="text-sm whitespace-pre-wrap" style={{color:"#c8dde8"}}>{aiTextSuggest}</pre>
                </div>
              )}

              {/* Table */}
              <div className="rounded-xl border overflow-hidden shadow-lg" style={{borderColor:C.border}}>
                <div className="px-4 py-2 flex items-center justify-between" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{filtered.length} item{filtered.length!==1?"s":""}</span>
                  <span className="text-xs" style={{color:"#6a8a9a"}}>Click 🤖 on any row for AI price analysis</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{minWidth:"980px",background:C.white}}>
                    <thead>
                      <tr style={{background:`linear-gradient(135deg,${C.teal},${C.tealMid})`}}>
                        {["Item Name","Department","Qty","Unit Price","Total","Priority","Vendor","AI","Link","Status",""].map(h=>(
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
                          <div>No items. Click <strong style={{color:C.gold}}>+ Add Item</strong></div>
                        </td></tr>
                      ):filtered.map((item,idx)=>{
                        const rowTotal=totalCost(item);
                        const pBg=item.priority==="High"?"#fee2e2":item.priority==="Medium"?"#fef3c7":"#dcfce7";
                        const pColor=item.priority==="High"?"#991b1b":item.priority==="Medium"?"#92400e":"#166534";
                        const sBg=item.status==="Procured"?"#dcfce7":item.status==="In Progress"?"#fef3c7":"#f1f5f9";
                        const sColor=item.status==="Procured"?"#166534":item.status==="In Progress"?"#92400e":"#64748b";
                        const linkUrl=item.link||(item.vendor&&item.vendor!=="TBD"&&VENDOR_SEARCH[item.vendor]?VENDOR_SEARCH[item.vendor](item.name):null);
                        const isAnalyzing=aiLoading===item.id;
                        return (
                          <tr key={item.id} style={{background:idx%2===0?C.white:"#f9fbfc",borderTop:"1px solid #e8f0f4"}}
                            onMouseEnter={e=>(e.currentTarget.style.background=C.goldPale)}
                            onMouseLeave={e=>(e.currentTarget.style.background=idx%2===0?C.white:"#f9fbfc")}>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-sm" style={{color:C.navy}}>{item.name}</div>
                              {item.notes&&<div className="text-xs mt-0.5 truncate max-w-[160px]" style={{color:"#6a8a9a"}}>{item.notes}</div>}
                            </td>
                            <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full border whitespace-nowrap" style={{background:"#e8f4f8",color:C.tealMid,borderColor:"#b8d8e8"}}>{item.dept}</span></td>
                            <td className="px-3 py-3"><input type="number" defaultValue={item.qty} min="1" onBlur={e=>quickUpdate(item.id,{qty:parseInt(e.target.value)||1})} className="w-12 text-center border rounded-lg px-1 py-1 text-sm focus:outline-none" style={{background:"#eef4f8",borderColor:"#b8d8e8",color:C.navy}}/></td>
                            <td className="px-3 py-3 text-sm" style={{color:"#4a6a7a"}}>{fmt(item.price)}</td>
                            <td className="px-3 py-3 text-sm font-bold" style={{color:rowTotal>0?C.tealMid:"#aaa"}}>{rowTotal>0?fmt(rowTotal):"—"}</td>
                            <td className="px-3 py-3"><span className="text-xs px-2 py-1 rounded-full border font-semibold" style={{background:pBg,color:pColor,borderColor:pBg}}>{item.priority}</span></td>
                            <td className="px-3 py-3"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${VENDOR_COLORS[item.vendor]||""}`}>{item.vendor}</span></td>
                            {/* AI BUTTON per row */}
                            <td className="px-3 py-3">
                              <button onClick={()=>aiAnalyzeSingle(item)} disabled={!!aiLoading}
                                className="text-xs px-2 py-1 rounded-lg border font-bold transition disabled:opacity-40"
                                style={{background:isAnalyzing?"rgba(201,168,76,0.2)":C.navy,borderColor:C.gold,color:C.gold,whiteSpace:"nowrap"}}>
                                {isAnalyzing?<span className="animate-spin inline-block">⟳</span>:"🤖"}
                              </button>
                            </td>
                            <td className="px-3 py-3">
                              {linkUrl?<a href={linkUrl} target="_blank" rel="noopener" className="text-xs px-2 py-1 rounded-lg border whitespace-nowrap" style={{color:C.tealMid,borderColor:"#b8d8e8",background:"#eef4f8"}}>{item.link?"🔗 View":"🔍 Search"}</a>:<span style={{color:"#ccc",fontSize:"0.75rem"}}>—</span>}
                            </td>
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

          {tab==="summary"&&<SummaryTab items={items} grandTotal={grandTotal}/>}
        </main>
      </div>

      {modal&&<ItemModal item={modal==="new"?{}:modal} onSave={saveItem} onClose={()=>setModal(null)}/>}
      {aiSingleResult&&<AISinglePopup result={aiSingleResult.result} itemName={aiSingleResult.item.name} onClose={()=>setAiSingleResult(null)} onApply={aiApplySingle}/>}
      {aiBulkResult&&<AIBulkPanel results={aiBulkResult} onClose={()=>setAiBulkResult(null)} onApplyAll={aiApplyAll}/>}

      <style>{`
        .lbl{display:block;font-size:0.72rem;font-weight:700;color:${C.gold};text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.35rem;}
        select option{background:${C.navy};color:${C.white};}
        @keyframes spin{to{transform:rotate(360deg)}}
        .animate-spin{animation:spin 1s linear infinite;display:inline-block;}
      `}</style>
    </div>
  );
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
function SummaryTab({items,grandTotal}:{items:Item[];grandTotal:number}){
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
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="ashara_procurement.csv";a.click();
  }
  const SH=({title}:{title:string})=>(
    <div className="flex items-center gap-3 px-4 py-2 rounded-t-xl" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
      <span className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{title}</span>
    </div>
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[["Total Items",items.length,C.goldLight],["Est. Budget",grandTotal>0?f(grandTotal):"$0.00",C.gold],["Procured",procured,"#4ade80"],["In Progress",inProgress,"#fbbf24"],["Still Needed",needed,"#94a3b8"],["High Priority",highPri,"#f87171"]].map(([label,val,color])=>(
          <div key={String(label)} className="rounded-xl border shadow-sm overflow-hidden" style={{background:C.white,borderColor:"#d8e8f0"}}>
            <div className="px-3 py-1.5" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`,borderBottom:`2px solid ${C.gold}`}}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{color:C.gold}}>{String(label)}</p>
            </div>
            <div className="px-3 py-3">
              <p className="text-2xl font-bold" style={{color:String(color)}}>{String(val)}</p>
              {String(label)==="Est. Budget"&&<p className="text-xs mt-0.5" style={{color:"#8ab0c0"}}>{priced}/{items.length} priced</p>}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="Budget by Department"/>
        <div className="bg-white p-4">
          {DEPTS.filter(d=>items.some(i=>i.dept===d)).map(d=>{
            const cost=items.filter(i=>i.dept===d).reduce((s,i)=>s+(i.price&&i.qty?i.price*i.qty:0),0);
            const count=items.filter(i=>i.dept===d).length;
            return(<div key={d} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{borderColor:"#eef4f8"}}>
              <span className="text-sm" style={{color:C.navy}}>{DEPT_ICONS[d]} {d} <span style={{color:"#8ab0c0",fontSize:"0.75rem"}}>({count})</span></span>
              <span className="font-bold text-sm" style={{color:cost>0?C.tealMid:"#aaa"}}>{cost>0?f(cost):"—"}</span>
            </div>);
          })}
          <div className="flex justify-between items-center pt-3 mt-1 border-t-2" style={{borderColor:C.gold}}>
            <span className="font-bold" style={{color:C.navy}}>Total Estimate</span>
            <span className="text-xl font-bold" style={{color:C.tealMid}}>{grandTotal>0?f(grandTotal):"$0.00"}</span>
          </div>
        </div>
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="Items & Cost by Vendor"/>
        <div className="bg-white p-4 space-y-3">
          {vData.map(({v,count,cost})=>(
            <div key={v} className="flex items-center gap-3">
              <div className="w-36 text-sm font-medium" style={{color:C.navy}}>{v}</div>
              <div className="flex-1 rounded-full h-2" style={{background:"#eef4f8"}}><div className="h-2 rounded-full" style={{width:`${Math.round(count/maxCount*100)}%`,background:`linear-gradient(90deg,${C.tealMid},${C.gold})`}}/></div>
              <div className="w-16 text-xs text-right" style={{color:"#8ab0c0"}}>{count} item{count!==1?"s":""}</div>
              <div className="w-20 text-xs font-semibold text-right" style={{color:C.tealMid}}>{cost>0?f(cost):""}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border shadow-sm overflow-hidden" style={{borderColor:"#d8e8f0"}}><SH title="Export"/>
        <div className="bg-white p-4"><button onClick={exportCSV} className="px-5 py-2.5 rounded-xl text-sm font-semibold border" style={{borderColor:C.tealMid,color:C.tealMid}}>⬇ Export CSV</button></div>
      </div>
    </div>
  );
}

export default function Home(){
  const [authed,setAuthed]=useState<boolean|null>(null);
  useEffect(()=>{fetch("/api/items").then(r=>setAuthed(r.ok)).catch(()=>setAuthed(false));},[]);
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});setAuthed(false);}
  if(authed===null)return(<div className="min-h-screen flex items-center justify-center" style={{background:`linear-gradient(135deg,${C.navy},${C.teal})`}}><div className="text-4xl animate-spin">🌿</div></div>);
  if(!authed)return<LoginScreen onLogin={()=>setAuthed(true)}/>;
  return<ProcurementApp onLogout={logout}/>;
}
