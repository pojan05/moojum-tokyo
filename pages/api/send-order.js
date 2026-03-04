// pages/api/send-order.js
import https from 'node:https';
import { kv } from '@vercel/kv';

export const config = {
  api: {
    // ✅ สำคัญมาก: กันสลิป base64 เกินค่าเริ่มต้น
    bodyParser: { sizeLimit: '12mb' },
  },
};

// ===== LINE: ส่งข้อความ/รูปด้วย https (ไม่พึ่ง fetch) =====
function linePush({ token, to, messages, timeoutMs = 12000 }) {
  const payload = JSON.stringify({ to, messages });

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

    req.setTimeout(timeoutMs, () => req.destroy(new Error('LINE_TIMEOUT')));
    req.on('error', (err) =>
      resolve({ ok: false, status: 0, body: err?.message || 'LINE_REQUEST_ERROR' })
    );

    req.write(payload);
    req.end();
  });
}

// ===== IMG BB upload (ใช้ https) =====
function uploadToImgBB({ apiKey, dataUrl, timeoutMs = 15000 }) {
  return new Promise((resolve) => {
    try {
      // data:image/jpeg;base64,xxxx
      const base64 = String(dataUrl || '').split(',')[1];
      if (!base64) return resolve({ ok: false, url: null, error: 'INVALID_DATAURL' });

      const postData = new URLSearchParams({ image: base64 }).toString();

      const req = https.request(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () => {
            try {
              const json = JSON.parse(body || '{}');
              const url = json?.data?.url || null;
              if (res.statusCode >= 200 && res.statusCode < 300 && url) {
                resolve({ ok: true, url, error: null });
              } else {
                resolve({ ok: false, url: null, error: json?.error?.message || body || 'IMGBB_FAIL' });
              }
            } catch (e) {
              resolve({ ok: false, url: null, error: 'IMGBB_BAD_JSON' });
            }
          });
        }
      );

      req.setTimeout(timeoutMs, () => req.destroy(new Error('IMGBB_TIMEOUT')));
      req.on('error', (err) => resolve({ ok: false, url: null, error: err?.message || 'IMGBB_ERROR' }));
      req.write(postData);
      req.end();
    } catch (e) {
      resolve({ ok: false, url: null, error: 'IMGBB_EXCEPTION' });
    }
  });
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // ✅ กัน req.body เป็น undefined
    const body = req.body || {};
    const customerInfo = body.customerInfo || {};
    const cart = body.cart || {};
    const location = body.location || null;
    const slipImageBase64 = body.slipImageBase64 || '';

    // ===== Validate =====
    const name = String(customerInfo.name || '').trim();
    const phone = normalizePhone(customerInfo.phone);

    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้รับ' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)' });
    if (!location || location.lat == null || location.lng == null) return res.status(400).json({ error: 'กรุณาแชร์ตำแหน่งที่ตั้งสำหรับจัดส่ง' });
    if (!cart || typeof cart !== 'object' || Object.keys(cart).length === 0) return res.status(400).json({ error: 'ตะกร้าว่าง กรุณาเลือกเมนูก่อน' });
    if (!slipImageBase64) return res.status(400).json({ error: 'กรุณาแนบสลิปโอนเงิน' });

    // ✅ ใช้ ENV ตามที่คุณตั้งในรูป
    const LINE_TOKEN = process.env.LINE_ACCESS_TOKEN || process.env.LINE_TOKEN;
    const LINE_USER_ID = process.env.LINE_ADMIN_USER_ID || process.env.LINE_USER_ID;
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

    if (!LINE_TOKEN || !LINE_USER_ID) {
      return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า LINE_ACCESS_TOKEN หรือ LINE_ADMIN_USER_ID ใน Environment' });
    }

    // ===== ดึงเมนูจาก KV (ถ้าล่มก็ยังทำงานได้) =====
    let storeData = null;
    try {
      storeData = await kv.get('storeSettings');
    } catch (e) {
      // ไม่ให้พัง
      storeData = null;
    }

    const defaultMenu = [
      { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299 },
      { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89 },
      { id: 'a2', name: 'ชุดผักรวม', price: 49 },
      { id: 'a3', name: 'ไข่ไก่', price: 10 },
      { id: 'a4', name: 'วุ้นเส้น', price: 15 },
    ];
    const menuItems = Array.isArray(storeData?.menuItems) ? storeData.menuItems : defaultMenu;

    // ===== สรุปรายการ =====
    let orderText = '';
    let serverTotal = 0;
    for (const [id, qtyRaw] of Object.entries(cart)) {
      const qty = Number(qtyRaw);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const item = menuItems.find((m) => m.id === id);
      if (item) {
        orderText += `- ${item.name} x ${qty}\n`;
        serverTotal += Number(item.price || 0) * qty;
      } else {
        orderText += `- ${id} x ${qty}\n`;
      }
    }
    orderText = orderText.trim() || '-';

    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${location.lat},${location.lng}`
    )}`;

    const addressDetail = String(customerInfo.addressDetail || '').trim() || '-';

    // ===== อัปโหลดสลิป (ถ้ามี IMGBB_API_KEY) =====
    let slipUrl = null;
    if (IMGBB_API_KEY) {
      const up = await uploadToImgBB({ apiKey: IMGBB_API_KEY, dataUrl: slipImageBase64 });
      if (!up.ok) {
        console.error('IMGBB_UPLOAD_FAIL:', up.error);
        return res.status(502).json({ error: 'อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่' });
      }
      slipUrl = up.url;
    }

    // ===== ส่งเข้า LINE =====
    let lineMessage =
      `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${name}\n` +
      `📞 โทร: ${phone}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `🧭 จุดสังเกต: ${addressDetail}\n\n` +
      `📝 รายการอาหาร:\n${orderText}\n\n` +
      `💰 ยอดโอน: ${serverTotal} บาท\n`;

    if (slipUrl) lineMessage += `🧾 สลิป: ${slipUrl}\n`;

    // 1) ส่งข้อความ
    const r1 = await linePush({
      token: LINE_TOKEN,
      to: LINE_USER_ID,
      messages: [{ type: 'text', text: lineMessage }],
    });

    if (!r1.ok) {
      console.error('LINE_TEXT_FAIL:', r1.status, r1.body);
      return res.status(502).json({ error: `ส่งเข้า LINE ไม่สำเร็จ (status ${r1.status})` });
    }

    // 2) ส่งรูปสลิป (ถ้ามี URL)
    if (slipUrl) {
      const r2 = await linePush({
        token: LINE_TOKEN,
        to: LINE_USER_ID,
        messages: [
          { type: 'image', originalContentUrl: slipUrl, previewImageUrl: slipUrl },
        ],
      });

      if (!r2.ok) {
        console.error('LINE_IMAGE_FAIL:', r2.status, r2.body);
        return res.status(502).json({ error: `ส่งรูปสลิปเข้า LINE ไม่สำเร็จ (status ${r2.status})` });
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('SEND_ORDER_FATAL:', err);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
