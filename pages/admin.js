import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Admin() {
  const [data, setData] = useState({ promptPay: '', menuItems: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ดึงข้อมูลเมื่อเปิดหน้าเว็บ
  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(fetchedData => {
        setData(fetchedData);
        setIsLoading(false);
      });
  }, []);

  const handlePriceChange = (id, newPrice) => {
    const updatedMenu = data.menuItems.map(item => 
      item.id === id ? { ...item, price: Number(newPrice) } : item
    );
    setData({ ...data, menuItems: updatedMenu });
  };

  const toggleAvailability = (id) => {
    const updatedMenu = data.menuItems.map(item => 
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    setData({ ...data, menuItems: updatedMenu });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    alert('บันทึกข้อมูลเรียบร้อยแล้ว!');
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <>
      <Head>
        <title>จัดการหลังร้าน - หมูจุ่มโตเกียว</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </Head>
      <div className="min-h-screen bg-gray-50 p-6 font-sans">
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">⚙️ ระบบจัดการหลังร้าน</h1>
            <button 
              onClick={saveSettings} 
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:bg-gray-400"
            >
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>

          <section className="mb-8">
            <h2 className="text-lg font-bold mb-2">ตั้งค่าการชำระเงิน</h2>
            <label className="block text-sm text-gray-600 mb-1">เบอร์พร้อมเพย์รับเงิน</label>
            <input 
              type="text" 
              value={data.promptPay} 
              onChange={(e) => setData({...data, promptPay: e.target.value})}
              className="w-full p-3 border rounded-lg max-w-sm"
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-4">จัดการเมนูอาหาร</h2>
            <div className="space-y-4">
              {data.menuItems.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-4 border rounded-xl ${!item.isAvailable ? 'bg-gray-100 opacity-60' : ''}`}>
                  <div className="flex items-center gap-3 w-1/2">
                    <span className="text-2xl">{item.image}</span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 w-1/2 justify-end">
                    <div className="flex items-center gap-2">
                      <span>฿</span>
                      <input 
                        type="number" 
                        value={item.price} 
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className="w-20 p-2 border rounded-md text-center"
                      />
                    </div>
                    <button 
                      onClick={() => toggleAvailability(item.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold w-24 ${item.isAvailable ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}
                    >
                      {item.isAvailable ? 'ปิดการขาย' : 'เปิดการขาย'}
                    </button>
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
