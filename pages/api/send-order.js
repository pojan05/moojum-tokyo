// pages/api/send-order.js
import { kv } from '@vercel/kv';

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { customerInfo, cart, totalPrice, location } = req.body;

    // 1. ดึงข้อมูลเมนู (ถ้าฐานข้อมูลมีปัญหา ให้ใช้ค่าเริ่มต้น)
    let menuItems = [
      { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)' },
      { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)' },
      { id: 'a2', name: 'ชุดผักรวม' },
      { id: 'a3', name: 'ไข่ไก่' },
      { id: 'a4', name: 'วุ้นเส้น' }
    ];

    try {
      const storeData = await kv.get('storeSettings');
      if (storeData && storeData.menuItems) {
        menuItems = storeData.menuItems;
      }
    } catch (dbError) {
      console.log('KV connection waiting...');
    }

    // 2. สรุปรายการอาหาร
    let orderDetails = '';
    for (const [id, qty] of Object.entries(cart)) {
      const item = menuItems.find(m => m.id === id);
      if (item) orderDetails += `- ${item.name} x ${qty}\n`;
    }

    // 3. ลิงก์แผนที่ Google Maps (แก้ไขจุดพิมพ์ผิดแล้ว)
    const mapLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

    // 4. ข้อความแจ้งเตือน LINE
    const message = 
      `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${customerInfo.name || '-'}\n` +
      `📞 โทร: ${customerInfo.phone || '-'}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `🧭 จุดสังเกต: ${customerInfo.addressDetail || '-'}\n\n` +
      `📝 รายการ:\n${orderDetails || '-'}\n` +
      `💰 ยอดโอน: ${totalPrice} บาท\n` +
      `✅ ระบบได้รับสลิปแล้ว`;

    // คีย์ LINE ของคุณ (ใส่กลับเข้าโค้ดให้เลยเพื่อความชัวร์)
    const LINE_TOKEN = 'Loo6XSt531o9ROy7viys0+hr8B9ObGecih6uq57yjnWkkx29yvr7pnrlvn2nM4EtcSYi3FWxoC0+kYS6E2ekXcpO5imL/7E7OvDgR/GRKlOK0rFuQCu8zrt3h2YY/nVXbqvOd5d6NZ/4FfLvCgIlagdB04t89/1O/w1cDnyilFU=';
    const LINE_USER_ID = 'Ud6d0ed9226ba3154238979aff2f09919';

    // 5. ส่งเข้า LINE
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: [{ type: 'text', text: message }]
      })
    });

    if (!lineRes.ok) {
      const errorDetail = await lineRes.text();
      console.error('LINE_API_ERROR:', errorDetail);
      return res.status(502).json({ error: 'ส่งแจ้งเตือน LINE ไม่สำเร็จ' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('SERVER_ERROR:', err);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่' });
  }
}
