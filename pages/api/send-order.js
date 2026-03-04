// pages/api/send-order.js
export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const customerInfo = body.customerInfo || {};
    const orderDetails = body.orderDetails || [];
    const location = body.location || null;
    const slipImageUrl = body.slipImageUrl || '';

    // เช็คข้อมูลพื้นฐาน
    const name = String(customerInfo.name || '').trim();
    const phone = String(customerInfo.phone || '').replace(/\D/g, '');

    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้รับ' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง' });
    if (!location || location.lat == null) return res.status(400).json({ error: 'กรุณาแชร์ตำแหน่งที่ตั้ง' });
    if (orderDetails.length === 0) return res.status(400).json({ error: 'ตะกร้าว่าง' });

    const LINE_TOKEN = (process.env.LINE_TOKEN || '').trim();
    const LINE_USER_ID = (process.env.LINE_USER_ID || '').trim();

    if (!LINE_TOKEN || !LINE_USER_ID) {
      return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า LINE_TOKEN ใน Vercel' });
    }

    // สร้างลิงก์เปิดแผนที่ Google Maps โดยตรง
    const mapLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;

    // ดึงชื่อเมนูภาษาไทยที่ส่งมาจากหน้าบ้านมาต่อกัน
    let orderText = '';
    for (const item of orderDetails) {
      if (item.qty > 0) orderText += `- ${item.name} x ${item.qty}\n`;
    }
    orderText = orderText.trim() || '-';

    const addressDetail = String(customerInfo.addressDetail || '').trim() || '-';
    const totalPrice = Number(body.totalPrice || 0);

    const msg = `🚨 มีออเดอร์ใหม่! 🚨\n\n👤 ลูกค้า: ${name}\n📞 โทร: ${phone}\n📍 พิกัด: ${mapLink}\n🧭 จุดสังเกต: ${addressDetail}\n\n📝 รายการ:\n${orderText}\n\n💰 ยอดโอน: ${totalPrice} บาท`;

    const messages = [
      { type: 'text', text: msg } // ส่งข้อความออเดอร์
    ];

    // ถ้ามี URL สลิป ให้ส่งเป็นรูปภาพเข้าไปในแชทด้วย
    if (slipImageUrl) {
      messages.push({
        type: 'image',
        originalContentUrl: slipImageUrl,
        previewImageUrl: slipImageUrl
      });
    }

    // ยิงเข้า LINE
    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_USER_ID,
        messages: messages
      })
    });

    if (!lineRes.ok) {
      const errText = await lineRes.text();
      console.error('LINE PUSH FAIL:', errText);
      return res.status(502).json({ error: 'ส่งแจ้งเตือน LINE ไม่สำเร็จ' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('FATAL ERROR:', e);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
