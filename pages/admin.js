import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Package, Utensils, LayoutDashboard, Plus, Trash2, Save, MapPin, Tag, Lock, LogOut, Image as ImageIcon } from 'lucide-react';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState({ promptPay: '', materials: [], menuItems: [], delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 }, discountCodes: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');

  useEffect(() => {
    const auth = localStorage.getItem('moojum_admin_auth');
    if (auth === 'true') { setIsAuthenticated(true); fetchData(); } else { setIsLoading(false); }
  }, []);

  const fetchData = () => { setIsLoading(true); fetch('/api/settings').then(res => res.json()).then(d => { setData(d); setIsLoading(false); }); };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'AB5541') { localStorage.setItem('moojum_admin_auth', 'true'); setIsAuthenticated(true); setAuthError(''); fetchData(); } 
    else { setAuthError('รหัสผ่านไม่ถูกต้อง'); }
  };

  const handleLogout = () => { localStorage.removeItem('moojum_admin_auth'); setIsAuthenticated(false); setPasscode(''); };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json(); alert(res.ok ? '✅ ' + result.message : '❌ ' + result.message);
    } catch (e) { alert('❌ เกิดข้อผิดพลาด'); }
    setIsSaving(false);
  };

  const handleMaterialChange = (id, field, value) => setData({ ...data, materials: data.materials.map(m => m.id === id ? { ...m, [field]: field === 'name' || field === 'unit' ? value : Number(value) } : m) });
  const addMaterial = () => setData({ ...data, materials: [...data.materials, { id: `mat_${Date.now()}`, name: 'วัตถุดิบใหม่', cost: 0, stock: 0, unit: 'ชิ้น' }] });
  const deleteMaterial = (id) => { if(confirm('ลบวัตถุดิบนี้?')) setData({ ...data, materials: data.materials.filter(m => m.id !== id) }); };

  const handleMenuChange = (id, field, value) => setData({ ...data, menuItems: data.menuItems.map(item => item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item) });
  const handleRecipeChange = (menuId, matId, newQty) => {
    const qty = Number(newQty);
    setData({ ...data, menuItems: data.menuItems.map(item => {
      if (item.id === menuId) { const newRecipe = { ...(item.recipe || {}) }; if (qty <= 0) delete newRecipe[matId]; else newRecipe[matId] = qty; return { ...item, recipe: newRecipe }; }
      return item;
    })});
  };
  const handleAddMaterialToRecipe = (menuId, matId) => {
    if (!matId) return;
    setData({ ...data, menuItems: data.menuItems.map(item => item.id === menuId ? { ...item, recipe: { ...(item.recipe || {}), [matId]: 1 } } : item) });
  };
  const calculateMenuCost = (recipe) => {
    if (!recipe) return 0; let total = 0;
    Object.entries(recipe).forEach(([matId, qty]) => { const mat = data.materials.find(m => m.id === matId); if (mat) total += (mat.cost * qty); });
    return total;
  };

  const handleDeliveryChange = (field, value) => setData({ ...data, delivery: { ...data.delivery, [field]: Number(value) } });
  const handleDiscountChange = (id, field, value) => setData({ ...data, discountCodes: data.discountCodes.map(c => c.id === id ? { ...c, [field]: field === 'percent' ? Number(value) : value } : c) });
  const addDiscountCode = () => setData({ ...data, discountCodes: [...data.discountCodes, { id: `code_${Date.now()}`, code: 'NEWCODE', percent: 10, isActive: true }] });
  const deleteDiscountCode = (id) => { if(confirm('ลบโค้ดส่วนลดนี้?')) setData({ ...data, discountCodes: data.discountCodes.filter(c => c.id !== id) }); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">กำลังโหลด...</div>;

  if (!isAuthenticated) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <Head><title>Login - Admin</title><script src="https://cdn.tailwindcss.com"></script><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/></Head>
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-100 text-center">
        <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={36} /></div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Moojum Admin</h2>
        <p className="text-slate-500 text-sm mb-8 font-medium">จัดการหลังร้านฉบับพกพา</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="รหัสผ่าน" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl tracking-[0.3em] font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 text-[16px]"/>
          {authError && <p className="text-rose-500 text-sm font-bold">{authError}</p>}
          <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 active:scale-95 transition-all shadow-md">เข้าสู่ระบบ</button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Admin - หมูจุ่มโตเกียว</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </Head>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row pb-24 md:pb-0">
        
        {/* Sidebar */}
        <div className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col shadow-xl fixed h-full z-20">
          <div className="p-6 text-white font-black text-xl border-b border-slate-800 flex items-center gap-3"><LayoutDashboard size={24} className="text-orange-500"/>Moojum Admin</div>
          <nav className="flex-1 p-4 flex flex-col gap-2">
            <button onClick={() => setActiveTab('menu')} className={`flex items-center gap-3 p-3.5 rounded-xl font-bold transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}><Utensils size={20} /> เมนู & ผูกสูตร</button>
            <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-3 p-3.5 rounded-xl font-bold transition-all ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}><Package size={20} /> คลังวัตถุดิบ</button>
            <button onClick={() => setActiveTab('delivery')} className={`flex items-center gap-3 p-3.5 rounded-xl font-bold transition-all ${activeTab === 'delivery' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}><MapPin size={20} /> ค่าส่ง & ส่วนลด</button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 p-3.5 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20} /> สรุปยอด</button>
          </nav>
          <div className="p-4 border-t border-slate-800"><button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-3 bg-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-700 hover:text-white transition-all"><LogOut size={18} /> ออกจากระบบ</button></div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden bg-white shadow-sm border-b border-slate-100 p-4 sticky top-0 z-30 flex justify-between items-center backdrop-blur-md bg-white/90">
          <h1 className="font-black text-slate-800 text-lg flex items-center gap-2"><LayoutDashboard className="text-orange-500" size={20}/> Admin</h1>
          <button onClick={saveSettings} disabled={isSaving} className="bg-slate-900 text-white px-5 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 flex items-center gap-2">{isSaving ? 'กำลังเซฟ...' : <><Save size={16}/> บันทึก</>}</button>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 md:ml-64 w-full max-w-5xl mx-auto">
          
          <div className="hidden md:flex justify-between items-center mb-8 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">{activeTab === 'inventory' ? <><Package className="text-orange-500"/> จัดการคลังวัตถุดิบ</> : activeTab === 'menu' ? <><Utensils className="text-orange-500"/> ตั้งค่าเมนู และ ผูกสูตร</> : activeTab === 'delivery' ? <><MapPin className="text-orange-500"/> จัดการค่าส่ง & ส่วนลด</> : <><LayoutDashboard className="text-orange-500"/> สรุปยอดขายรายวัน</>}</h1>
            <button onClick={saveSettings} disabled={isSaving} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black hover:bg-slate-800 active:scale-95 flex items-center gap-2 shadow-md"><Save size={20} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกเข้าระบบ'}</button>
          </div>

          <div className="space-y-6">
            {/* TAB 1: MENU */}
            {activeTab === 'menu' && data.menuItems.map(item => {
              const menuCost = calculateMenuCost(item.recipe); const profit = item.price - menuCost;
              return (
                <div key={item.id} className={`bg-white rounded-3xl p-5 md:p-6 shadow-sm border ${item.isAvailable ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-80'} flex flex-col md:block`}>
                  <div className="flex flex-col md:flex-row md:justify-between items-start mb-4 gap-4">
                    <div className="flex items-start gap-4 w-full md:w-auto">
                      {/* รูปภาพ หรือ Emoji */}
                      <div className="text-4xl bg-gradient-to-br from-slate-50 to-slate-100 w-20 h-20 md:w-24 md:h-24 flex items-center justify-center rounded-2xl shadow-inner border border-slate-100 shrink-0 overflow-hidden">
                        {item.image?.startsWith('http') ? <img src={item.image} className="w-full h-full object-cover" alt="menu" /> : item.image}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg md:text-xl font-black text-slate-800 leading-tight">{item.name}</h3>
                        
                        {/* ช่องใส่ลิงก์รูปภาพ */}
                        <div className="mt-2 w-full max-w-xs">
                          <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mb-1"><ImageIcon size={12}/> ลิงก์รูปภาพ หรือ Emoji</label>
                          <input type="text" value={item.image} onChange={(e) => handleMenuChange(item.id, 'image', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="เช่น http://... หรือ 🍲"/>
                        </div>

                        {/* Mobile Price Input */}
                        <div className="flex items-center gap-2 mt-2 md:hidden">
                          <span className="text-sm font-bold text-slate-500">ราคา:</span>
                          <input type="number" value={item.price} onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)} className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 text-[16px]"/>
                        </div>
                      </div>
                      <button onClick={() => handleMenuChange(item.id, 'isAvailable', !item.isAvailable)} className={`md:hidden p-2 rounded-xl shrink-0 mt-1 ${item.isAvailable ? 'bg-slate-100 text-slate-500' : 'bg-orange-500 text-white shadow-md'}`}>
                        {item.isAvailable ? 'ปิด' : 'เปิด'}
                      </button>
                    </div>

                    {/* Desktop Controls */}
                    <div className="hidden md:flex flex-col items-end gap-2">
                      <button onClick={() => handleMenuChange(item.id, 'isAvailable', !item.isAvailable)} className={`px-5 py-2 rounded-xl text-sm font-black shadow-sm transition-colors ${item.isAvailable ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-orange-500 text-white hover:bg-orange-600'}`}>
                        {item.isAvailable ? '🟢 กำลังขายอยู่ (กดเพื่อปิด)' : '🔴 ปิดการขาย (กดเพื่อเปิด)'}
                      </button>
                      <div className="flex gap-2 text-sm mt-1">
                        <div className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold border border-green-100">
                          ฿ <input type="number" value={item.price} onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)} className="w-14 bg-white border border-green-200 rounded px-1 text-center focus:outline-none"/>
                        </div>
                        <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-lg font-bold border border-rose-100">ทุน ฿{menuCost}</span>
                        <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold border border-blue-100">กำไร ฿{profit}</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Stats */}
                  <div className="md:hidden flex gap-2 text-xs mb-4">
                    <span className="flex-1 bg-rose-50 text-rose-700 p-2 rounded-xl font-bold border border-rose-100 text-center flex flex-col"><span>ต้นทุน</span><span className="text-base">฿{menuCost}</span></span>
                    <span className="flex-1 bg-blue-50 text-blue-700 p-2 rounded-xl font-bold border border-blue-100 text-center flex flex-col"><span>กำไร</span><span className="text-base">฿{profit}</span></span>
                  </div>

                  {/* Recipe Section */}
                  <div className="mt-2 pt-4 border-t border-slate-100">
                    <p className="text-xs md:text-sm font-bold text-slate-400 mb-3 flex items-center gap-1.5"><Package size={14}/> วัตถุดิบที่ใช้ตัดสต๊อกต่อ 1 การขาย</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      {item.recipe && Object.entries(item.recipe).map(([matId, qty]) => {
                        const matInfo = data.materials.find(m => m.id === matId); if(!matInfo) return null;
                        return (
                          <div key={matId} className="bg-slate-50 border border-slate-200 pl-3 pr-1 py-1 rounded-xl text-sm flex items-center gap-2">
                            <span className="font-bold text-slate-700 text-xs md:text-sm">{matInfo.name}</span>
                            <input type="number" min="0" value={qty} onChange={(e) => handleRecipeChange(item.id, matId, e.target.value)} className="w-10 bg-white border border-slate-300 rounded-lg px-1 py-1 text-center font-black text-slate-800 text-[16px]"/>
                            <span className="text-slate-400 text-xs font-medium">{matInfo.unit}</span>
                            <button onClick={() => handleRecipeChange(item.id, matId, 0)} className="text-slate-300 hover:text-rose-500 bg-white border border-slate-200 p-1.5 rounded-lg shadow-sm"><Trash2 size={14} /></button>
                          </div>
                        );
                      })}
                      <select onChange={(e) => { handleAddMaterialToRecipe(item.id, e.target.value); e.target.value = ""; }} className="bg-white border border-dashed border-slate-300 text-slate-500 font-bold text-xs md:text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 appearance-none" defaultValue="">
                        <option value="" disabled>+ เพิ่มวัตถุดิบลงสูตร</option>
                        {data.materials.filter(m => !item.recipe || !item.recipe[m.id]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* TAB 2, 3, 4 (โค้ดเดิมซ่อนไว้ในนี้) */}
            {activeTab === 'inventory' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-2xl shadow-md md:hidden"><h2 className="font-black">คลังวัตถุดิบทั้งหมด</h2><button onClick={addMaterial} className="bg-white/20 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 active:bg-white/30"><Plus size={16}/> เพิ่ม</button></div>
                <div className="hidden md:flex justify-end"><button onClick={addMaterial} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-md flex items-center gap-2 hover:bg-slate-800"><Plus size={18}/> เพิ่มวัตถุดิบใหม่</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.materials.map(mat => (
                    <div key={mat.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative">
                      <button onClick={() => deleteMaterial(mat.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 bg-slate-50 p-2 rounded-full"><Trash2 size={16}/></button>
                      <div className="mb-4 pr-10">
                        <label className="text-xs font-bold text-slate-400 block mb-1">ชื่อวัตถุดิบ</label>
                        <input type="text" value={mat.name} onChange={(e) => handleMaterialChange(mat.id, 'name', e.target.value)} className="w-full font-black text-lg text-slate-800 focus:outline-none focus:border-b-2 focus:border-orange-500 text-[16px]"/>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">หน่วย</label><input type="text" value={mat.unit} onChange={(e) => handleMaterialChange(mat.id, 'unit', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center font-bold text-slate-600 text-[16px]"/></div>
                        <div className="col-span-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">ต้นทุน (฿)</label><input type="number" value={mat.cost} onChange={(e) => handleMaterialChange(mat.id, 'cost', e.target.value)} className="w-full bg-rose-50 border border-rose-100 rounded-xl p-2 text-center font-black text-rose-700 text-[16px]"/></div>
                        <div className="col-span-1"><label className="text-[10px] font-bold text-blue-500 block mb-1">สต๊อก</label><input type="number" value={mat.stock} onChange={(e) => handleMaterialChange(mat.id, 'stock', e.target.value)} className="w-full bg-blue-50 border border-blue-200 rounded-xl p-2 text-center font-black text-blue-700 text-[16px]"/></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === 'delivery' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-200">
                  <h3 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2 pb-3 border-b border-slate-100"><MapPin className="text-orange-500" size={24}/> ปักหมุดร้าน & ค่าส่ง</h3>
                  <div className="space-y-4 mb-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">📍 พิกัด GPS ร้านค้า</p>
                      <div className="flex gap-3">
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">ละติจูด (Lat)</label><input type="number" value={data.delivery.storeLat} onChange={(e) => handleDeliveryChange('storeLat', e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 text-[16px]"/></div>
                        <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 block mb-1">ลองจิจูด (Lng)</label><input type="number" value={data.delivery.storeLng} onChange={(e) => handleDeliveryChange('storeLng', e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-orange-500 text-[16px]"/></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <label className="text-xs font-bold text-orange-800 block mb-2">ค่าส่งเริ่มต้น (฿)</label>
                        <input type="number" value={data.delivery.baseFee} onChange={(e) => handleDeliveryChange('baseFee', e.target.value)} className="w-full p-3 bg-white border border-orange-200 rounded-xl font-black text-orange-600 text-center text-xl focus:ring-2 focus:ring-orange-500 text-[16px]"/>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                        <label className="text-xs font-bold text-orange-800 block mb-2">บวกเพิ่ม กม. ละ (฿)</label>
                        <input type="number" value={data.delivery.ratePerKm} onChange={(e) => handleDeliveryChange('ratePerKm', e.target.value)} className="w-full p-3 bg-white border border-orange-200 rounded-xl font-black text-orange-600 text-center text-xl focus:ring-2 focus:ring-orange-500 text-[16px]"/>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Tag className="text-blue-500" size={24}/> โค้ดส่วนลดค่าส่ง</h3>
                    <button onClick={addDiscountCode} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 active:bg-blue-700 shadow-md"><Plus size={14} /> สร้างโค้ด</button>
                  </div>
                  <div className="grid gap-4">
                    {data.discountCodes.length === 0 && <div className="text-center py-8 text-slate-400 font-bold text-sm bg-slate-50 rounded-2xl">ยังไม่มีโค้ดส่วนลด</div>}
                    {data.discountCodes.map(code => (
                      <div key={code.id} className={`flex flex-col md:flex-row items-center justify-between p-5 border rounded-2xl transition-all gap-4 relative ${!code.isActive ? 'bg-slate-50 border-slate-200 grayscale opacity-70' : 'bg-white border-blue-200 shadow-sm'}`}>
                        <button onClick={() => deleteDiscountCode(code.id)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 md:relative md:top-auto md:right-auto"><Trash2 size={18} /></button>
                        <div className="w-full md:flex-1 pr-6 md:pr-0">
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">พิมพ์ชื่อโค้ด</label>
                          <input type="text" value={code.code} onChange={(e) => handleDiscountChange(code.id, 'code', e.target.value.toUpperCase())} className="font-mono text-xl md:text-2xl font-black text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 w-full uppercase text-[16px] tracking-widest"/>
                        </div>
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-4 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-slate-100">
                          <div className="flex items-center gap-2"><span className="text-sm font-bold text-slate-500">ลด</span><input type="number" min="1" max="100" value={code.percent} onChange={(e) => handleDiscountChange(code.id, 'percent', e.target.value)} className="w-16 p-2 border border-slate-300 rounded-xl text-center font-black text-slate-800 focus:ring-2 focus:ring-blue-500 text-[16px]"/><span className="text-sm font-bold text-slate-500">%</span></div>
                          <button onClick={() => handleDiscountChange(code.id, 'isActive', !code.isActive)} className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm ${code.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{code.isActive ? 'เปิดใช้งาน' : 'ปิด'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <div className="space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-6">
                  <h3 className="font-black text-slate-800 text-base mb-1 flex items-center gap-2"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PromptPay-logo.jpg/120px-PromptPay-logo.jpg" alt="pp" className="h-4"/> ตั้งค่าเบอร์รับเงิน</h3>
                  <input type="text" value={data.promptPay} onChange={(e) => setData({...data, promptPay: e.target.value})} className="w-full border border-slate-300 p-3.5 rounded-2xl font-black text-slate-800 tracking-wider focus:ring-2 focus:ring-orange-500 bg-slate-50 text-[16px]"/>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="col-span-2 md:col-span-1 bg-slate-900 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div><p className="text-slate-400 font-bold text-xs mb-2">รายรับวันนี้</p><h3 className="text-4xl font-black tracking-tight">฿0</h3></div>
                  <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl text-rose-800"><p className="text-rose-400 font-bold text-[10px] mb-1 uppercase tracking-wider">ต้นทุนวัตถุดิบ</p><h3 className="text-2xl font-black">฿0</h3></div>
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl text-emerald-800"><p className="text-emerald-500 font-bold text-[10px] mb-1 uppercase tracking-wider">กำไรสุทธิ</p><h3 className="text-2xl font-black">฿0</h3></div>
                </div>
                <button onClick={handleLogout} className="md:hidden mt-8 w-full py-4 bg-slate-200 text-slate-600 font-black rounded-2xl flex items-center justify-center gap-2 active:bg-slate-300"><LogOut size={18}/> ออกจากระบบหลังร้าน</button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center px-2 py-3 z-40 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]">
          {[ { id: 'menu', icon: Utensils, label: 'เมนู' }, { id: 'inventory', icon: Package, label: 'สต๊อก' }, { id: 'delivery', icon: MapPin, label: 'ค่าส่ง' }, { id: 'dashboard', icon: LayoutDashboard, label: 'ยอดขาย' } ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${activeTab === tab.id ? 'text-orange-600 scale-110' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={22} className={activeTab === tab.id ? 'mb-1' : 'mb-1 opacity-70'} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className={`text-[9px] font-bold ${activeTab === tab.id ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>{tab.label}</span>
            </button>
          ))}
        </div>

      </div>
    </>
  );
}
