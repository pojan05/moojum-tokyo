import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { ShoppingBag, MapPin, Phone, User, Camera, CheckCircle, ChevronRight, Plus, Minus, AlertCircle, Utensils, Map, Ticket } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState({});
  // --- อัปเดตเพิ่ม note (หมายเหตุ) ---
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', addressDetail: '', note: '' });
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [slipImage, setSlipImage] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('promptpay');
  
  const [distanceKm, setDistanceKm] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0); // ค่าส่งตามระยะทาง (ดิบ)
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountError, setDiscountError] = useState('');
  
  // --- อัปเดตเพิ่ม isStoreOpen, minOrderAmount, freeDeliveryThreshold ---
  const [storeData, setStoreData] = useState({
    promptPay: '0812345678', allowCash: false, storePhone: '', storeBanner: '', 
    isStoreOpen: true, minOrderAmount: 0, freeDeliveryThreshold: 0,
    delivery: { storeLat: 0, storeLng: 0, baseFee: 0, ratePerKm: 0 }, discountCodes: [], menuItems: []
  });

  useEffect(() => {
    fetch('/api/settings').then(res => res.json()).then(data => { if (data) setStoreData(data); }).catch(() => {});
  }, []);

  const allowCash = storeData.allowCash || false;
  const storePhone = storeData.storePhone || '';
  const storeBanner = storeData.storeBanner || '';
  // ตัวแปรฟีเจอร์ใหม่
  const isStoreOpen = storeData.isStoreOpen !== false;
  const minOrderAmount = storeData.minOrderAmount || 0;
  const freeDeliveryThreshold = storeData.freeDeliveryThreshold || 0;

  useEffect(() => {
    if (!allowCash && paymentMethod === 'cash') setPaymentMethod('promptpay');
  }, [allowCash, paymentMethod]);

  const updateCart = (id, delta) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const newCart = { ...prev }; delete newCart[id]; return newCart; }
      return { ...prev, [id]: next };
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  const getLocation = () => {
    setIsLocating(true); setError('');
    if (!navigator.geolocation) { setError('เบราว์เซอร์ไม่รองรับ GPS'); setIsLocating(false); return; }
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const userLat = pos.coords.latitude; const userLng = pos.coords.longitude;
        setLocation({ lat: userLat, lng: userLng });
        
        const { storeLat = 0, storeLng = 0, baseFee = 0, ratePerKm = 0 } = storeData.delivery || {};
        
        if (storeLat && storeLng) {
          try {
            const response = await fetch('/api/distance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ origins: `${storeLat},${storeLng}`, destinations: `${userLat},${userLng}` })
            });
            const data = await response.json();
            
            if (data.distance) {
              const dist = data.distance;
              setDistanceKm(dist); 
              setDeliveryFee(Math.ceil(baseFee + (dist * ratePerKm)));
            } else {
              const fallbackDist = calculateDistance(storeLat, storeLng, userLat, userLng);
              setDistanceKm(fallbackDist); 
              setDeliveryFee(Math.ceil(baseFee + (fallbackDist * ratePerKm)));
            }
          } catch (err) {
            const fallbackDist = calculateDistance(storeLat, storeLng, userLat, userLng);
            setDistanceKm(fallbackDist); 
            setDeliveryFee(Math.ceil(baseFee + (fallbackDist * ratePerKm)));
          }
        } else {
          setDistanceKm(0); setDeliveryFee(baseFee);
        }
        setIsLocating(false);
      },
      () => { setError('กรุณาอนุญาตการเข้าถึงตำแหน่ง (Location)'); setIsLocating(false); }
    );
  };

  const menuItems = storeData.menuItems || [];
  const PROMPTPAY_NUMBER = storeData.promptPay;
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalFoodPrice = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = menuItems.find(m => m.id === id); return sum + (item ? item.price * qty : 0);
  }, 0);
  
  // --- ระบบคำนวณโปรโมชั่นส่งฟรี ---
  const isFreeDelivery = freeDeliveryThreshold > 0 && totalFoodPrice >= freeDeliveryThreshold;
  const activeDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
  
  const handleApplyDiscount = () => {
    if (!discountInput.trim()) return;
    const codeObj = storeData.discountCodes?.find(c => c.code === discountInput.toUpperCase() && c.isActive);
    if (codeObj) { setAppliedDiscount(codeObj); setDiscountError(''); } 
    else { setAppliedDiscount(null); setDiscountError('โค้ดไม่ถูกต้อง หรือหมดอายุแล้ว'); }
  };

  const discountAmount = appliedDiscount ? Math.floor((activeDeliveryFee * appliedDiscount.percent) / 100) : 0;
  const finalTotalPrice = totalFoodPrice + activeDeliveryFee - discountAmount;

  const handleProceedToPayment = () => {
    if (!customerInfo.name.trim()) return setError('กรุณากรอกชื่อผู้รับ');
    if (!/^\d{10}$/.test(customerInfo.phone)) return setError('กรุณากรอกเบอร์โทร 10 หลัก');
    if (!location) return setError('กรุณากดแชร์ตำแหน่งที่ตั้งจัดส่ง');
    setError(''); setStep(3);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setSlipImage(reader.result); reader.readAsDataURL(file); }
  };

  const submitOrder = async () => {
    if (paymentMethod === 'promptpay' && !slipImage) return setError('กรุณาแนบรูปสลิปโอนเงิน');
    setIsSubmitting(true); setError('');
    try {
      const orderDetails = Object.entries(cart).map(([id, qty]) => {
        const item = menuItems.find(m => m.id === id); return { name: item ? item.name : id, qty: qty };
      });
      // --- อัปเดตการแสดงค่าจัดส่งในบิล ---
      if (activeDeliveryFee > 0) orderDetails.push({ name: `🛵 ค่าจัดส่ง (${distanceKm.toFixed(1)} กม.)`, qty: 1 });
      else if (isFreeDelivery && distanceKm > 0) orderDetails.push({ name: `🛵 ค่าจัดส่ง (โปรโมชั่นส่งฟรี!)`, qty: 1 });
      
      if (appliedDiscount && activeDeliveryFee > 0) orderDetails.push({ name: `🎟️ ส่วนลดค่าส่ง (-${appliedDiscount.percent}%)`, qty: 1 });

      let finalSlipUrl = 'CASH_ON_DELIVERY';
      if (paymentMethod === 'promptpay') {
        const formData = new FormData(); formData.append('image', slipImage.split(',')[1]);
        const imgRes = await fetch(`https://api.imgbb.com/1/upload?key=5f481fd2d9b156fc69bbc59eafb656ff`, { method: 'POST', body: formData });
        const imgData = await imgRes.json();
        if (!imgData.success) throw new Error('อัปโหลดสลิปไม่สำเร็จ');
        finalSlipUrl = imgData.data.url;
      }
      
      const response = await fetch('/api/send-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerInfo, 
          orderDetails, 
          totalPrice: finalTotalPrice, 
          location, 
          slipImageUrl: finalSlipUrl,
          paymentMethod: paymentMethod === 'cash' ? 'เงินสดปลายทาง' : 'โอนเงิน (พร้อมเพย์)'
        })
      });
      if (response.ok) setStep(4); else setError((await response.json()).error || 'ส่งคำสั่งซื้อไม่สำเร็จ');
    } catch (err) { setError('ขัดข้องในการเชื่อมต่อ กรุณาลองใหม่'); } 
    finally { setIsSubmitting(false); }
  };

  return (
    <>
      <Head>
        <title>หมูจุ่มโตเกียว Delivery</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/>
      </Head>
      <div className="min-h-screen bg-[#f8f9fa] font-sans text-slate-800 pb-32">
        {/* Header - Sticky */}
        <header className="bg-gradient-to-r from-orange-500 to-rose-500 text-white p-4 shadow-md sticky top-0 z-50 rounded-b-3xl">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner backdrop-blur-sm text-2xl">🍲</div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">หมูจุ่มโตเกียว</h1>
                {storePhone ? (
                  <div className="flex items-center gap-1.5 text-sm font-medium opacity-90 mt-0.5 bg-black/10 px-2 py-0.5 rounded-full w-fit">
                    <Phone size={12} /> <span>{storePhone}</span>
                  </div>
                ) : (
                  <p className="text-xs font-medium opacity-90">Delivery ส่งตรงถึงบ้าน</p>
                )}
              </div>
            </div>
            {step > 1 && step < 4 && (
              <button onClick={() => setStep(step - 1)} className="text-sm bg-black/10 hover:bg-black/20 px-4 py-2 rounded-full font-bold transition-all backdrop-blur-sm">กลับ</button>
            )}
          </div>
        </header>

        <main className="max-w-md mx-auto p-4">
          
          {step < 4 && (
            <div className="flex justify-between items-center mb-6 px-6 relative">
              <div className="absolute top-4 left-10 right-10 h-1 bg-slate-200 -z-10 rounded-full"></div>
              <div className={`absolute top-4 left-10 h-1 rounded-full transition-all duration-300 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2 bg-orange-500' : 'w-full bg-orange-500'} -z-10`}></div>
              {[1, 2, 3].map(s => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm transition-all duration-300 ${step >= s ? 'bg-orange-500 text-white scale-110' : 'bg-white text-slate-400 border-2 border-slate-200'}`}>{s}</div>
                  <span className={`text-[11px] font-bold ${step >= s ? 'text-orange-600' : 'text-slate-400'}`}>{s === 1 ? 'เลือกเมนู' : s === 2 ? 'ที่อยู่' : 'ชำระเงิน'}</span>
                </div>
              ))}
            </div>
          )}

          {/* STEP 1: เมนู */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* --- ฟีเจอร์: แจ้งเตือนปิดร้าน --- */}
              {!isStoreOpen && (
                <div className="bg-rose-100 border border-rose-200 text-rose-700 p-4 rounded-2xl font-bold text-center flex items-center justify-center gap-2 shadow-sm animate-pulse">
                  <AlertCircle size={20} /> ขณะนี้ร้านปิดให้บริการ เปิดรับออเดอร์อีกครั้งพรุ่งนี้
                </div>
              )}

              {/* --- ฟีเจอร์: บาร์แจ้งยอดส่งฟรี (Upsell) --- */}
              {freeDeliveryThreshold > 0 && isStoreOpen && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2"><div className="bg-emerald-200 p-1.5 rounded-full"><ShoppingBag size={14} /></div> ส่งฟรีเมื่อสั่งครบ ฿{freeDeliveryThreshold}!</div>
                  {isFreeDelivery ? (
                    <span className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-xs">ได้สิทธิ์ส่งฟรี 🛵</span>
                  ) : (
                    <span className="text-emerald-600 text-xs bg-emerald-100 px-2 py-1 rounded-lg">ขาดอีก ฿{freeDeliveryThreshold - totalFoodPrice}</span>
                  )}
                </div>
              )}

              {storeBanner && (
                <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                  <img src={storeBanner} alt="Promotion Banner" className="w-full h-auto object-cover" />
                </div>
              )}

              <section>
                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Utensils className="text-orange-500" size={22} /> เมนูหลัก</h2>
                {menuItems.filter(m => m.type === 'main' && m.isAvailable).map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4 mb-4 active:scale-[0.98] transition-transform">
                    <div className="w-28 h-28 bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl flex items-center justify-center text-6xl shrink-0 shadow-inner overflow-hidden">
                      {item.image?.startsWith('http') ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : item.image}
                    </div>
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-tight">{item.name}</h3>
                        <p className="text-xs text-slate-500 mt-1.5 leading-snug line-clamp-2">{item.desc}</p>
                      </div>
                      <div className="flex justify-between items-end mt-2">
                        <span className="font-black text-orange-600 text-xl tracking-tight">฿{item.price}</span>
                        <div className="flex items-center gap-3 bg-slate-50 rounded-full p-1 shadow-sm border border-slate-100">
                          <button onClick={() => updateCart(item.id, -1)} disabled={!isStoreOpen} className={`w-8 h-8 rounded-full bg-white text-orange-600 shadow-sm flex items-center justify-center ${!isStoreOpen ? 'opacity-50 cursor-not-allowed' : 'active:bg-orange-100'}`}><Minus size={18} /></button>
                          <span className="font-bold w-4 text-center text-slate-700">{cart[item.id] || 0}</span>
                          <button onClick={() => updateCart(item.id, 1)} disabled={!isStoreOpen} className={`w-8 h-8 rounded-full bg-orange-500 text-white shadow-sm flex items-center justify-center ${!isStoreOpen ? 'opacity-50 cursor-not-allowed' : 'active:bg-orange-600'}`}><Plus size={18} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><Plus className="text-orange-500" size={22} /> สั่งเพิ่มความอร่อย</h2>
                <div className="grid grid-cols-2 gap-3">
                  {menuItems.filter(m => m.type === 'addon').map(item => (
                    <div key={item.id} className={`bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center relative ${!item.isAvailable ? 'opacity-60 grayscale' : ''}`}>
                      <div className="w-16 h-16 mb-3 flex items-center justify-center text-5xl bg-transparent rounded-full overflow-hidden">
                        {item.image?.startsWith('http') ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : item.image}
                      </div>
                      <h3 className="font-bold text-sm text-slate-700 leading-tight mb-1">{item.name}</h3>
                      <span className="text-orange-600 font-black text-sm mb-4">+฿{item.price}</span>
                      
                      {!item.isAvailable ? (
                        <span className="text-xs font-bold text-rose-500 bg-rose-50 w-full py-2 rounded-xl">หมดชั่วคราว</span>
                      ) : cart[item.id] > 0 ? (
                        <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-full p-1 shadow-inner">
                          <button onClick={() => updateCart(item.id, -1)} disabled={!isStoreOpen} className={`w-8 h-8 rounded-full bg-white text-orange-600 shadow-sm flex items-center justify-center ${!isStoreOpen ? 'opacity-50' : 'active:bg-orange-100'}`}><Minus size={16} /></button>
                          <span className="font-bold text-sm text-slate-700">{cart[item.id]}</span>
                          <button onClick={() => updateCart(item.id, 1)} disabled={!isStoreOpen} className={`w-8 h-8 rounded-full bg-orange-500 text-white shadow-sm flex items-center justify-center ${!isStoreOpen ? 'opacity-50' : 'active:bg-orange-600'}`}><Plus size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => updateCart(item.id, 1)} disabled={!isStoreOpen} className={`w-full py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-bold transition-colors ${!isStoreOpen ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-100'}`}>เพิ่มลงตะกร้า</button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* STEP 2: ที่อยู่ */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 mb-5 flex items-center gap-2"><MapPin className="text-orange-500" size={22} /> ข้อมูลจัดส่ง</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อผู้รับ <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-[16px]" placeholder="เช่น คุณสมชาย" value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">เบอร์โทรศัพท์ (10 หลัก) <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input type="tel" maxLength="10" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-[16px]" placeholder="0812345678" value={customerInfo.phone} onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value.replace(/\D/g, '')})} />
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-bold text-slate-700 mb-2">ตำแหน่งจัดส่ง <span className="text-rose-500">*</span></label>
                    {!location ? (
                      <button onClick={getLocation} disabled={isLocating} className="w-full py-5 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl font-bold flex flex-col items-center gap-2 hover:bg-blue-100 transition-colors active:scale-[0.98]">
                        <Map size={28} className={isLocating ? 'animate-bounce' : ''} />
                        {isLocating ? 'กำลังค้นหาพิกัด GPS...' : 'กดเพื่อแชร์ตำแหน่งปัจจุบัน'}
                      </button>
                    ) : (
                      <div className="w-full p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 text-emerald-700 mb-1"><CheckCircle size={20} /><span className="font-bold text-sm">ปักหมุดสำเร็จ</span></div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg self-start">ระยะทาง {distanceKm.toFixed(1)} กม. | ค่าส่ง {isFreeDelivery ? 'ฟรี' : `฿${deliveryFee}`}</span>
                        </div>
                        <button onClick={getLocation} className="text-xs font-black text-emerald-700 bg-emerald-200 px-3 py-2 rounded-xl hover:bg-emerald-300 active:scale-95 transition-all">ปักหมุดใหม่</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">รายละเอียดจุดสังเกต (ถ้ามี)</label>
                    <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-[16px]" placeholder="เช่น ตึก A ชั้น 5, หน้าหมู่บ้าน" value={customerInfo.addressDetail} onChange={e => setCustomerInfo({...customerInfo, addressDetail: e.target.value})} />
                  </div>
                  {/* --- ฟีเจอร์: หมายเหตุถึงร้าน --- */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">หมายเหตุถึงร้าน (ถ้ามี)</label>
                    <textarea className="w-full p-4 bg-orange-50/50 border border-orange-200 rounded-2xl resize-none h-20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-[16px]" placeholder="เช่น ขอช้อนส้อมเพิ่ม, ไม่ทานเผ็ด, หมูสะเต๊ะเกรียมๆ" value={customerInfo.note} onChange={e => setCustomerInfo({...customerInfo, note: e.target.value})} />
                  </div>
                </div>
              </div>
              {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in"><AlertCircle size={20} shrink-0 />{error}</div>}
            </div>
          )}

          {/* Step 3: ชำระเงิน */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                <label className="block text-sm font-black text-slate-700 mb-3 flex items-center gap-2"><Ticket size={20} className="text-blue-500"/> โค้ดส่วนลดค่าจัดส่ง</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="กรอกโค้ดที่นี่" value={discountInput} onChange={e => setDiscountInput(e.target.value.toUpperCase())} className="flex-1 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-black text-blue-700 tracking-wider text-[16px]" disabled={activeDeliveryFee === 0} />
                  <button onClick={handleApplyDiscount} disabled={activeDeliveryFee === 0} className={`px-6 rounded-2xl text-sm font-bold transition-all shadow-md ${activeDeliveryFee === 0 ? 'bg-slate-300 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'}`}>ใช้โค้ด</button>
                </div>
                {activeDeliveryFee === 0 && <p className="text-xs text-emerald-500 mt-2 font-bold pl-1">ออเดอร์นี้ได้สิทธิ์ส่งฟรีไปแล้ว 🛵</p>}
                {discountError && <p className="text-xs text-rose-500 mt-2 font-bold pl-1">{discountError}</p>}
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-black text-slate-800 mb-4 pb-3 border-b border-slate-100">สรุปออเดอร์</h2>
                <div className="space-y-3 mb-5">
                  {Object.entries(cart).map(([id, qty]) => {
                    const item = menuItems.find(m => m.id === id);
                    return <div key={id} className="flex justify-between text-sm items-center"><span className="text-slate-600 font-medium"><span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded mr-2">{qty}x</span> {item ? item.name : id}</span><span className="font-bold text-slate-800">฿{item ? item.price * qty : 0}</span></div>;
                  })}
                  <div className="border-t border-dashed border-slate-200 pt-3 mt-3 space-y-2">
                    <div className="flex justify-between text-sm items-center"><span className="text-slate-500 font-medium">🛵 ค่าจัดส่ง ({distanceKm.toFixed(1)} กม.)</span><span className="font-bold text-slate-800">{isFreeDelivery ? <span className="text-emerald-500">ส่งฟรี</span> : `฿${activeDeliveryFee}`}</span></div>
                    {appliedDiscount && activeDeliveryFee > 0 && <div className="flex justify-between text-sm items-center text-emerald-600 bg-emerald-50 p-2 rounded-xl mt-1"><span className="font-bold flex items-center gap-1"><Ticket size={14}/> ส่วนลด ({appliedDiscount.code})</span><span className="font-black">-฿{discountAmount}</span></div>}
                  </div>
                </div>
                <div className="flex justify-between items-end pt-4 border-t-2 border-slate-100">
                  <span className="font-black text-slate-800">ยอดชำระสุทธิ</span><span className="text-3xl font-black text-orange-600 tracking-tight">฿{finalTotalPrice}</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-800 mb-4 pb-2 border-b border-slate-100">เลือกวิธีชำระเงิน</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button onClick={() => setPaymentMethod('promptpay')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'promptpay' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-100 bg-white text-slate-500'}`}>
                    <span className="text-3xl">📱</span>
                    <span className="font-bold text-sm">โอนเงิน (QR)</span>
                  </button>
                  {allowCash && (
                    <button onClick={() => setPaymentMethod('cash')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-white text-slate-500'}`}>
                      <span className="text-3xl">💵</span>
                      <span className="font-bold text-sm">เงินสดปลายทาง</span>
                    </button>
                  )}
                </div>

                {paymentMethod === 'promptpay' ? (
                  <div className="animate-in fade-in duration-300 text-center">
                    <p className="text-xs text-slate-500 mb-4">สแกนผ่านแอปธนาคารใดก็ได้</p>
                    <div className="bg-slate-900 p-5 rounded-3xl inline-block mb-6 w-full max-w-[260px] shadow-lg">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/PromptPay-logo.jpg/1200px-PromptPay-logo.jpg" alt="PromptPay" className="h-7 mx-auto mb-4 rounded-md object-cover" />
                      <div className="bg-white p-3 rounded-2xl"><img src={`https://promptpay.io/${PROMPTPAY_NUMBER}/${finalTotalPrice}.png`} alt="QR Code" className="w-full rounded-xl" /></div>
                      <p className="text-white text-base font-black mt-4">ยอดโอน: {finalTotalPrice} บาท</p>
                    </div>

                    <label className="block w-full">
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      <div className={`w-full py-6 border-2 border-dashed rounded-3xl flex flex-col items-center gap-3 cursor-pointer transition-all ${slipImage ? 'border-orange-500 bg-orange-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                        {slipImage ? (
                          <><CheckCircle className="text-orange-500" size={32} /><span className="text-base font-black text-orange-700">แนบสลิปเรียบร้อยแล้ว</span><img src={slipImage} alt="Slip" className="h-24 object-contain mt-2 rounded-xl shadow-sm border border-orange-200" /></>
                        ) : (
                          <><Camera className="text-slate-400" size={36} /><span className="text-base font-bold text-slate-600">กดเพื่อแนบรูปสลิปโอนเงิน</span></>
                        )}
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl text-center animate-in zoom-in-95 duration-300">
                    <div className="text-5xl mb-3">🛵</div>
                    <h3 className="font-black text-emerald-800 mb-2">ชำระเงินปลายทาง</h3>
                    <p className="text-sm text-emerald-600">กรุณาเตรียมเงินสด <b className="text-lg">฿{finalTotalPrice}</b><br/>เพื่อชำระกับไรเดอร์เมื่อได้รับอาหารครับ</p>
                  </div>
                )}
              </div>
              
              {error && <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold animate-in fade-in"><AlertCircle size={20} shrink-0 />{error}</div>}
            </div>
          )}

          {/* Step 4: สำเร็จ */}
          {step === 4 && (
            <div className="bg-white p-10 rounded-3xl shadow-xl border border-emerald-100 text-center mt-12 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle className="text-emerald-500 w-12 h-12" /></div>
              <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">ส่งออเดอร์สำเร็จ!</h2>
              <p className="text-slate-500 text-base mb-8 leading-relaxed">ระบบส่งข้อมูลและพิกัดจัดส่งให้ทางร้านแล้ว<br/>กรุณารอรับอาหารได้เลยครับ 🛵💨</p>
              <button onClick={() => window.location.reload()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold transition-colors">สั่งออเดอร์ใหม่</button>
            </div>
          )}
        </main>

        {/* Floating Bottom Bar */}
        {step === 1 && totalItems > 0 && (
          <div className="fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300 max-w-md mx-auto">
            {/* --- ฟีเจอร์: ล็อกปุ่มเมื่อร้านปิด หรือ ยอดไม่ถึง --- */}
            {!isStoreOpen ? (
              <button disabled className="w-full bg-slate-400 text-white rounded-3xl p-4 px-6 font-black flex items-center justify-center shadow-lg cursor-not-allowed">
                ร้านปิดให้บริการชั่วคราว
              </button>
            ) : totalFoodPrice < minOrderAmount ? (
              <button disabled className="w-full bg-slate-300 text-slate-500 rounded-3xl p-3 px-6 font-bold flex flex-col items-center justify-center shadow-lg cursor-not-allowed">
                <span>สั่งขั้นต่ำ ฿{minOrderAmount}</span>
                <span className="text-xs font-medium text-rose-500">ยังขาดอีก ฿{minOrderAmount - totalFoodPrice}</span>
              </button>
            ) : (
              <button onClick={() => setStep(2)} className="w-full bg-slate-900 text-white rounded-3xl p-4 px-6 font-black flex items-center justify-between shadow-2xl hover:bg-slate-800 active:scale-[0.98] transition-all border border-slate-700">
                <div className="flex items-center gap-3"><div className="bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-inner">{totalItems}</div><span className="text-base">ดูตะกร้าสินค้า</span></div>
                <div className="flex items-center gap-1"><span className="text-xl">฿{totalFoodPrice}</span><ChevronRight size={24} className="opacity-70" /></div>
              </button>
            )}
          </div>
        )}

        {step > 1 && step < 4 && (
        <div className="fixed bottom-6 left-4 right-4 z-40 animate-in slide-in-from-bottom-10 fade-in max-w-md mx-auto">
          {step === 2 ? (
            <button onClick={handleProceedToPayment} className="w-full bg-slate-900 text-white rounded-3xl py-4.5 font-black shadow-2xl flex justify-center items-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all text-lg">ไปหน้าชำระเงิน <ChevronRight size={22} /></button>
          ) : (
            <button onClick={submitOrder} disabled={isSubmitting} className={`w-full text-white rounded-3xl py-4.5 font-black shadow-2xl flex justify-center items-center gap-2 transition-all text-lg ${isSubmitting ? 'bg-slate-400 scale-100' : paymentMethod === 'cash' ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]' : 'bg-orange-600 hover:bg-orange-700 active:scale-[0.98]'}`}>
              {isSubmitting ? 'กำลังส่งข้อมูล...' : paymentMethod === 'cash' ? 'ยืนยันสั่งอาหาร (จ่ายเงินสด)' : 'ส่งสลิป ยืนยันคำสั่งซื้อ'} 
              {!isSubmitting && <CheckCircle size={22} />}
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
}
