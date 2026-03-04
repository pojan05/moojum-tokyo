// pages/api/send-order.js
export const config = {
  api: {
    // กันสลิป base64 เกินค่าเริ่มต้น
    bodyParser: { sizeLimit: '12mb' },
  },
};

import https from 'node:https';

// ส่งข้อความไป LINE ด้วย https (ไม่พึ่ง fetch / node-fetch)
function linePush({ token, to, text, timeoutMs = 12000 }) {
  const payload = JSON.stringify({
    to,
    messages: [{ type: 'text', text }],
  });

  return new Promise((resolve) => {
    const req = https.request(
      'https://api.line.me/v2/bot/message/push',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            body: data,
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('LINE_TIMEOUT'));
    });

    req.on('error', (err) => {
      resolve({
        ok: false,
        status: 0,
        body: err?.message || 'LINE_REQUEST_ERROR',
      });
    });

    req.write(payload);
    req.end();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const customerInfo = body.customerInfo || {};
    const cart = body.cart || {};
    const location = body.location || null;
    const slipImageBase64 = body.slipImageBase64 || '';

    // ===== validate ให้แน่น (กันหลุด catch ใหญ่) =====
    const name = String(customerInfo.name || '').trim();
    const phone = String(customerInfo.phone || '').replace(/\D/g, '');

    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้รับ' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)' });
    if (!location || location.lat == null || location.lng == null) return res.status(400).json({ error: 'กรุณาแชร์ตำแหน่งที่ตั้งสำหรับจัดส่ง' });
    if (!cart || typeof cart !== 'object' || Object.keys(cart).length === 0) return res.status(400).json({ error: 'ตะกร้าว่าง กรุณาเลือกเมนูก่อน' });
    if (!slipImageBase64 || typeof slipImageBase64 !== 'string') return res.status(400).json({ error: 'กรุณาแนบสลิปโอนเงิน' });

    // NOTE: LINE ไม่รับ base64 เป็นรูปโดยตรง ต้องเป็น URL (ถ้าจะส่งรูปต้องอัปโหลดไปที่ storage แล้วส่ง URL)
    // ตรงนี้เราจะ “ยืนยันว่ามีสลิป” แล้วส่งเป็นข้อความ

    const LINE_TOKEN = process.env.LINE_TOKEN;      // ต้องตั้งใน Vercel Env
    const LINE_USER_ID = process.env.LINE_USER_ID;  // ต้องตั้งใน Vercel Env

    if (!LINE_TOKEN || !LINE_USER_ID) {
      return res.status(500).json({
        error: 'ยังไม่ได้ตั้งค่า LINE_TOKEN หรือ LINE_USER_ID ใน Environment',
      });
    }

    // สร้างลิงก์แผนที่
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${location.lat},${location.lng}`
    )}`;

    // สรุปรายการแบบไม่ทำให้พัง
    let orderText = '';
    for (const [id, qtyRaw] of Object.entries(cart)) {
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      orderText += `- ${id} x ${qty}\n`; // ถ้าต้องการชื่อเมนูจริง ให้ใช้ settings/KV มาแมพเพิ่มภายหลัง
    }
    orderText = orderText.trim() || '-';

    const addressDetail = String(customerInfo.addressDetail || '').trim() || '-';
    const totalPrice = Number(body.totalPrice || 0);

    const msg =
      `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${name}\n` +
      `📞 โทร: ${phone}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `🧭 จุดสังเกต: ${addressDetail}\n\n` +
      `📝 รายการ:\n${orderText}\n\n` +
      `💰 ยอดโอน: ${totalPrice} บาท\n` +
      `✅ แนบสลิปแล้ว`;

    const result = await linePush({ token: LINE_TOKEN, to: LINE_USER_ID, text: msg });

    if (!result.ok) {
      // ส่ง error ที่อ่านรู้เรื่อง (ไม่ใช่ “เซิร์ฟเวอร์ขัดข้อง” แบบเดา)
      console.error('LINE_PUSH_FAIL', result.status, result.body);
      return res.status(502).json({
        error: `ส่งแจ้งเตือน LINE ไม่สำเร็จ (status ${result.status})`,
      });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('SEND_ORDER_FATAL', e);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
