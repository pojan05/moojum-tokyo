import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [data, setData] = useState({ promptPay: '', menuItems: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(fetchedData => {
        // จัดการกรณีของเก่าไม่มีฟิลด์ cost และ stock
        const updatedMenuItems = fetchedData.menuItems.map(item => ({
          ...item,
          cost: item.cost || 0,
          stock: item.stock || 0
        }));
        setData({ ...fetchedData, menuItems: updatedMenuItems });
        setIsLoading(false);
      });
  }, []);

  // ฟังก์ชันเดียวจัดการแก้ไขได้ทั้ง ราคา, ต้นทุน, สต๊อก และ สถานะเปิด/ปิด
  const handleItemChange = (id, field, value) => {
    const updatedMenu = data.menuItems.map(item => 
      item.id === id ? { ...item, [field]: field === 'isAvailable' ? value : Number(value) } : item
    );
    setData({ ...data, menuItems: updatedMenu });
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
      
      if (response.ok) {
        alert('✅ ' + result.message);
      } else {
        alert('❌ ไม่สามารถบันทึกได้: ' + result.message);
      }
    } catch (error) {
      alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-10 text-center text-gray-600">กำลังโหลดข้อมูลหลังร้าน...</div>;

  return (
    <>
      <Head>
        <title>จัดการหลังร้าน - หมูจุ่มโตเกียว</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <div className="min-h-screen bg-gray-50 p-6 font-sans">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-gray-800">⚙️ ระบบจัดการหลังร้าน</h1>
            <button 
              onClick={saveSettings} 
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400 shadow-sm transition-all"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>

          <section className="mb-8 bg-orange-50 p-4 rounded-xl border border-orange-100">
            <h2 className="text-lg font-bold mb-2 text-orange-800">ตั้งค่าการชำระเงิน</h2>
            <label className="block text-sm text-gray-700 mb-1 font-medium">เบอร์พร้อมเพย์รับเงิน</label>
            <input 
              type="text" 
              value={data.promptPay} 
              onChange={(e) => setData({...data, promptPay: e.target.value})}
              className="w-full p-3 border border-orange-200 rounded-lg max-w-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4 text-gray-800">จัดการเมนู สต๊อก และต้นทุน</h2>
            <div className="space-y-4">
              {data.menuItems.map(item => (
                <div key={item.id} className={`flex flex-col p-4 border border-gray-200 rounded-xl transition-all ${!item.isAvailable ? 'bg-gray-50 opacity-70 grayscale-[30%]' : 'bg-white shadow-sm'}`}>
                  
                  {/* ส่วนหัว: ชื่อเมนู และ ปุ่มเปิด/ปิด */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{item.image}</span>
                      <span className="font-bold text-gray-800 text-lg">{item.name}</span>
                    </div>
                    <button 
                      onClick={() => handleItemChange(item.id, 'isAvailable', !item.isAvailable)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold w-28 text-center ${item.isAvailable ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                    >
                      {item.isAvailable ? 'ปิดการขาย' : 'เปิดการขาย'}
                    </button>
                  </div>
                  
                  {/* ส่วนข้อมูล: ราคา, ต้นทุน, สต๊อก */}
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">ราคาขาย (฿)</label>
                      <input 
                        type="number" 
                        value={item.price} 
                        onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                        className="w-full p-2 border rounded-md text-center focus:outline-none focus:border-orange-500 font-medium text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block">ต้นทุน (฿)</label>
                      <input 
                        type="number" 
                        value={item.cost} 
                        onChange={(e) => handleItemChange(item.id, 'cost', e.target.value)}
                        className="w-full p-2 border rounded-md text-center focus:outline-none focus:border-orange-500 font-medium text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1 block text-blue-600">สต๊อกคงเหลือ</label>
                      <input 
                        type="number" 
                        value={item.stock} 
                        onChange={(e) => handleItemChange(item.id, 'stock', e.target.value)}
                        className="w-full p-2 border border-blue-200 rounded-md text-center focus:outline-none focus:border-blue-500 font-bold text-blue-700 bg-white"
                      />
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
