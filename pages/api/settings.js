import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export const config = {
  api: { bodyParser: { sizeLimit: '5mb' } },
};

// เพิ่มการตั้งค่าเริ่มต้นสำหรับระบบจัดส่งและโค้ดส่วนลด
const DEFAULT_SETTINGS = {
  promptPay: '0812345678',
  delivery: {
    storeLat: 14.8818, // พิกัดร้านเริ่มต้น (คุณสามารถไปแก้ในหน้า Admin ได้)
    storeLng: 100.4039,
    baseFee: 10,       // ค่าส่งเริ่มต้น (บาท)
    ratePerKm: 8       // ค่าส่งบวกเพิ่มกิโลเมตรละ (บาท)
  },
  discountCodes: [
    { id: 'c1', code: 'FREE100', percent: 100, isActive: true }, // ลดค่าส่ง 100%
    { id: 'c2', code: 'HALF50', percent: 50, isActive: true }    // ลดค่าส่ง 50%
  ],
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
        if (data) {
          const parsedData = JSON.parse(data);
          // อัปเดตโครงสร้างเก่าให้มีฟิลด์ใหม่ (กันกรณีผู้ใช้เก่าไม่มีฟิลด์นี้)
          if (!parsedData.delivery) parsedData.delivery = DEFAULT_SETTINGS.delivery;
          if (!parsedData.discountCodes) parsedData.discountCodes = DEFAULT_SETTINGS.discountCodes;
          return res.status(200).json(parsedData);
        }
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
        await redis.set('storeSettings', JSON.stringify(body));
        memorySettings = body;
        return res.status(200).json({ message: 'บันทึกข้อมูลลงฐานข้อมูลถาวรสำเร็จ!' });
      } catch (e) {
        console.error('Redis SET Error:', e);
        return res.status(500).json({ message: 'ระบบฐานข้อมูลขัดข้อง ไม่สามารถบันทึกได้' });
      }
    } else {
      memorySettings = body;
      return res.status(200).json({ 
        message: '⚠️ บันทึกสำเร็จ (แต่เป็นความจำชั่วคราว เพราะเว็บยังหา REDIS_URL ไม่เจอ)' 
      });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
