import Redis from 'ioredis';

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

// ดึง URL จาก Environment Variables ที่ Vercel สร้างให้
const redisUrl = process.env.REDIS_URL;

// สร้างการเชื่อมต่อฐานข้อมูล
const redis = redisUrl ? new Redis(redisUrl) : null;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      if (redis) {
        // ดึงข้อมูลมาแปลงกลับเป็น Object
        const dataStr = await redis.get('storeSettings');
        if (dataStr) {
          const data = JSON.parse(dataStr);
          if (data && Array.isArray(data.menuItems)) {
            return res.status(200).json(data);
          }
        }
      }
      return res.status(200).json(DEFAULT_SETTINGS);
    } catch (e) {
      console.error('Redis GET Error:', e);
      return res.status(200).json(DEFAULT_SETTINGS);
    }
  }

  if (req.method === 'POST') {
    try {
      if (!redis) {
        return res.status(500).json({ message: 'ยังไม่พบ REDIS_URL ใน Environment Variables ครับ' });
      }

      const body = req.body || {};
      const next = {
        ...DEFAULT_SETTINGS,
        ...body,
        menuItems: Array.isArray(body.menuItems) ? body.menuItems : DEFAULT_SETTINGS.menuItems,
      };
      
      // แปลงเป็น String เพื่อบันทึกลงฐานข้อมูล
      await redis.set('storeSettings', JSON.stringify(next));
      return res.status(200).json({ message: 'บันทึกข้อมูลลงระบบถาวรสำเร็จ!' });
    } catch (e) {
      console.error('Redis SET Error:', e);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
