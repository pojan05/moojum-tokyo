import { kv } from '@vercel/kv';

export const config = {
  api: {
    // สำคัญมาก: กันสลิป base64 เกิน 1MB (ค่าเริ่มต้น)
    bodyParser: { sizeLimit: '10mb' },
  },
};

// เมนูตั้งต้น (ใช้ตอน KV ใช้ไม่ได้/ยังไม่ตั้งค่า)
const DEFAULT_SETTINGS = {
  promptPay: '0812345678',
  menuItems: [
    { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299, image: '🍲', type: 'main', desc: '', isAvailable: true },
    { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true },
    { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true },
    { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true },
    { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true },
  ],
};

async function getStoreSettingsSafe() {
  try {
    const data = await kv.get('storeSettings');
    if (data && Array.isArray(data.menuItems)) return data;
  } catch (e) {
    // ถ้า KV ไม่ได้ตั้งค่า env ก็จะเข้าตรงนี้
    console.log('KV not ready, fallback to DEFAULT_SETTINGS');
  }
  return DEFAULT_SETTINGS;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildOrderText(cart, menuItems) {
  let text = '';
  for (const [id, qtyRaw] of Object.entries(cart || {})) {
    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const item = menuItems.find((m) => m.id === id);
    if (item) text += `- ${item.name} x ${qty}\n`;
  }
  return text.trim() || '-';
}

function calcTotalFromMenu(cart, menuItems) {
  let sum = 0;
  for (const [id, qtyRaw] of Object.entries(cart || {})) {
    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const item = menuItems.find((m) => m.id === id);
    if (item) sum += Number(item.price || 0) * qty;
  }
  return sum;
}

async function pushLineText({ token, to, text }) {
  // ใส่ timeout กันค้าง
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const resp = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: 'text', text }],
      }),
      signal: controller.signal,
    });

    const bodyText = await resp.text(); // เอาไว้ดู error จาก LINE
    return { ok: resp.ok, status: resp.status, bodyText };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};

    const customerInfo = body.customerInfo || {};
    const cart = body.cart || {};
    const location = body.location || null;
    const slipImageBase64 = body.slipImageBase64 || '';

    // ---------- Validate ----------
    const name = String(customerInfo.name || '').trim();
    const phone = normalizePhone(customerInfo.phone);

    if (!name) return res.status(400).json({ error: 'กรุณากรอกชื่อผู้รับ' });
    if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง (10 หลัก)' });
    if (!location || location.lat == null || location.lng == null) return res.status(400).json({ error: 'กรุณาแชร์ตำแหน่งที่ตั้งสำหรับจัดส่ง' });
    if (!cart || Object.keys(cart).length === 0) return res.status(400).json({ error: 'ตะกร้าว่าง กรุณาเลือกเมนูก่อน' });
    if (!slipImageBase64) return res.status(400).json({ error: 'กรุณาแนบสลิปโอนเงิน' });

    const LINE_TOKEN = process.env.LINE_TOKEN;
    const LINE_USER_ID = process.env.LINE_USER_ID;

    // ถ้ายังไม่ตั้งค่า env ให้ตอบชัด ๆ (จะได้ไม่ขึ้น “เซิร์ฟเวอร์ขัดข้อง” แบบเดาไม่ออก)
    if (!LINE_TOKEN || !LINE_USER_ID) {
      return res.status(500).json({
        error: 'ยังไม่ได้ตั้งค่า LINE_TOKEN หรือ LINE_USER_ID ใน Environment',
      });
    }

    // ---------- Load menu ----------
    const storeSettings = await getStoreSettingsSafe();
    const menuItems = Array.isArray(storeSettings.menuItems) ? storeSettings.menuItems : DEFAULT_SETTINGS.menuItems;

    // ---------- Build message ----------
    const orderText = buildOrderText(cart, menuItems);

    // คำนวณยอดจากฝั่งเซิร์ฟเวอร์ (กันยอดถูกแก้จาก client)
    const serverTotal = calcTotalFromMenu(cart, menuItems);

    const mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${location.lat},${location.lng}`
    )}`;

    const addressDetail = String(customerInfo.addressDetail || '').trim() || '-';

    const lineMessage =
      `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${name}\n` +
      `📞 โทร: ${phone}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `จุดสังเกต: ${addressDetail}\n\n` +
      `📝 รายการอาหาร:\n${orderText}\n\n` +
      `💰 ยอดโอน: ${serverTotal} บาท\n` +
      `✅ แนบสลิปแล้ว (รับไฟล์เรียบร้อย)`;

    // ---------- Send to LINE ----------
    const result = await pushLineText({
      token: LINE_TOKEN,
      to: LINE_USER_ID,
      text: lineMessage,
    });

    if (!result.ok) {
      console.error('LINE API Error:', result.status, result.bodyText);
      return res.status(502).json({
        error: 'ส่งแจ้งเตือน LINE ไม่สำเร็จ',
        // ช่วยให้คุณดูใน Vercel Logs ได้ว่า LINE ตอบอะไร
        status: result.status,
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-order fatal error:', err);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
