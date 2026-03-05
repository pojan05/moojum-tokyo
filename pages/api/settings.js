import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

// ข้อมูลตั้งต้นรูปแบบใหม่ แยกวัตถุดิบ กับ เมนูหน้าร้าน ออกจากกัน
const DEFAULT_SETTINGS = {
  promptPay: '0812345678',
  materials: [
    { id: 'mat_pork', name: 'หมูสไลด์', cost: 40, stock: 100, unit: 'ถาด' },
    { id: 'mat_veg', name: 'ชุดผักรวม', cost: 20, stock: 50, unit: 'ชุด' },
    { id: 'mat_egg', name: 'ไข่ไก่', cost: 4, stock: 100, unit: 'ฟอง' },
    { id: 'mat_noodle', name: 'วุ้นเส้น', cost: 5, stock: 100, unit: 'ถุง' },
    { id: 'mat_soup', name: 'น้ำซุป+น้ำจิ้ม', cost: 15, stock: 50, unit: 'ถุง' },
    { id: 'mat_cutlery', name: 'ชุดช้อนตะเกียบ', cost: 2, stock: 200, unit: 'คู่' },
  ],
  menuItems: [
    { 
      id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299, image: '🍲', type: 'main', desc: 'หมูสไลด์นุ่มๆ พร้อมผักรวมและน้ำจิ้มรสเด็ด', isAvailable: true,
      recipe: { mat_pork: 1, mat_veg: 1, mat_egg: 1, mat_noodle: 1, mat_soup: 1, mat_cutlery: 2 } // 1 เซ็ต ตัดสต๊อกตามนี้
    },
    { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true, recipe: { mat_pork: 1 } },
    { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true, recipe: { mat_veg: 1 } },
    { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true, recipe: { mat_egg: 1 } },
    { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true, recipe: { mat_noodle: 1 } },
  ]
};

let memorySettings = DEFAULT_SETTINGS;

async function redisGetSafe() {
  try {
    const data = await redis.get('storeSettings');
    // อัปเดตโครงสร้างเก่าให้เป็นโครงสร้างใหม่ (ถ้ามี)
    if (data && Array.isArray(data.menuItems)) {
      if (!data.materials) data.materials = DEFAULT_SETTINGS.materials;
      return data;
    }
  } catch (e) {
    console.log('Redis not ready');
  }
  return memorySettings;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await redisGetSafe();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const next = { ...DEFAULT_SETTINGS, ...body };
    memorySettings = next;
    try {
      await redis.set('storeSettings', next);
    } catch (e) {
      console.log('Redis save failed');
    }
    return res.status(200).json({ message: 'บันทึกข้อมูลสำเร็จ!', data: next });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
