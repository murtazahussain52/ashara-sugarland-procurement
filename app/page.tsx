"use client";
import { useState, useEffect, useCallback } from "react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Priority = "High" | "Medium" | "Low";
type Status = "Needed" | "In Progress" | "Procured";
type Vendor = "Amazon" | "Costco" | "Sam's Club" | "Walmart Business" | "Restaurant Depot" | "Home Depot" | "Best Buy" | "Target" | "Uline" | "TBD";

interface Item {
  id: string;
  name: string;
  dept: string;
  qty: number;
  unit: string;
  price: number | null;
  priority: Priority;
  vendor: Vendor;
  status: Status;
  link: string;
  notes: string;
  createdAt?: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEPTS = ["Nazafat","Audio Video","Mawaid Sabeel","Security & Parking","Communication & Help Desk","IT & Security Checking","Najwa Niyaz Team","Tazeen","Atfal","Flow Management","Photography","Medical"] as const;
const DEPT_ICONS: Record<string, string> = { "Nazafat":"🧹","Audio Video":"🎬","Mawaid Sabeel":"🍽️","Security & Parking":"🚗","Communication & Help Desk":"📞","IT & Security Checking":"💻","Najwa Niyaz Team":"🎤","Tazeen":"🌸","Atfal":"👶","Flow Management":"🔄","Photography":"📷","Medical":"🏥" };
const VENDORS: Vendor[] = ["Amazon","Costco","Sam's Club","Walmart Business","Restaurant Depot","Home Depot","Best Buy","Target","Uline","TBD"];
const VENDOR_SEARCH: Record<string, (q: string) => string> = {
  "Amazon": q => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
  "Costco": q => `https://www.costco.com/CatalogSearch?keyword=${encodeURIComponent(q)}`,
  "Sam's Club": q => `https://www.samsclub.com/s/${encodeURIComponent(q)}`,
  "Walmart Business": q => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
  "Restaurant Depot": q => `https://www.restaurantdepot.com/search?query=${encodeURIComponent(q)}`,
  "Home Depot": q => `https://www.homedepot.com/s/${encodeURIComponent(q)}`,
  "Best Buy": q => `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(q)}`,
  "Target": q => `https://www.target.com/s?searchTerm=${encodeURIComponent(q)}`,
  "Uline": q => `https://www.uline.com/BL_3/Search?keywords=${encodeURIComponent(q)}`,
};
const VENDOR_COLORS: Record<string, string> = {
  "Amazon": "bg-amber-100 text-amber-800 border-amber-300",
  "Costco": "bg-blue-100 text-blue-800 border-blue-300",
  "Sam's Club": "bg-sky-100 text-sky-800 border-sky-300",
  "Walmart Business": "bg-cyan-100 text-cyan-800 border-cyan-300",
  "Restaurant Depot": "bg-red-100 text-red-800 border-red-300",
  "Home Depot": "bg-orange-100 text-orange-800 border-orange-300",
  "Best Buy": "bg-indigo-100 text-indigo-800 border-indigo-300",
  "Target": "bg-rose-100 text-rose-800 border-rose-300",
  "Uline": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "TBD": "bg-gray-100 text-gray-600 border-gray-300",
};
const VENDOR_RULES: Record<string, Vendor[]> = {
  "Nazafat": ["Costco","Amazon","Walmart Business","Home Depot","Uline"],
  "Audio Video": ["Amazon","Best Buy","Walmart Business"],
  "Mawaid Sabeel": ["Restaurant Depot","Costco","Sam's Club","Walmart Business"],
  "Security & Parking": ["Amazon","Walmart Business","Home Depot"],
  "Communication & Help Desk": ["Amazon","Best Buy","Walmart Business"],
  "IT & Security Checking": ["Amazon","Best Buy","Costco"],
  "Najwa Niyaz Team": ["Amazon","Walmart Business","Costco"],
  "Tazeen": ["Amazon","Costco","Walmart Business","Target"],
  "Atfal": ["Amazon","Walmart Business","Target","Costco"],
  "Flow Management": ["Amazon","Home Depot","Walmart Business","Uline"],
  "Photography": ["Amazon","Best Buy","Costco"],
  "Medical": ["Amazon","Costco","Walmart Business"],
};
const PRICE_HINTS: Record<string, string> = {
  "Amazon": "Competitive pricing, fast Prime delivery",
  "Costco": "Bulk pricing, avg 20–40% below retail",
  "Sam's Club": "Warehouse bulk pricing",
  "Walmart Business": "Competitive retail, volume discounts",
  "Restaurant Depot": "Wholesale foodservice pricing",
  "Home Depot": "Contractor/retail pricing",
  "Best Buy": "Retail electronics pricing",
  "Target": "Retail, good for décor & general supplies",
  "Uline": "Wholesale industrial/packaging supplies",
};

const EMPTY_FORM = { name:"", dept:"", qty:1, unit:"", price:"", priority:"Medium" as Priority, vendor:"TBD" as Vendor, status:"Needed" as Status, link:"", notes:"" };

const fmt = (n: number | null) => n != null ? `$${Number(n).toFixed(2)}` : "—";
const totalCost = (i: Item) => i.price && i.qty ? i.price * i.qty : 0;

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr("");
    const r = await fetch("/api/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ password: pw }) });
    if (r.ok) { onLogin(); }
    else { const d = await r.json(); setErr(d.error || "Incorrect password"); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-content-center" style={{background:"linear-gradient(135deg,#fffbeb 0%,#fef3c7 50%,#fde68a 100%)"}}>
      <div className="flex flex-col items-center justify-center min-h-screen w-full px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{background:"linear-gradient(135deg,#d97706,#f59e0b)"}}>
            <span className="text-4xl">🌿</span>
          </div>
          <h1 className="text-4xl font-bold text-amber-900" style={{fontFamily:"'Playfair Display',Georgia,serif"}}>Ashara Sugarland</h1>
          <p className="text-amber-600 mt-1 tracking-widest text-xs uppercase">Procurement Management</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-amber-200 p-8">
          <h2 className="text-xl font-semibold text-amber-900 mb-1" style={{fontFamily:"'Playfair Display',Georgia,serif"}}>Sign In</h2>
          <p className="text-amber-600 text-sm mb-6">Enter your access password to continue</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900 focus:outline-none focus:border-amber-500 pr-12 text-sm"
                  placeholder="Enter password"
                  autoFocus
                />
                <button type="button" onClick={() => setShow(s=>!s)} className="absolute right-3 top-3 text-amber-500 hover:text-amber-700 text-lg">
                  {show ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {err && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <span>⚠️</span> {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !pw}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all disabled:opacity-50"
              style={{background: loading || !pw ? "#d97706aa" : "linear-gradient(135deg,#d97706,#f59e0b)"}}
            >
              {loading ? "Verifying..." : "Enter Procurement Portal →"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-amber-500 text-xs">Ashara Sugarland NGO · Confidential</p>
      </div>
    </div>
  );
}

// ─── ITEM MODAL ───────────────────────────────────────────────────────────────
function ItemModal({ item, onSave, onClose }: { item: Partial<Item> | null; onSave: (data: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item, price: item.price ?? "" } : { ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const f = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.dept) return;
    setSaving(true);
    await onSave({ ...form, price: form.price === "" ? null : parseFloat(form.price), qty: parseInt(form.qty) || 1 });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(120,83,0,0.35)"}}>
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-amber-100">
          <h2 className="text-xl font-bold text-amber-900" style={{fontFamily:"'Playfair Display',Georgia,serif"}}>{item?.id ? "Edit Item" : "Add Item"}</h2>
          <button onClick={onClose} className="text-amber-400 hover:text-amber-700 text-2xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-6 grid grid-cols-2 gap-4">
          {/* Item Name */}
          <div className="col-span-2">
            <label className="label">Item Name *</label>
            <input className="inp" value={form.name} onChange={e=>f("name",e.target.value)} placeholder="e.g. Trash bags, Extension cord..." required />
          </div>
          {/* Department */}
          <div>
            <label className="label">Department *</label>
            <select className="inp" value={form.dept} onChange={e=>f("dept",e.target.value)} required>
              <option value="">Select…</option>
              {DEPTS.map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          {/* Priority */}
          <div>
            <label className="label">Priority</label>
            <select className="inp" value={form.priority} onChange={e=>f("priority",e.target.value)}>
              {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          {/* Qty */}
          <div>
            <label className="label">Quantity</label>
            <input className="inp" type="number" min="1" value={form.qty} onChange={e=>f("qty",e.target.value)} />
          </div>
          {/* Unit */}
          <div>
            <label className="label">Unit</label>
            <input className="inp" value={form.unit} onChange={e=>f("unit",e.target.value)} placeholder="pcs, boxes, lbs…" />
          </div>
          {/* Vendor */}
          <div>
            <label className="label">Vendor</label>
            <select className="inp" value={form.vendor} onChange={e=>f("vendor",e.target.value)}>
              {VENDORS.map(v=><option key={v}>{v}</option>)}
            </select>
            {form.vendor && form.vendor !== "TBD" && (
              <p className="text-xs text-amber-600 mt-1">💡 {PRICE_HINTS[form.vendor]}</p>
            )}
          </div>
          {/* Price */}
          <div>
            <label className="label">Est. Unit Price ($)</label>
            <input className="inp" type="number" min="0" step="0.01" value={form.price} onChange={e=>f("price",e.target.value)} placeholder="0.00" />
          </div>
          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="inp" value={form.status} onChange={e=>f("status",e.target.value)}>
              {["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          {/* Link */}
          <div className="col-span-2">
            <label className="label">Product Link (URL)</label>
            <input className="inp" type="url" value={form.link} onChange={e=>f("link",e.target.value)} placeholder="https://…" />
          </div>
          {/* Notes */}
          <div className="col-span-2">
            <label className="label">Notes</label>
            <input className="inp" value={form.notes} onChange={e=>f("notes",e.target.value)} placeholder="Special instructions or specs…" />
          </div>
          <div className="col-span-2 flex gap-3 justify-end mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border-2 border-amber-200 text-amber-700 text-sm font-medium hover:bg-amber-50 transition">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-60" style={{background:"linear-gradient(135deg,#d97706,#f59e0b)"}}>
              {saving ? "Saving…" : "Save Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function ProcurementApp({ onLogout }: { onLogout: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list"|"summary">("list");
  const [deptFilter, setDeptFilter] = useState("All");
  const [vendorFilter, setVendorFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<Partial<Item> | null | "new">(null);
  const [aiBox, setAiBox] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/items");
    if (r.ok) setItems(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveItem(data: any) {
    if (data.id) {
      await fetch(`/api/items/${data.id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
    } else {
      await fetch("/api/items", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data) });
    }
    setModal(null);
    load();
  }

  async function deleteItem(id: string) {
    if (!confirm("Remove this item?")) return;
    await fetch(`/api/items/${id}`, { method:"DELETE" });
    load();
  }

  async function quickUpdate(id: string, patch: Partial<Item>) {
    await fetch(`/api/items/${id}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(patch) });
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  const filtered = items.filter(i => {
    if (deptFilter !== "All" && i.dept !== deptFilter) return false;
    if (vendorFilter !== "All" && i.vendor !== vendorFilter) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.dept.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grandTotal = items.reduce((s,i)=>s+totalCost(i),0);

  // AI suggest text
  const aiText = (() => {
    const unassigned = items.filter(i=>i.vendor==="TBD");
    if (!unassigned.length) return "✅ All items have vendors assigned!";
    const lines = DEPTS.map(d => {
      const u = items.filter(i=>i.dept===d && i.vendor==="TBD");
      if (!u.length) return null;
      return `• ${d} (${u.length} unassigned) → recommend ${VENDOR_RULES[d]?.[0] ?? "Amazon"}`;
    }).filter(Boolean);
    return `${unassigned.length} items need a vendor:\n${lines.join("\n")}`;
  })();

  return (
    <div className="min-h-screen" style={{background:"#fffdf5"}}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-amber-200 shadow-sm" style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)"}}>
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:"linear-gradient(135deg,#d97706,#f59e0b)"}}>🌿</div>
            <div>
              <h1 className="font-bold text-amber-900 leading-tight" style={{fontFamily:"'Playfair Display',Georgia,serif",fontSize:"1.1rem"}}>Ashara Sugarland</h1>
              <p className="text-amber-500 text-xs tracking-widest uppercase">Procurement Management</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex gap-6">
              {[["📦",items.length,"Items"],["💰",grandTotal>0?fmt(grandTotal):"$0","Budget"],["✅",items.filter(i=>i.status==="Procured").length,"Procured"]].map(([ic,v,l])=>(
                <div key={String(l)} className="text-center">
                  <div className="text-amber-800 font-bold text-lg leading-tight">{String(ic)} {String(v)}</div>
                  <div className="text-amber-500 text-xs uppercase tracking-wider">{String(l)}</div>
                </div>
              ))}
            </div>
            <button onClick={onLogout} className="text-xs text-amber-500 hover:text-amber-700 border border-amber-200 rounded-lg px-3 py-1.5 hover:bg-amber-50 transition">Sign Out</button>
          </div>
        </div>
      </header>

      <div className="flex" style={{minHeight:"calc(100vh - 73px)"}}>
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-amber-200 p-4 overflow-y-auto" style={{background:"#fffbeb"}}>
          <div className="mb-5">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 px-2">Departments</p>
            {["All", ...DEPTS].map(d => (
              <button key={d} onClick={()=>setDeptFilter(d)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 flex items-center gap-2 text-sm transition-all ${deptFilter===d ? "bg-amber-500 text-white font-medium shadow-sm" : "text-amber-800 hover:bg-amber-100"}`}>
                <span>{d==="All" ? "🏠" : DEPT_ICONS[d]}</span>
                <span className="flex-1 truncate">{d}</span>
                <span className={`text-xs rounded-full px-1.5 py-0.5 ${deptFilter===d?"bg-amber-400 text-white":"bg-amber-100 text-amber-600"}`}>
                  {d==="All" ? items.length : items.filter(i=>i.dept===d).length}
                </span>
              </button>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2 px-2">Vendors</p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {["All",...VENDORS].map(v=>(
                <button key={v} onClick={()=>setVendorFilter(v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${vendorFilter===v?"bg-amber-500 text-white border-amber-500":"border-amber-200 text-amber-700 hover:border-amber-400"}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(["list","summary"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all border ${tab===t?"border-amber-500 bg-amber-500 text-white shadow-sm":"border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
                {t==="list" ? "📋 Item List" : "📊 Summary & Budget"}
              </button>
            ))}
          </div>

          {tab === "list" && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <h2 className="flex-1 text-2xl font-bold text-amber-900" style={{fontFamily:"'Playfair Display',Georgia,serif"}}>{deptFilter==="All"?"All Departments":deptFilter}</h2>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search items…"
                  className="px-3 py-2 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-900 text-sm focus:outline-none focus:border-amber-400 w-52" />
                <button onClick={()=>setAiBox(s=>!s)}
                  className="px-4 py-2 rounded-xl border-2 border-amber-400 text-amber-700 text-sm font-medium hover:bg-amber-50 transition flex items-center gap-1.5">
                  ✨ AI Suggest
                </button>
                <button onClick={()=>setModal("new")}
                  className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition shadow-sm"
                  style={{background:"linear-gradient(135deg,#d97706,#f59e0b)"}}>
                  + Add Item
                </button>
              </div>

              {aiBox && (
                <div className="mb-5 p-4 rounded-xl border-2 border-amber-300 bg-amber-50">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">✨ Smart Vendor Suggestions</p>
                  <pre className="text-sm text-amber-800 whitespace-pre-wrap">{aiText}</pre>
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full" style={{minWidth:"920px"}}>
                    <thead>
                      <tr style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)"}}>
                        {["Item Name","Department","Qty","Unit Price","Total","Priority","Vendor","Product Link","Status",""].map(h=>(
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-amber-600 uppercase tracking-wider whitespace-nowrap border-b border-amber-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={10} className="text-center py-16 text-amber-400">Loading items…</td></tr>
                      ) : filtered.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-16 text-amber-300">
                          <div className="text-5xl mb-3">📦</div>
                          <div>No items yet. Click <strong className="text-amber-600">+ Add Item</strong> to get started.</div>
                        </td></tr>
                      ) : filtered.map((item, idx) => {
                        const rowTotal = totalCost(item);
                        const pColor = item.priority==="High"?"text-red-600 bg-red-50 border-red-200":item.priority==="Medium"?"text-amber-600 bg-amber-50 border-amber-200":"text-green-700 bg-green-50 border-green-200";
                        const sColor = item.status==="Procured"?"text-green-700 bg-green-50":item.status==="In Progress"?"text-amber-700 bg-amber-50":"text-gray-600 bg-gray-50";
                        const linkUrl = item.link || (item.vendor && item.vendor!=="TBD" && VENDOR_SEARCH[item.vendor] ? VENDOR_SEARCH[item.vendor](item.name) : null);

                        return (
                          <tr key={item.id} className={`border-t border-amber-100 hover:bg-amber-50/40 transition ${idx%2===0?"":"bg-amber-50/20"}`}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-amber-900 text-sm">{item.name}</div>
                              {item.notes && <div className="text-xs text-amber-500 mt-0.5 truncate max-w-[180px]">{item.notes}</div>}
                            </td>
                            <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">{item.dept}</span></td>
                            <td className="px-4 py-3">
                              <input type="number" defaultValue={item.qty} min="1" onBlur={e=>quickUpdate(item.id,{qty:parseInt(e.target.value)||1})}
                                className="w-14 text-center border border-amber-200 rounded-lg px-2 py-1 text-sm bg-amber-50 focus:outline-none focus:border-amber-400" />
                            </td>
                            <td className="px-4 py-3 text-sm text-amber-700">{fmt(item.price)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-amber-800">{rowTotal>0?fmt(rowTotal):"—"}</td>
                            <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${pColor}`}>{item.priority}</span></td>
                            <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full border font-medium ${VENDOR_COLORS[item.vendor]||""}`}>{item.vendor}</span></td>
                            <td className="px-4 py-3">
                              {linkUrl
                                ? <a href={linkUrl} target="_blank" rel="noopener" className="text-xs text-amber-600 hover:text-amber-900 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-50 transition whitespace-nowrap">
                                    {item.link ? "🔗 View" : "🔍 Search"}
                                  </a>
                                : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <select value={item.status} onChange={e=>quickUpdate(item.id,{status:e.target.value as Status})}
                                className={`text-xs px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${sColor}`}>
                                {["Needed","In Progress","Procured"].map(s=><option key={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <button onClick={()=>setModal(item)} className="text-amber-400 hover:text-amber-700 border border-amber-200 rounded-lg px-2 py-1 text-xs hover:bg-amber-50 transition mr-1.5">✏️</button>
                              <button onClick={()=>deleteItem(item.id)} className="text-red-400 hover:text-red-600 border border-red-200 rounded-lg px-2 py-1 text-xs hover:bg-red-50 transition">✕</button>
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

          {tab === "summary" && (
            <SummaryTab items={items} grandTotal={grandTotal} />
          )}
        </main>
      </div>

      {/* Modal */}
      {modal && (
        <ItemModal
          item={modal === "new" ? {} : modal}
          onSave={saveItem}
          onClose={()=>setModal(null)}
        />
      )}

      <style>{`
        .label { display:block; font-size:0.72rem; font-weight:600; color:#b45309; text-transform:uppercase; letter-spacing:0.07em; margin-bottom:0.35rem; }
        .inp { width:100%; padding:0.6rem 0.85rem; border-radius:0.625rem; border:2px solid #fde68a; background:#fffbeb; color:#78350f; font-size:0.875rem; outline:none; transition:border-color 0.15s; }
        .inp:focus { border-color:#f59e0b; }
        select.inp { cursor:pointer; }
      `}</style>
    </div>
  );
}

// ─── SUMMARY TAB ──────────────────────────────────────────────────────────────
function SummaryTab({ items, grandTotal }: { items: Item[]; grandTotal: number }) {
  const procured = items.filter(i=>i.status==="Procured").length;
  const inProgress = items.filter(i=>i.status==="In Progress").length;
  const needed = items.filter(i=>i.status==="Needed").length;
  const highPri = items.filter(i=>i.priority==="High").length;
  const priced = items.filter(i=>i.price).length;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  const VENDORS_LIST: Vendor[] = ["Amazon","Costco","Sam's Club","Walmart Business","Restaurant Depot","Home Depot","Best Buy","Target","Uline","TBD"];
  const vData = VENDORS_LIST.map(v=>({ v, count:items.filter(i=>i.vendor===v).length, cost:items.filter(i=>i.vendor===v).reduce((s,i)=>s+(i.price&&i.qty?i.price*i.qty:0),0) })).filter(x=>x.count>0);
  const maxCount = Math.max(...vData.map(x=>x.count),1);

  function exportCSV() {
    const rows = [["Item","Dept","Qty","Unit","Unit Price","Total","Priority","Vendor","Status","Link","Notes"],...items.map(i=>[i.name,i.dept,i.qty,i.unit,i.price??"",(i.price&&i.qty)?i.price*i.qty:"",i.priority,i.vendor,i.status,i.link,i.notes])];
    const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="ashara_procurement.csv"; a.click();
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[
          ["Total Items",items.length,"text-amber-800"],
          ["Est. Budget",grandTotal>0?`$${grandTotal.toFixed(2)}`:"$0.00","text-amber-600"],
          ["Procured",procured,"text-green-700"],
          ["In Progress",inProgress,"text-amber-600"],
          ["Still Needed",needed,"text-gray-500"],
          ["High Priority",highPri,"text-red-600"],
        ].map(([label,val,color])=>(
          <div key={String(label)} className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-1">{String(label)}</p>
            <p className={`text-2xl font-bold ${color}`}>{String(val)}</p>
            {String(label)==="Est. Budget" && <p className="text-xs text-amber-400 mt-0.5">{priced}/{items.length} priced</p>}
          </div>
        ))}
      </div>

      {/* Budget by dept */}
      <div className="bg-white rounded-2xl border border-amber-200 p-6 mb-5 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">Budget by Department</h3>
        {DEPTS.filter(d=>items.some(i=>i.dept===d)).map(d=>{
          const cost = items.filter(i=>i.dept===d).reduce((s,i)=>s+(i.price&&i.qty?i.price*i.qty:0),0);
          const count = items.filter(i=>i.dept===d).length;
          return (
            <div key={d} className="flex items-center justify-between py-2.5 border-b border-amber-50 last:border-0">
              <span className="text-sm text-amber-900">{DEPT_ICONS[d]} {d} <span className="text-amber-400 text-xs">({count} items)</span></span>
              <span className="font-semibold text-amber-700 text-sm">{cost>0?fmt(cost):"No prices set"}</span>
            </div>
          );
        })}
        <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-amber-200">
          <span className="font-bold text-amber-900">Total Estimate</span>
          <span className="text-xl font-bold text-amber-600">{grandTotal>0?fmt(grandTotal):"$0.00"}</span>
        </div>
      </div>

      {/* Vendor bars */}
      <div className="bg-white rounded-2xl border border-amber-200 p-6 mb-5 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">Items & Cost by Vendor</h3>
        {vData.map(({v,count,cost})=>(
          <div key={v} className="flex items-center gap-3 mb-3">
            <div className="w-36 text-sm text-amber-800 shrink-0">{v}</div>
            <div className="flex-1 bg-amber-100 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full transition-all" style={{width:`${Math.round(count/maxCount*100)}%`}}></div></div>
            <div className="w-16 text-xs text-amber-600 text-right">{count} item{count!==1?"s":""}</div>
            <div className="w-20 text-xs text-amber-700 font-medium text-right">{cost>0?fmt(cost):""}</div>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-amber-600 uppercase tracking-wider mb-4">Export</h3>
        <button onClick={exportCSV} className="px-5 py-2.5 rounded-xl border-2 border-amber-300 text-amber-700 text-sm font-medium hover:bg-amber-50 transition">⬇ Export CSV</button>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    // Try a quick check — if /api/items returns 401, show login
    fetch("/api/items").then(r => setAuthed(r.ok)).catch(()=>setAuthed(false));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" });
    setAuthed(false);
  }

  if (authed === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)"}}>
      <div className="text-amber-400 text-4xl animate-pulse">🌿</div>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={()=>setAuthed(true)} />;
  return <ProcurementApp onLogout={logout} />;
}
