import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Package, Utensils, LayoutDashboard, Plus, Trash2, Save, MapPin, Tag, Lock, LogOut } from 'lucide-react';

export default function Admin() {
  // --- สถานะสำหรับการล็อคอิน ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // --- สถานะข้อมูลหลังร้าน ---
  const [data, setData] = useState({ 
    promptPay: '', materials: [], menuItems: [], 
    delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 },
    discountCodes: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');

  // ตรวจสอบสถานะการล็อคอินเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const auth = localStorage.getItem('moojum_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData(); // ดึงข้อมูลเฉพาะตอนที่ล็อคอินผ่านแล้ว
    } else {
      setIsLoading(false); // ปิดสถานะโหลดเพื่อโชว์หน้าล็อคอิน
    }
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    fetch('/api/settings')
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'AB5541') {
      localStorage.setItem('moojum_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      fetchData(); // รหัสผ่านถูกต้อง ให้เริ่มดึงข้อมูล
    } else {
      setAuthError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('moojum_admin_auth');
    setIsAuthenticated(false);
    setPasscode('');
    setData({ promptPay: '', materials: [], menuItems: [], delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 }, discountCodes: [] });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      alert(response.ok ? '✅ ' + result.message : '❌ ' + result.message);
    } catch (error) {
      alert('❌ เกิดข้อผิดพลาด');
    }
    setIsSaving(false);
  };

  // --- ฟังก์ชันจัดการวัตถุดิบ ---
  const handleMaterialChange = (id, field, value) => {
    const updated = data.materials.map(m => m.id === id ? { ...m, [field]: field === 'name' || field === 'unit' ? value : Number(value) } : m);
    setData({ ...data, materials: updated });
  };
  const addMaterial = () => {
    const newMat = { id: `mat_${Date.now()}`, name: 'วัตถุดิบใหม่', cost: 0, stock: 0, unit: 'ชิ้น' };
    setData({ ...data, materials: [...data.materials, newMat] });
  };
  const deleteMaterial = (id) => {
    if(confirm('ลบวัตถุดิบนี้?')) setData({ ...data, materials: data.materials.filter(m => m.id !== id) });
  };

  // --- ฟังก์ชันจัดการเมนูและสูตร ---
  const handleMenuChange = (id, field, value) => {
    const updatedMenu = data.menuItems.map(item => item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item);
    setData({ ...data, menuItems: updatedMenu });
  };
  const handleRecipeChange = (menuId, matId, newQty) => {
    const qty = Number(newQty);
    const updatedMenu = data.menuItems.map(item => {
      if (item.id === menuId) {
        const newRecipe = { ...(item.recipe || {}) };
        if (qty <= 0) delete newRecipe[matId];
        else newRecipe[matId] = qty;
        return { ...item, recipe: newRecipe };
      }
      return item;
    });
    setData({ ...data, menuItems: updatedMenu });
  };
  const handleAddMaterialToRecipe = (menuId, matId) => {
    if (!matId) return;
    const updatedMenu = data.menuItems.map(item => {
      if (item.id === menuId) {
        const newRecipe = { ...(item.recipe || {}), [matId]: 1 };
        return { ...item, recipe: newRecipe };
      }
      return item;
    });
    setData({ ...data, menuItems: updatedMenu });
  };
  const calculateMenuCost = (recipe) => {
    if (!recipe) return 0;
    let totalCost = 0;
    Object.entries(recipe).forEach(([matId, qty]) => {
      const mat = data.materials.find(m => m.id === matId);
      if (mat) totalCost += (mat.cost * qty);
    });
    return totalCost;
  };

  // --- ฟังก์ชันจัดการระบบ Delivery & โค้ดส่วนลด ---
  const handleDeliveryChange = (field, value) => {
    setData({ ...data, delivery: { ...data.delivery, [field]: Number(value) } });
  };
  const handleDiscountChange = (id, field, value) => {
    const updated = data.discountCodes.map(c => c.id === id ? { ...c, [field]: field === 'percent' ? Number(value) : value } : c);
    setData({ ...data, discountCodes: updated });
  };
  const addDiscountCode = () => {
    const newCode = { id: `code_${Date.now()}`, code: 'NEWCODE', percent: 10, isActive: true };
    setData({ ...data, discountCodes: [...data.discountCodes, newCode] });
  };
  const deleteDiscountCode = (id) => {
    if(confirm('ลบโค้ดส่วนลดนี้?')) setData({ ...data, discountCodes: data.discountCodes.filter(c => c.id !== id) });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">กำลังโหลดข้อมูล...</div>;

  // --- หน้าจอสำหรับ Login ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
        <Head><title>Login - หมูจุ่มโตเกียว</title><script src="https://cdn.tailwindcss.com"></script></Head>
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-slate-200 text-center">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={36} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Moojum Admin</h2>
          <p className="text-slate-500 text-sm mb-8">กรุณาใส่รหัสผ่านเพื่อเข้าจัดการหลังร้าน</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input 
                type="password" 
                value={passcode} 
                onChange={(e) => setPasscode(e.target.value)} 
                placeholder="รหัสผ่าน" 
                className="w-full p-4 border border-slate-300 rounded-xl text-center text-xl tracking-[0.3em] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            {authError && <p className="text-red-500 text-sm font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-800 transition-colors shadow-md">
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- หน้าจอ Admin หลัก (เมื่อล็อคอินผ่านแล้ว) ---
  return (
    <>
      <Head>
        <title>Admin - หมูจุ่มโตเกียว</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl">
          <div className="p-6 text-white font-bold text-xl border-b border-slate-700 flex items-center gap-2">
            <LayoutDashboard size={24} className="text-orange-500"/>
            Moojum Admin
          </div>
          <nav className="flex-1 p-4 flex flex-row md:flex-col gap-2 overflow-x-auto">
            <button onClick={() => setActiveTab('menu')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'menu' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
              <Utensils size={20} /> เมนู & ผูกสูตร
            </button>
            <button onClick={() => setActiveTab('inventory')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'inventory' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
              <Package size={20} /> คลังวัตถุดิบ
            </button>
            <button onClick={() => setActiveTab('delivery')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'delivery' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
              <MapPin size={20} /> จัดการค่าส่ง & ส่วนลด
            </button>
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
              <LayoutDashboard size={20} /> สรุปยอด (Dashboard)
            </button>
          </nav>
          {/* ปุ่มออกจากระบบ */}
          <div className="p-4 mt-auto border-t border-slate-800">
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full p-3 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors">
              <LogOut size={18} /> ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            <div className="flex justify-between items-center mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-0 z-10">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {activeTab === 'inventory' ? '📦 จัดการคลังวัตถุดิบ' : activeTab === 'menu' ? '🍲 ตั้งค่าเมนู และ ผูกสูตร' : activeTab === 'delivery' ? '🛵 จัดการค่าส่ง & ส่วนลด' : '📊 สรุปยอดขายรายวัน'}
                </h1>
              </div>
              <button onClick={saveSettings} disabled={isSaving} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 disabled:bg-slate-400 flex items-center gap-2 shadow-sm transition-all">
                <Save size={18} /> {isSaving ? 'กำลังบันทึก...' : 'บันทึกระบบ'}
              </button>
            </div>

            {/* TAB 1: MENU & RECIPE */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                {data.menuItems.map(item => {
                  const menuCost = calculateMenuCost(item.recipe);
                  const profit = item.price - menuCost;
                  return (
                    <div key={item.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${item.isAvailable ? 'border-orange-100' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl bg-slate-100 w-16 h-16 flex items-center justify-center rounded-2xl">{item.image}</div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{item.name}</h3>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm items-center">
                              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                                ราคาขาย: ฿ <input type="number" value={item.price} onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)} className="w-16 bg-white border border-green-300 rounded px-1 py-0.5 text-center text-green-800 focus:outline-none focus:ring-1 focus:ring-green-500" />
                              </div>
                              <span className="bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">ต้นทุนรวม: ฿{menuCost.toLocaleString()}</span>
                              <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">กำไร: ฿{profit.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleMenuChange(item.id, 'isAvailable', !item.isAvailable)} className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${item.isAvailable ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                          {item.isAvailable ? 'เปิดขายอยู่ (กดเพื่อปิด)' : 'ปิดการขาย (กดเพื่อเปิด)'}
                        </button>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2"><Package size={16}/> วัตถุดิบที่ใช้ตัดสต๊อกต่อ 1 การขาย (ผูกสูตร)</p>
                        <div className="flex flex-wrap gap-2 items-center">
                          {item.recipe && Object.entries(item.recipe).map(([matId, qty]) => {
                            const matInfo = data.materials.find(m => m.id === matId);
                            if(!matInfo) return null;
                            return (
                              <div key={matId} className="bg-slate-50 border border-slate-200 pl-3 pr-1.5 py-1.5 rounded-lg text-sm flex items-center gap-2 group hover:border-orange-200 transition-colors">
                                <span className="font-medium text-slate-700">{matInfo.name}</span>
                                <input type="number" min="0" value={qty} onChange={(e) => handleRecipeChange(item.id, matId, e.target.value)} className="w-12 bg-white border border-slate-300 rounded px-1 text-center font-bold text-slate-800 focus:outline-none focus:border-orange-500" />
                                <span className="text-slate-500 text-xs">{matInfo.unit}</span>
                                <button onClick={() => handleRecipeChange(item.id, matId, 0)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={14} /></button>
                              </div>
                            );
                          })}
                          <select onChange={(e) => { handleAddMaterialToRecipe(item.id, e.target.value); e.target.value = ""; }} className="bg-white border border-dashed border-slate-300 text-slate-600 font-medium text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer" defaultValue="">
                            <option value="" disabled>+ เพิ่มวัตถุดิบ</option>
                            {data.materials.filter(m => !item.recipe || !item.recipe[m.id]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: INVENTORY */}
            {activeTab === 'inventory' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h2 className="text-lg font-bold text-slate-800">รายการวัตถุดิบทั้งหมด</h2>
                  <button onClick={addMaterial} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-orange-700 shadow-sm"><Plus size={16} /> เพิ่มวัตถุดิบ</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-200">
                      <tr><th className="p-4">ชื่อวัตถุดิบ</th><th className="p-4 w-24">หน่วย</th><th className="p-4 w-32">ต้นทุน/หน่วย (฿)</th><th className="p-4 w-32 text-blue-600">สต๊อกคงเหลือ</th><th className="p-4 w-16 text-center">ลบ</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.materials.map(mat => (
                        <tr key={mat.id} className="hover:bg-slate-50">
                          <td className="p-4"><input type="text" value={mat.name} onChange={(e) => handleMaterialChange(mat.id, 'name', e.target.value)} className="w-full bg-transparent font-bold text-slate-700 focus:outline-none focus:border-b-2 focus:border-orange-500"/></td>
                          <td className="p-4"><input type="text" value={mat.unit} onChange={(e) => handleMaterialChange(mat.id, 'unit', e.target.value)} className="w-full bg-transparent text-slate-500 focus:outline-none"/></td>
                          <td className="p-4"><input type="number" value={mat.cost} onChange={(e) => handleMaterialChange(mat.id, 'cost', e.target.value)} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center focus:outline-none"/></td>
                          <td className="p-4"><input type="number" value={mat.stock} onChange={(e) => handleMaterialChange(mat.id, 'stock', e.target.value)} className="w-full bg-blue-50 border border-blue-200 p-2 rounded-lg text-center font-bold text-blue-700 focus:outline-none"/></td>
                          <td className="p-4 text-center"><button onClick={() => deleteMaterial(mat.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DELIVERY & PROMO */}
            {activeTab === 'delivery' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><MapPin className="text-orange-500"/> ตั้งค่าพิกัดร้านและอัตราค่าส่ง</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-1">ละติจูด (Latitude) ร้านค้า</label>
                      <input type="number" value={data.delivery.storeLat} onChange={(e) => handleDeliveryChange('storeLat', e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-none focus:border-orange-500"/>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-1">ลองจิจูด (Longitude) ร้านค้า</label>
                      <input type="number" value={data.delivery.storeLng} onChange={(e) => handleDeliveryChange('storeLng', e.target.value)} className="w-full p-2.5 border rounded-lg focus:outline-none focus:border-orange-500"/>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <div>
                      <label className="text-sm font-bold text-orange-800 block mb-1">ค่าส่งเริ่มต้น (Base Fee)</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={data.delivery.baseFee} onChange={(e) => handleDeliveryChange('baseFee', e.target.value)} className="w-full p-2.5 border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"/> <span className="font-bold text-orange-600">บาท</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-orange-800 block mb-1">อัตราบวกเพิ่ม กิโลเมตรละ</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={data.delivery.ratePerKm} onChange={(e) => handleDeliveryChange('ratePerKm', e.target.value)} className="w-full p-2.5 border border-orange-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"/> <span className="font-bold text-orange-600">บาท</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Tag className="text-blue-500"/> โค้ดส่วนลดค่าจัดส่ง</h3>
                    <button onClick={addDiscountCode} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-700 shadow-sm"><Plus size={16} /> สร้างโค้ดส่วนลด</button>
                  </div>
                  <div className="p-4">
                    {data.discountCodes.length === 0 ? (
                      <div className="text-center py-6 text-slate-400">ยังไม่มีโค้ดส่วนลด</div>
                    ) : (
                      <div className="grid gap-3">
                        {data.discountCodes.map(code => (
                          <div key={code.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${!code.isActive ? 'bg-slate-50 opacity-60' : 'bg-white border-blue-100'}`}>
                            <div className="flex items-center gap-4 w-1/2">
                              <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">ชื่อโค้ด (ภาษาอังกฤษ/ตัวเลข)</label>
                                <input type="text" value={code.code} onChange={(e) => handleDiscountChange(code.id, 'code', e.target.value.toUpperCase())} className="font-mono text-lg font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full uppercase"/>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 w-1/2 justify-end">
                              <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">ส่วนลดค่าส่ง (%)</label>
                                <div className="flex items-center gap-1">
                                  <input type="number" min="1" max="100" value={code.percent} onChange={(e) => handleDiscountChange(code.id, 'percent', e.target.value)} className="w-16 p-2 border rounded-md text-center font-bold text-slate-700 focus:outline-none"/> %
                                </div>
                              </div>
                              <button onClick={() => handleDiscountChange(code.id, 'isActive', !code.isActive)} className={`px-4 py-2 rounded-lg text-sm font-bold w-24 ${code.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                                {code.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                              </button>
                              <button onClick={() => deleteDiscountCode(code.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">💳 เบอร์พร้อมเพย์รับเงิน</h3>
                    <p className="text-sm text-slate-500">เบอร์ที่จะนำไปสร้าง QR Code ให้ลูกค้าสแกนจ่ายเงิน</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">PromptPay:</span>
                    <input type="text" value={data.promptPay} onChange={(e) => setData({...data, promptPay: e.target.value})} className="border border-slate-300 p-2.5 rounded-lg w-48 text-center font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-sm text-white"><p className="text-green-100 font-medium mb-1">รายรับวันนี้</p><h3 className="text-4xl font-bold">฿0</h3></div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-sm text-white"><p className="text-red-100 font-medium mb-1">ต้นทุนวัตถุดิบวันนี้</p><h3 className="text-4xl font-bold">฿0</h3></div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-sm text-white"><p className="text-blue-100 font-medium mb-1">กำไรสุทธิ</p><h3 className="text-4xl font-bold">฿0</h3></div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
