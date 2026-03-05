import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = (redisUrl && redisToken) ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const { customerInfo, orderDetails, totalPrice, location, slipImageUrl } = body;

    if (!redis) return res.status(500).json({ error: 'ฐานข้อมูลยังไม่ได้เชื่อมต่อ (Connect)' });

    // 1. ดึงข้อมูลการตั้งค่าปัจจุบัน (สต๊อก และ สูตร)
    const settings = await redis.get('storeSettings');
    if (!settings) return res.status(500).json({ error: 'ไม่พบข้อมูลการตั้งค่าร้านค้า' });

    let updatedMaterials = [...settings.materials];
    let orderCost = 0;

    // 2. คำนวณการตัดสต๊อกตามออเดอร์
    for (const item of orderDetails) {
      // ค้นหาเมนูเพื่อดูสูตร (Recipe)
      const menu = settings.menuItems.find(m => m.name === item.name);
      if (menu && menu.recipe) {
        // วนลูปตามสูตรของเมนูนั้นๆ
        Object.entries(menu.recipe).forEach(([matId, qtyPerUnit]) => {
          const totalQtyToDeduct = qtyPerUnit * item.qty;
          const matIndex = updatedMaterials.findIndex(m => m.id === matId);
          
          if (matIndex !== -1) {
            // ตัดสต๊อก
            updatedMaterials[matIndex].stock -= totalQtyToDeduct;
            // สะสมต้นทุน
            orderCost += (updatedMaterials[matIndex].cost * totalQtyToDeduct);
          }
        });
      }
    }

    // 3. บันทึกสต๊อกที่อัปเดตแล้วกลับลงฐานข้อมูล
    await redis.set('storeSettings', { ...settings, materials: updatedMaterials });

    // 4. บันทึกประวัติการขาย (เพื่อใช้สรุปยอดรายวัน)
    const today = new Date().toISOString().split('T')[0]; // เช่น 2026-03-05
    const saleData = {
      time: new Date().toLocaleTimeString('th-TH'),
      customer: customerInfo.name,
      total: totalPrice,
      cost: orderCost,
      profit: totalPrice - orderCost,
      items: orderDetails
    };
    await redis.lpush(`sales:${today}`, saleData);

    // 5. ส่งแจ้งเตือน LINE (เหมือนเดิม)
    const LINE_TOKEN = (process.env.LINE_TOKEN || '').trim();
    const LINE_USER_ID = (process.env.LINE_USER_ID || '').trim();
    const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    
    let orderText = orderDetails.map(i => `- ${i.name} x ${i.qty}`).join('\n');
    const msg = `🚨 ออเดอร์ใหม่ (ตัดสต๊อกแล้ว) 🚨\n\n👤 ลูกค้า: ${customerInfo.name}\n📞 โทร: ${customerInfo.phone}\n📍 พิกัด: ${mapLink}\n🧭 จุดสังเกต: ${customerInfo.addressDetail || '-'}\n\n📝 รายการ:\n${orderText}\n\n💰 ยอดโอน: ${totalPrice} บาท\n📈 กำไรออเดอร์นี้: ${saleData.profit} บาท`;

    await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_TOKEN}` },
      body: JSON.stringify({ to: LINE_USER_ID, messages: [{ type: 'text', text: msg }, { type: 'image', originalContentUrl: slipImageUrl, previewImageUrl: slipImageUrl }] })
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('ERROR:', e);
    return res.status(500).json({ error: 'ระบบขัดข้อง แต่คุณอาจได้รับแจ้งเตือน LINE แล้ว' });
  }
}
