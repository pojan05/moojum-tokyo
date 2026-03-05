import { kv } from '@vercel/kv';

export const config = {
  api: { bodyParser: { sizeLimit: '1mb' } },
};

const DEFAULT_SETTINGS = {
  promptPay: '0812345678',
  menuItems: [
    { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299, image: '🍲', type: 'main', desc: 'หมูสไลด์นุ่มๆ พร้อมผักรวมและน้ำจิ้มรสเด็ด', isAvailable: true },
    { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true },
    { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true },
    { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true },
    { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true },
  ],
};

// fallback memory เผื่อ KV ยังไม่พร้อม
let memorySettings = DEFAULT_SETTINGS;

async function kvGetSafe() {
  try {
    const data = await kv.get('storeSettings');
    if (data && Array.isArray(data.menuItems)) return data;
  } catch (e) {
    console.log('KV not ready, using memory fallback');
  }
  return memorySettings;
}

async function kvSetSafe(next) {
  memorySettings = next;
  try {
    await kv.set('storeSettings', next);
  } catch (e) {
    console.log('KV set failed, kept in memory fallback');
  }
  return next;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await kvGetSafe();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const next = {
      ...DEFAULT_SETTINGS,
      ...body,
      menuItems: Array.isArray(body.menuItems) ? body.menuItems : DEFAULT_SETTINGS.menuItems,
    };
    const saved = await kvSetSafe(next);
    return res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ', data: saved });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
