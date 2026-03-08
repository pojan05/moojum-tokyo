import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Package, Utensils, LayoutDashboard, Plus, Trash2, Save, MapPin, Tag, Lock, LogOut, Camera } from 'lucide-react';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');

  // --- อัปเดต state รับค่า isStoreOpen, minOrderAmount, freeDeliveryThreshold ---
  const [data, setData] = useState({ 
    promptPay: '', allowCash: false, storePhone: '', storeBanner: '', 
    isStoreOpen: true, minOrderAmount: 0, freeDeliveryThreshold: 0,
    materials: [], menuItems: [], 
    delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 },
    discountCodes: [] 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');

  useEffect(() => {
    const auth = localStorage.getItem('moojum_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchData = () => {
    setIsLoading(true);
    fetch('/api/settings')
      .then(res => res.json())
      .then(fetchedData => {
        setData({ 
          ...fetchedData, 
          allowCash: fetchedData.allowCash || false,
          storePhone: fetchedData.storePhone || '',
          storeBanner: fetchedData.storeBanner || '',
          isStoreOpen: fetchedData.isStoreOpen !== false,
          minOrderAmount: fetchedData.minOrderAmount || 0,
          freeDeliveryThreshold: fetchedData.freeDeliveryThreshold || 0
        });
        setIsLoading(false);
      });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (passcode === 'AB5541') {
      localStorage.setItem('moojum_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
      fetchData();
    } else {
      setAuthError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('moojum_admin_auth');
    setIsAuthenticated(false);
    setPasscode('');
    setData({ promptPay: '', allowCash: false, storePhone: '', storeBanner: '', isStoreOpen: true, minOrderAmount: 0, freeDeliveryThreshold: 0, materials: [], menuItems: [], delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 }, discountCodes: [] });
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

  const handleMenuChange = (id, field, value) => {
    const updatedMenu = data.menuItems.map(item => item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item);
    setData({ ...data, menuItems: updatedMenu });
  };

  const handleMenuImageUpload = async (id, file) => {
    if (!file) return;
    const formData = new FormData(); 
    formData.append('image', file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=5f481fd2d9b156fc69bbc59eafb656ff`, { method: 'POST', body: formData });
      const imgData = await res.json();
      if (imgData.success) {
        handleMenuChange(id, 'image', imgData.data.url);
      } else {
        alert('อัปโหลดรูปไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const handleBannerUpload = async (file) => {
    if (!file) return;
    const formData = new FormData(); 
    formData.append('image', file);
    try {
      const res = await fetch(`https://api.imgbb.com/1/upload?key=5f481fd2d9b156fc69bbc59eafb656ff`, { method: 'POST', body: formData });
      const imgData = await res.json();
      if (imgData.success) {
        setData({ ...data, storeBanner: imgData.data.url });
      } else {
        alert('อัปโหลดแบนเนอร์ไม่สำเร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
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

  const addMenuItem = () => {
    const newItem = { 
      id: `menu_${Date.now()}`, 
      name: 'พิมพ์ชื่อเมนูใหม่...', 
      desc: '', 
      price: 0, 
      image: '🍲', 
      type: 'main',
      isAvailable: true, 
      recipe: {} 
    };
    setData({ ...data, menuItems: [...data.menuItems, newItem] });
  };

  const deleteMenuItem = (id) => {
    if(confirm('ต้องการลบเมนูนี้ใช่หรือไม่?')) {
      setData({ ...data, menuItems: data.menuItems.filter(m => m.id !== id) });
    }
  };

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

            {/* TAB 1: MENU */}
            {activeTab === 'menu' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h2 className="font-bold text-slate-700">รายการเมนูทั้งหมด</h2>
                  <button onClick={addMenuItem} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-700 shadow-sm transition-all">
                    <Plus size={18} /> เพิ่มเมนูใหม่
                  </button>
                </div>
                {data.menuItems.map(item => {
                  const menuCost = calculateMenuCost(item.recipe);
                  const profit = item.price - menuCost;
                  return (
                    <div key={item.id} className={`bg-white rounded-2xl p-6 shadow-sm border ${item.isAvailable ? 'border-orange-100' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4 w-full">
                          
                          <div className="relative w-16 h-16 shrink-0 group">
                            {item.image && item.image.startsWith('http') ? (
                              <img src={item.image} alt="menu" className="w-full h-full object-cover rounded-2xl border border-slate-200" />
                            ) : (
                              <input 
                                type="text" 
                                value={item.image || ''} 
                                onChange={(e) => handleMenuChange(item.id, 'image', e.target.value)} 
                                className="text-4xl bg-slate-100 w-full h-full flex items-center justify-center rounded-2xl text-center focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer" 
                                title="ใส่อีโมจิ"
                              />
                            )}
                            <label className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-1.5 rounded-full cursor-pointer shadow-md hover:bg-orange-600 transition-colors">
                              <Camera size={14} />
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleMenuImageUpload(item.id, e.target.files[0])} />
                            </label>
                            {item.image && item.image.startsWith('http') && (
                              <button onClick={() => handleMenuChange(item.id, 'image', '🍲')} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full shadow-md hover:bg-slate-700">
                                <Trash2 size={12}/>
                              </button>
                            )}
                          </div>

                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={item.name} 
                              onChange={(e) => handleMenuChange(item.id, 'name', e.target.value)} 
                              className="text-xl font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 outline-none w-full mb-1" 
                              placeholder="ชื่อเมนู" 
                            />
                            <input 
                              type="text" 
                              value={item.desc || ''} 
                              onChange={(e) => handleMenuChange(item.id, 'desc', e.target.value)} 
                              className="text-sm text-slate-500 bg-transparent border-b border-dashed border-slate-300 focus:border-orange-500 outline-none w-full mb-2 placeholder:text-slate-300" 
                              placeholder="รายละเอียดเมนู (ถ้ามี)" 
                            />
                            <select 
                              value={item.type || 'main'} 
                              onChange={(e) => handleMenuChange(item.id, 'type', e.target.value)} 
                              className="text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg px-2 py-1 outline-none mb-3"
                            >
                              <option value="main">หมวด: เมนูหลัก (แสดงหน้าแรก)</option>
                              <option value="addon">หมวด: สั่งเพิ่มความอร่อย (Add-on)</option>
                            </select>

                            <div className="flex flex-wrap gap-4 mt-1 text-sm items-center">
                              <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                                ราคาขาย: ฿ <input type="number" value={item.price} onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)} className="w-16 bg-white border border-green-300 rounded px-1 py-0.5 text-center text-green-800 focus:outline-none focus:ring-1 focus:ring-green-500" />
                              </div>
                              <span className="bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">ต้นทุนรวม: ฿{menuCost.toLocaleString()}</span>
                              <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">กำไร: ฿{profit.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 items-end ml-4 shrink-0">
                          <button onClick={() => handleMenuChange(item.id, 'isAvailable', !item.isAvailable)} className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm w-full ${item.isAvailable ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                            {item.isAvailable ? 'เปิดขาย (กดปิด)' : 'ปิดขาย (กดเปิด)'}
                          </button>
                          <button onClick={() => deleteMenuItem(item.id)} className="text-red-400 hover:text-red-600 text-sm font-bold flex items-center gap-1 p-1">
                            <Trash2 size={16}/> ลบเมนู
                          </button>
                        </div>
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

                {/* --- ฟีเจอร์: ยอดสั่งขั้นต่ำ และ ส่งฟรี --- */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><ShoppingBag className="text-emerald-500"/> ตั้งค่าเงื่อนไขการสั่งซื้อ</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                      <label className="text-sm font-bold text-blue-800 block mb-1">ยอดสั่งซื้อขั้นต่ำ (บาท)</label>
                      <p className="text-xs text-blue-600 mb-2">ลูกค้าต้องสั่งครบยอดนี้ถึงจะชำระเงินได้ (ใส่ 0 คือไม่มีขั้นต่ำ)</p>
                      <input type="number" value={data.minOrderAmount} onChange={(e) => setData({...data, minOrderAmount: Number(e.target.value)})} className="w-full p-2.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"/>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <label className="text-sm font-bold text-emerald-800 block mb-1">โปรโมชั่นส่งฟรี เมื่อสั่งครบ (บาท)</label>
                      <p className="text-xs text-emerald-600 mb-2">ค่าส่งจะเป็น 0 บาท เมื่อยอดถึงกำหนด (ใส่ 0 คือไม่จัดโปร)</p>
                      <input type="number" value={data.freeDeliveryThreshold} onChange={(e) => setData({...data, freeDeliveryThreshold: Number(e.target.value)})} className="w-full p-2.5 border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"/>
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

                {/* --- ฟีเจอร์: เปิด/ปิด ร้าน --- */}
                <div className={`p-6 rounded-2xl shadow-sm border transition-colors flex flex-col md:flex-row justify-between items-center gap-4 ${data.isStoreOpen ? 'bg-white border-slate-100' : 'bg-rose-50 border-rose-200'}`}>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${data.isStoreOpen ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
                      สถานะร้านค้า (เปิด/ปิด)
                    </h3>
                    <p className={`text-sm ${data.isStoreOpen ? 'text-slate-500' : 'text-rose-600 font-medium'}`}>
                      {data.isStoreOpen ? 'ร้านกำลังเปิดรับออเดอร์ตามปกติ' : 'ขณะนี้ร้านถูกปิด ลูกค้าจะไม่สามารถกดสั่งอาหารได้'}
                    </p>
                  </div>
                  <button onClick={() => setData({...data, isStoreOpen: !data.isStoreOpen})} className={`px-6 py-3 rounded-xl font-bold transition-all shadow-md ${data.isStoreOpen ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}>
                    {data.isStoreOpen ? 'ปิดร้าน (หยุดรับออเดอร์)' : 'เปิดร้าน (รับออเดอร์)'}
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-lg mb-4">🏪 ข้อมูลร้านค้า & โปรโมชั่น</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-2">เบอร์โทรติดต่อร้าน</label>
                      <input 
                        type="text" 
                        value={data.storePhone || ''} 
                        onChange={(e) => setData({...data, storePhone: e.target.value})} 
                        placeholder="เช่น 081-234-5678" 
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 font-bold" 
                      />
                      <p className="text-xs text-slate-400 mt-2">เบอร์นี้จะไปแสดงที่แถบด้านบนสุดของหน้าร้าน</p>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-600 block mb-2">รูปแบนเนอร์โปรโมชั่น (ถ้ามี)</label>
                      <div className="flex items-center gap-4">
                        {data.storeBanner ? (
                          <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                            <img src={data.storeBanner} alt="Banner" className="w-full h-full object-cover" />
                            <button onClick={() => setData({...data, storeBanner: ''})} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"><Trash2 size={12}/></button>
                          </div>
                        ) : (
                          <div className="w-32 h-20 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-300 text-slate-400 text-xs text-center p-2 shrink-0">ไม่มีแบนเนอร์</div>
                        )}
                        <label className="bg-slate-900 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-bold hover:bg-slate-800 transition-all text-center">
                          อัปโหลดรูป
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBannerUpload(e.target.files[0])} />
                        </label>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">แนะนำรูปแนวนอน (เช่น 800x400 px) จะไปโชว์ด้านบนเมนู</p>
                    </div>
                  </div>
                </div>

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

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">💵 รับเงินสดปลายทาง</h3>
                    <p className="text-sm text-slate-500">หากปิดไว้ ลูกค้าจะถูกบังคับให้สแกนจ่าย QR Code เท่านั้น</p>
                  </div>
                  <button onClick={() => setData({...data, allowCash: !data.allowCash})} className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm ${data.allowCash ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                    {data.allowCash ? 'เปิดรับเงินสด (กดเพื่อปิด)' : 'ปิดรับเงินสด (กดเพื่อเปิด)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
