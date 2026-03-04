import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ShoppingBag, MapPin, Phone, User, Camera, CheckCircle, ChevronRight, Plus, Minus, AlertCircle, Utensils, Map } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState({});
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', addressDetail: '' });
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [slipImage, setSlipImage] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // เก็บข้อมูลเมนู
  const [storeData, setStoreData] = useState({
    promptPay: '0812345678',
    menuItems: [
      { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299, image: '🍲', type: 'main', desc: 'หมูสไลด์นุ่มๆ พร้อมผักรวมและน้ำจิ้มรสเด็ด', isAvailable: true },
      { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true },
      { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true },
      { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true },
      { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true },
    ]
  });

  // พยายามดึงข้อมูลจาก API ถ้ามี (ถ้าไม่มีหรือ Error จะใช้ข้อมูลตั้งต้นด้านบน)
  useEffect(() => {
    fetch('/api/settings')
      .then(res => {
        if (!res.ok) throw new Error('API not ready');
        return res.json();
      })
      .then(data => {
        if (data && data.menuItems) setStoreData(data);
      })
      .catch(err => console.log('กำลังใช้ข้อมูลเมนูตั้งต้น (ออฟไลน์)'));
  }, []);

  const updateCart = (id, delta) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: next };
    });
  };

  const menuItems = storeData.menuItems;
  const PROMPTPAY_NUMBER = storeData.promptPay;

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const getLocation = () => {
    setIsLocating(true);
    setError('');
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setIsLocating(false);
      },
      (err) => {
        setError('กรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง เพื่อให้เราจัดส่งได้ถูกต้องครับ');
        setIsLocating(false);
      }
    );
  };

  const handleProceedToPayment = () => {
    if (!customerInfo.name.trim()) return setError('กรุณากรอกชื่อผู้รับ');
    if (!/^\d{10}$/.test(customerInfo.phone)) return setError('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)');
    if (!location) return setError('กรุณากดแชร์ตำแหน่งที่ตั้งสำหรับจัดส่ง');
    setError('');
    setStep(3);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSlipImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const submitOrder = async () => {
    if (!slipImage) return setError('กรุณาแนบสลิปโอนเงิน');
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerInfo, cart, totalPrice, location, slipImageBase64: slipImage })
      });
      const data = await response.json();
      if (response.ok) setStep(4);
      else setError(data.error || 'ไม่สามารถส่งคำสั่งซื้อได้');
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>หมูจุ่มโตเกียว Delivery</title>
      </Head>
      <div className="min-h-screen bg-[#fff9f5] font-sans text-gray-800 selection:bg-orange-200">
        <header className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-md sticky top-0 z-50 rounded-b-3xl">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-white p-2 rounded-full shadow-sm text-2xl">🍲</div>
                <div>
                  <h1 className="text-xl font-bold leading-tight">หมูจุ่มโตเกียว</h1>
                  <p className="text-xs opacity-90">Delivery ส่งตรงถึงหน้าบ้าน</p>
                </div>
              </div>
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="text-sm bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  ย้อนกลับ
                </button>
              )}
            </div>
          </header>

          <main className="max-w-md mx-auto p-4 pb-24">
            {step < 4 && (
              <div className="flex justify-between items-center mb-6 px-4">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex flex-col items-center relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 transition-colors ${step >= s ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>
                      {s}
                    </div>
                    <span className={`text-[10px] ${step >= s ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                      {s === 1 ? 'เลือกเมนู' : s === 2 ? 'ที่อยู่จัดส่ง' : 'ชำระเงิน'}
                    </span>
                  </div>
                ))}
                <div className="absolute top-[8.5rem] left-1/2 -translate-x-1/2 w-[60%] h-0.5 bg-gray-200 -z-0"></div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6">
                <section>
                  <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Utensils className="text-orange-500" size={20} /> เมนูหลัก
                  </h2>
                  {menuItems.filter(m => m.type === 'main' && m.isAvailable).map(item => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex gap-4 mb-3">
                      <div className="w-24 h-24 bg-orange-50 rounded-xl flex items-center justify-center text-5xl shrink-0">
                        {item.image}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-800">{item.name}</h3>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="font-bold text-orange-600 text-lg">฿{item.price}</span>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-full px-2 py-1">
                            <button onClick={() => updateCart(item.id, -1)} className="w-8 h-8 rounded-full bg-white text-orange-600 shadow-sm flex items-center justify-center"><Minus size={16} /></button>
                            <span className="font-bold w-4 text-center">{cart[item.id] || 0}</span>
                            <button onClick={() => updateCart(item.id, 1)} className="w-8 h-8 rounded-full bg-orange-500 text-white shadow-sm flex items-center justify-center"><Plus size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {menuItems.filter(m => m.type === 'main' && !m.isAvailable).length > 0 && (
                    <p className="text-sm text-red-500 mt-2">*บางเมนูหลักหมดชั่วคราว</p>
                  )}
                </section>

                <section>
                  <h2 className="text-lg font-bold text-gray-800 mb-3">สั่งเพิ่มความอร่อย</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {menuItems.filter(m => m.type === 'addon').map(item => (
                      <div key={item.id} className={`bg-white p-3 rounded-2xl shadow-sm border border-orange-50 flex flex-col items-center text-center ${!item.isAvailable ? 'opacity-50 grayscale' : ''}`}>
                        <div className="text-4xl mb-2">{item.image}</div>
                        <h3 className="font-medium text-sm text-gray-700">{item.name}</h3>
                        <span className="text-orange-600 font-bold text-sm mb-3">+฿{item.price}</span>
                        {!item.isAvailable ? (
                          <span className="text-xs font-bold text-red-500 bg-red-50 w-full py-1.5 rounded-full">หมดชั่วคราว</span>
                        ) : cart[item.id] > 0 ? (
                          <div className="w-full flex items-center justify-between bg-orange-50 rounded-full px-1 py-1">
                            <button onClick={() => updateCart(item.id, -1)} className="w-7 h-7 rounded-full bg-white text-orange-600 shadow-sm flex items-center justify-center"><Minus size={14} /></button>
                            <span className="font-bold text-sm">{cart[item.id]}</span>
                            <button onClick={() => updateCart(item.id, 1)} className="w-7 h-7 rounded-full bg-orange-500 text-white shadow-sm flex items-center justify-center"><Plus size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => updateCart(item.id, 1)} className="w-full py-1.5 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">เพิ่ม</button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><MapPin className="text-orange-500" size={20} /> ข้อมูลจัดส่ง</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อผู้รับ <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="เช่น คุณสมชาย" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์ (10 หลัก) <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="tel" maxLength="10" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl" placeholder="0812345678" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value.replace(/\D/g, '')})} />
                      </div>
                    </div>
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">ตำแหน่งจัดส่ง <span className="text-red-500">*</span></label>
                      {!location ? (
                        <button onClick={getLocation} disabled={isLocating} className="w-full py-4 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl font-medium flex flex-col items-center gap-2"><Map size={24} />{isLocating ? 'กำลังหาพิกัด...' : 'กดเพื่อแชร์ตำแหน่งปัจจุบัน'}</button>
                      ) : (
                        <div className="w-full py-3 px-4 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-green-700"><CheckCircle size={20} /><span className="font-medium text-sm">รับพิกัดสำเร็จเรียบร้อย</span></div>
                          <button onClick={getLocation} className="text-xs text-green-600 underline">อัปเดตใหม่</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียดจุดสังเกต (ถ้ามี)</label>
                      <textarea className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none h-20" placeholder="เช่น ตึก A ชั้น 5" value={customerInfo.addressDetail} onChange={e => setCustomerInfo({...customerInfo, addressDetail: e.target.value})} />
                    </div>
                  </div>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={16} />{error}</div>}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">สรุปรายการสั่งซื้อ</h2>
                  <div className="space-y-2 mb-4">
                    {Object.entries(cart).map(([id, qty]) => {
                      const item = menuItems.find(m => m.id === id);
                      return <div key={id} className="flex justify-between text-sm"><span className="text-gray-600">{qty} x {item.name}</span><span className="font-medium">฿{item.price * qty}</span></div>;
                    })}
                  </div>
                  <div className="flex justify-between items-end pt-3 border-t border-dashed border-gray-200">
                    <span className="font-bold text-gray-800">ยอดชำระสุทธิ</span><span className="text-2xl font-bold text-orange-600">฿{totalPrice}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-orange-100 text-center">
                  <h3 className="font-bold text-gray-800 mb-1">สแกน QR เพื่อชำระเงิน</h3>
                  <div className="bg-blue-900 p-4 rounded-xl inline-block mb-4 w-full max-w-[250px]">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PromptPay-logo.jpg/1200px-PromptPay-logo.jpg" alt="PromptPay" className="h-6 mx-auto mb-3 rounded-sm object-cover" />
                    <div className="bg-white p-2 rounded-lg"><img src={`https://promptpay.io/${PROMPTPAY_NUMBER}/${totalPrice}.png`} alt="QR Code" className="w-full" /></div>
                    <p className="text-white text-sm font-medium mt-3">ยอดเงิน: {totalPrice} บาท</p>
                  </div>

                  <label className="block w-full">
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <div className={`w-full py-4 border-2 border-dashed rounded-xl flex flex-col items-center gap-2 cursor-pointer ${slipImage ? 'border-orange-500 bg-orange-50' : 'border-gray-300 bg-gray-50'}`}>
                      {slipImage ? (
                        <><CheckCircle className="text-orange-500" size={24} /><span className="text-sm font-medium text-orange-700">แนบสลิปเรียบร้อยแล้ว</span><img src={slipImage} alt="Slip" className="h-20 object-contain mt-2" /></>
                      ) : (
                        <><Camera className="text-gray-400" size={28} /><span className="text-sm font-medium text-gray-600">กดเพื่อแนบสลิปโอนเงิน</span></>
                      )}
                    </div>
                  </label>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={16} />{error}</div>}
              </div>
            )}

            {step === 4 && (
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-orange-100 text-center mt-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="text-green-500 w-10 h-10" /></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งออเดอร์สำเร็จ!</h2>
                <p className="text-gray-500 text-sm mb-6">ระบบส่งสลิปและพิกัดจัดส่งให้ทางร้านแล้ว กรุณารอทางร้านติดต่อกลับครับ</p>
                <button onClick={() => window.location.reload()} className="text-orange-600 font-medium text-sm underline">สั่งออเดอร์ใหม่</button>
              </div>
            )}
          </main>

          {step === 1 && totalItems > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-40">
              <div className="max-w-md mx-auto">
                <button onClick={() => setStep(2)} className="w-full bg-orange-600 text-white rounded-2xl p-4 font-bold flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2"><div className="bg-white/20 px-2 py-1 rounded-lg flex items-center gap-1"><ShoppingBag size={18} /><span>{totalItems}</span></div><span>สรุปคำสั่งซื้อ</span></div>
                  <div className="flex items-center gap-1"><span className="text-lg">฿{totalPrice}</span><ChevronRight size={20} /></div>
                </button>
              </div>
            </div>
          )}

          {step > 1 && step < 4 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-40">
            <div className="max-w-md mx-auto">
              {step === 2 ? (
                <button onClick={handleProceedToPayment} className="w-full bg-orange-600 text-white rounded-2xl py-4 font-bold shadow-lg flex justify-center items-center gap-2">ยืนยันข้อมูลจัดส่ง <ChevronRight size={20} /></button>
              ) : (
                <button onClick={submitOrder} disabled={isSubmitting} className={`w-full text-white rounded-2xl py-4 font-bold shadow-lg flex justify-center items-center gap-2 ${isSubmitting ? 'bg-gray-400' : 'bg-green-600'}`}>
                  {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งสลิป ยืนยันคำสั่งซื้อ'} <CheckCircle size={20} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
