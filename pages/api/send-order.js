import Redis from 'ioredis';

// ดึงรหัสผ่านฐานข้อมูล (REDIS_URL)
const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    // รับค่า paymentMethod ที่ส่งมาจากหน้าเว็บเพิ่ม
    const { customerInfo, orderDetails, totalPrice, location, slipImageUrl, paymentMethod } = body;

    if (!redis) return res.status(500).json({ error: 'ฐานข้อมูลยังไม่ได้เชื่อมต่อ (REDIS_URL)' });

    const settingsStr = await redis.get('storeSettings');
    if (!settingsStr) return res.status(500).json({ error: 'ไม่พบข้อมูลการตั้งค่าร้านค้า' });
    
    const settings = JSON.parse(settingsStr);
    let updatedMaterials = [...settings.materials];
    let orderCost = 0;

    for (const item of orderDetails) {
      const menu = settings.menuItems.find(m => m.name === item.name);
      if (menu && menu.recipe) {
        Object.entries(menu.recipe).forEach(([matId, qtyPerUnit]) => {
          const totalQtyToDeduct = qtyPerUnit * item.qty;
          const matIndex = updatedMaterials.findIndex(m => m.id === matId);
          if (matIndex !== -1) {
            updatedMaterials[matIndex].stock -= totalQtyToDeduct;
            orderCost += (updatedMaterials[matIndex].cost * totalQtyToDeduct);
          }
        });
      }
    }

    await redis.set('storeSettings', JSON.stringify({ ...settings, materials: updatedMaterials }));

    const today = new Date().toISOString().split('T')[0];
    const saleData = {
      time: new Date().toLocaleTimeString('th-TH'),
      customer: customerInfo.name,
      total: totalPrice,
      cost: orderCost,
      profit: totalPrice - orderCost,
      items: orderDetails,
      paymentMethod: paymentMethod || 'โอนเงิน (พร้อมเพย์)'
    };
    await redis.lpush(`sales:${today}`, JSON.stringify(saleData));

    const LINE_TOKEN = (process.env.LINE_TOKEN || '').trim();
    const LINE_USER_ID = (process.env.LINE_USER_ID || '').trim();
    
    // แก้ไขลิงก์ Maps ให้ถูกต้องและรองรับมือถือได้ดีขึ้น
    const mapLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    
    let orderText = orderDetails.map(i => `- ${i.name} x ${i.qty}`).join('\n');
    
    // เพิ่มบรรทัด หมายเหตุ และ วิธีชำระเงิน
    const msg = `🚨 ออเดอร์ใหม่ (ตัดสต๊อกแล้ว) 🚨\n\n👤 ลูกค้า: ${customerInfo.name}\n📞 โทร: ${customerInfo.phone}\n📍 พิกัด: ${mapLink}\n🧭 จุดสังเกต: ${customerInfo.addressDetail || '-'}\n📝 หมายเหตุ: ${customerInfo.note || '-'}\n\n🛒 รายการ:\n${orderText}\n\n💵 วิธีชำระเงิน: ${paymentMethod || 'โอนเงิน (พร้อมเพย์)'}\n💰 ยอดสุทธิ: ${totalPrice} บาท\n📈 กำไรออเดอร์นี้: ${saleData.profit} บาท`;

    // เตรียม Array ของข้อความ (ถ้าเป็นเงินสดปลายทาง จะไม่ส่งรูป)
    const messages = [{ type: 'text', text: msg }];
    if (slipImageUrl && slipImageUrl !== 'CASH_ON_DELIVERY') {
      messages.push({ type: 'image', originalContentUrl: slipImageUrl, previewImageUrl: slipImageUrl });
    }

    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: LINE_USER_ID, messages: messages })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('ERROR:', e);
    return res.status(500).json({ error: 'ระบบขัดข้อง แต่คุณอาจได้รับแจ้งเตือน LINE แล้ว' });
  }
}
