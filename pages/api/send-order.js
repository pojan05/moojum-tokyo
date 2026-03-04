import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // รับเฉพาะคำสั่งแบบ POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerInfo, cart, totalPrice, location, slipImageBase64 } = req.body;

    // 1. ดึงข้อมูลเมนูจากฐานข้อมูล (ถ้าไม่มีให้ใช้ค่าเริ่มต้น)
    const storeData = await kv.get('storeSettings');
    const defaultMenu = [
      { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)' },
      { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)' },
      { id: 'a2', name: 'ชุดผักรวม' },
      { id: 'a3', name: 'ไข่ไก่' },
      { id: 'a4', name: 'วุ้นเส้น' }
    ];
    const menuItems = storeData?.menuItems || defaultMenu;

    // 2. สรุปรายการอาหารที่ลูกค้าสั่ง
    let orderText = '';
    for (const [id, qty] of Object.entries(cart)) {
      const item = menuItems.find(m => m.id === id);
      if (item) orderText += `- ${item.name} x ${qty}\n`;
    }

    // สร้างลิงก์ Google Maps จากพิกัดให้กดง่ายๆ
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

    // 3. จัดหน้าตาข้อความที่จะส่งเข้า LINE
    const lineMessage = `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${customerInfo.name}\n` +
      `📞 โทร: ${customerInfo.phone}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `จุดสังเกต: ${customerInfo.addressDetail || '-'}\n\n` +
      `📝 รายการอาหาร:\n${orderText}\n` +
      `💰 ยอดโอน: ${totalPrice} บาท\n` +
      `(ระบบได้รับสลิปเรียบร้อยแล้ว กรุณาเช็คสลิปในเว็บหลังบ้าน)`;

    // ==========================================
    // 🔑 คีย์ LINE OA ที่คุณให้มา
    // ==========================================
    const LINE_TOKEN = 'Loo6XSt531o9ROy7viys0+hr8B9ObGecih6uq57yjnWkkx29yvr7pnrlvn2nM4EtcSYi3FWxoC0+kYS6E2ekXcpO5imL/7E7OvDgR/GRKlOK0rFuQCu8zrt3h2YY/nVXbqvOd5d6NZ/4FfLvCgIlagdB04t89/1O/w1cDnyilFU=';
    const LINE_USER_ID = 'Ud6d0ed9226ba3154238979aff2f09919';

    // 4. ส่งข้อมูลไปที่ LINE API
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: [{ type: 'text', text: lineMessage }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LINE API Error:', errText);
      return res.status(500).json({ error: 'ไม่สามารถส่งแจ้งเตือน LINE ได้' });
    }

    // ส่งข้อความกลับไปบอกหน้าเว็บว่า "สำเร็จ!"
    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
