import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Package, Utensils, LayoutDashboard, Plus, Trash2, Save } from 'lucide-react';

export default function Admin() {
  const [data, setData] = useState({ promptPay: '', materials: [], menuItems: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
  }, []);

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

  // -----------------------------------------
  // 1. ฟังก์ชันจัดการคลังวัตถุดิบ (Inventory)
  // -----------------------------------------
  const handleMaterialChange = (id, field, value) => {
    const updated = data.materials.map(m => m.id === id ? { ...m, [field]: field === 'name' || field === 'unit' ? value : Number(value) } : m);
    setData({ ...data, materials: updated });
  };
  
  const addMaterial = () => {
    const newMat = { id: `mat_${Date.now()}`, name: 'วัตถุดิบใหม่', cost: 0, stock: 0, unit: 'ชิ้น' };
    setData({ ...data, materials: [...data.materials, newMat] });
  };

  const deleteMaterial = (id) => {
    if(confirm('ลบวัตถุดิบนี้? (เมนูที่ผูกสูตรไว้อาจได้รับผลกระทบ)')) {
      setData({ ...data, materials: data.materials.filter(m => m.id !== id) });
    }
  };

  // -----------------------------------------
  // 2. ฟังก์ชันจัดการเมนูหลัก (Menu)
  // -----------------------------------------
  const handleMenuChange = (id, field, value) => {
    const updatedMenu = data.menuItems.map(item =>
      item.id === id ? { ...item, [field]: field === 'price' ? Number(value) : value } : item
    );
    setData({ ...data, menuItems: updatedMenu });
  };

  // -----------------------------------------
  // 3. ฟังก์ชันจัดการสูตรอาหาร (Recipe / BOM)
  // -----------------------------------------
  const handleRecipeChange = (menuId, matId, newQty) => {
    const qty = Number(newQty);
    const updatedMenu = data.menuItems.map(item => {
      if (item.id === menuId) {
        const newRecipe = { ...(item.recipe || {}) };
        if (qty <= 0) {
          delete newRecipe[matId]; // ถ้าใส่เลข 0 หรือติดลบ ให้ลบทิ้ง
        } else {
          newRecipe[matId] = qty;
        }
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
        const newRecipe = { ...(item.recipe || {}), [matId]: 1 }; // ค่าเริ่มต้นคือ 1
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">กำลังโหลดข้อมูลหลังร้าน...</div>;

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
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800'}`}>
              <LayoutDashboard size={20} /> สรุปยอด (Dashboard)
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            
            <div className="flex justify-between items-center mb-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">
                  {activeTab === 'inventory' ? '📦 จัดการคลังวัตถุดิบ' : activeTab === 'menu' ? '🍲 ตั้งค่าเมนู และ ผูกสูตร' : '📊 สรุปยอดขายรายวัน'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">ระบบจัดการหลังร้าน อัปเดตข้อมูลแบบ Real-time</p>
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
                                ราคาขาย: ฿
                                <input 
                                  type="number" 
                                  value={item.price} 
                                  onChange={(e) => handleMenuChange(item.id, 'price', e.target.value)}
                                  className="w-16 bg-white border border-green-300 rounded px-1 py-0.5 text-center text-green-800 focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              </div>
                              <span className="bg-red-50 border border-red-100 text-red-700 px-3 py-1.5 rounded-lg font-medium">ต้นทุนรวม: ฿{menuCost.toLocaleString()}</span>
                              <span className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium">กำไร: ฿{profit.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleMenuChange(item.id, 'isAvailable', !item.isAvailable)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold shadow-sm ${item.isAvailable ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                          {item.isAvailable ? 'เปิดขายอยู่ (กดเพื่อปิด)' : 'ปิดการขาย (กดเพื่อเปิด)'}
                        </button>
                      </div>

                      {/* Recipe (สูตรอาหาร) - ส่วนที่แก้ไขใหม่ ให้ตั้งค่าได้ */}
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                          <Package size={16}/> วัตถุดิบที่ใช้ตัดสต๊อกต่อ 1 การขาย (ผูกสูตร)
                        </p>
                        <div className="flex flex-wrap gap-2 items-center">
                          {/* รายการวัตถุดิบเดิมที่มีอยู่ */}
                          {item.recipe && Object.entries(item.recipe).map(([matId, qty]) => {
                            const matInfo = data.materials.find(m => m.id === matId);
                            if(!matInfo) return null;
                            return (
                              <div key={matId} className="bg-slate-50 border border-slate-200 pl-3 pr-1.5 py-1.5 rounded-lg text-sm flex items-center gap-2 group hover:border-orange-200 transition-colors">
                                <span className="font-medium text-slate-700">{matInfo.name}</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={qty}
                                  onChange={(e) => handleRecipeChange(item.id, matId, e.target.value)}
                                  className="w-12 bg-white border border-slate-300 rounded px-1 text-center font-bold text-slate-800 focus:outline-none focus:border-orange-500"
                                />
                                <span className="text-slate-500 text-xs">{matInfo.unit}</span>
                                <button 
                                  onClick={() => handleRecipeChange(item.id, matId, 0)} 
                                  className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                                  title="ลบวัตถุดิบนี้"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}

                          {/* Dropdown สำหรับเพิ่มวัตถุดิบใหม่เข้าสูตร */}
                          <select 
                            onChange={(e) => {
                              handleAddMaterialToRecipe(item.id, e.target.value);
                              e.target.value = ""; // รีเซ็ตค่าหลังจากเลือกเสร็จ
                            }}
                            className="bg-white border border-dashed border-slate-300 text-slate-600 font-medium text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer hover:bg-slate-50"
                            defaultValue=""
                          >
                            <option value="" disabled>+ เพิ่มวัตถุดิบ</option>
                            {/* แสดงเฉพาะวัตถุดิบที่ยังไม่ได้อยู่ในสูตรของเมนูนี้ */}
                            {data.materials.filter(m => !item.recipe || !item.recipe[m.id]).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
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
                  <button onClick={addMaterial} className="text-sm bg-orange-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-orange-700 shadow-sm">
                    <Plus size={16} /> เพิ่มวัตถุดิบ
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                        <th className="p-4">ชื่อวัตถุดิบ/สินค้า</th>
                        <th className="p-4 w-24">หน่วย</th>
                        <th className="p-4 w-32">ต้นทุน/หน่วย (฿)</th>
                        <th className="p-4 w-32 text-blue-600">สต๊อกคงเหลือ</th>
                        <th className="p-4 w-16 text-center">ลบ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.materials.map(mat => (
                        <tr key={mat.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4"><input type="text" value={mat.name} onChange={(e) => handleMaterialChange(mat.id, 'name', e.target.value)} className="w-full bg-transparent font-bold text-slate-700 focus:outline-none focus:border-b-2 focus:border-orange-500"/></td>
                          <td className="p-4"><input type="text" value={mat.unit} onChange={(e) => handleMaterialChange(mat.id, 'unit', e.target.value)} className="w-full bg-transparent text-slate-500 focus:outline-none"/></td>
                          <td className="p-4"><input type="number" value={mat.cost} onChange={(e) => handleMaterialChange(mat.id, 'cost', e.target.value)} className="w-full bg-white border border-slate-200 p-2 rounded-lg text-center focus:outline-none focus:border-orange-500"/></td>
                          <td className="p-4"><input type="number" value={mat.stock} onChange={(e) => handleMaterialChange(mat.id, 'stock', e.target.value)} className="w-full bg-blue-50 border border-blue-200 p-2 rounded-lg text-center font-bold text-blue-700 focus:outline-none focus:border-blue-500"/></td>
                          <td className="p-4 text-center"><button onClick={() => deleteMaterial(mat.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">💳 เบอร์พร้อมเพย์รับเงิน</h3>
                    <p className="text-sm text-slate-500">เบอร์ที่จะนำไปสร้าง QR Code ให้ลูกค้าสแกนจ่ายเงินหน้าเว็บ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">PromptPay:</span>
                    <input 
                      type="text" 
                      value={data.promptPay} 
                      onChange={(e) => setData({...data, promptPay: e.target.value})}
                      className="border border-slate-300 p-2.5 rounded-lg w-48 text-center font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-2xl shadow-sm text-white">
                    <p className="text-green-100 font-medium mb-1">รายรับวันนี้</p>
                    <h3 className="text-4xl font-bold">฿0 <span className="text-sm font-normal opacity-80">(รอเชื่อมต่อ)</span></h3>
                  </div>
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-sm text-white">
                    <p className="text-red-100 font-medium mb-1">ต้นทุนวัตถุดิบวันนี้</p>
                    <h3 className="text-4xl font-bold">฿0</h3>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-2xl shadow-sm text-white">
                    <p className="text-blue-100 font-medium mb-1">กำไรสุทธิ</p>
                    <h3 className="text-4xl font-bold">฿0</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Package size={20} className="text-orange-500" /> สรุปมูลค่าสต๊อกคงเหลือในร้าน
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="pb-3 font-medium">รายการ</th>
                          <th className="pb-3 font-medium text-center">จำนวนคงเหลือ</th>
                          <th className="pb-3 font-medium text-right">มูลค่าทุนจม (฿)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.materials.map(mat => (
                          <tr key={mat.id}>
                            <td className="py-3 font-medium text-slate-700">{mat.name}</td>
                            <td className="py-3 text-center"><span className={`px-2 py-1 rounded-lg font-bold ${mat.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{mat.stock} {mat.unit}</span></td>
                            <td className="py-3 text-right font-medium text-slate-600">฿{(mat.stock * mat.cost).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
