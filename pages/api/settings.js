import { Redis } from '@upstash/redis';

// ฉลาดขึ้น: ให้เช็กหาฐานข้อมูลทั้งแบบ Upstash ใหม่ และ Vercel KV เดิม
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const isDatabaseConnected = !!(redisUrl && redisToken);

// ถ้ามีฐานข้อมูลให้เชื่อมต่อ ถ้าไม่มีให้เป็น null
const redis = isDatabaseConnected 
  ? new Redis({ url: redisUrl, token: redisToken }) 
  : null;

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

// ข้อมูลตั้งต้น
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
      recipe: { mat_pork: 1, mat_veg: 1, mat_egg: 1, mat_noodle: 1, mat_soup: 1, mat_cutlery: 2 }
    },
    { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true, recipe: { mat_pork: 1 } },
    { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true, recipe: { mat_veg: 1 } },
    { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true, recipe: { mat_egg: 1 } },
    { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true, recipe: { mat_noodle: 1 } },
  ]
};

let memorySettings = null;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    if (redis) {
      try {
        const data = await redis.get('storeSettings');
        if (data) return res.status(200).json(data);
      } catch (e) {
        console.error('Redis GET Error:', e);
      }
    }
    return res.status(200).json(memorySettings || DEFAULT_SETTINGS);
  }

  if (req.method === 'POST') {
    const body = req.body;
    if (redis) {
      try {
        await redis.set('storeSettings', body);
        memorySettings = body;
        return res.status(200).json({ message: 'บันทึกข้อมูลลงฐานข้อมูลถาวรสำเร็จ!' });
      } catch (e) {
        console.error('Redis SET Error:', e);
        return res.status(500).json({ message: 'ระบบฐานข้อมูลขัดข้อง ไม่สามารถบันทึกได้' });
      }
    } else {
      memorySettings = body;
      return res.status(200).json({ 
        message: '⚠️ บันทึกสำเร็จ (แต่เป็นความจำชั่วคราว เพราะเว็บมองไม่เห็นรหัสผ่านฐานข้อมูล)' 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
