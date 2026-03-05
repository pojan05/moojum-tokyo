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

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const data = await kv.get('storeSettings');
      // ถ้ามีข้อมูลในฐานข้อมูลให้ใช้ข้อมูลนั้น
      if (data && Array.isArray(data.menuItems)) {
        return res.status(200).json(data);
      }
      // ถ้าฐานข้อมูลว่างเปล่า ให้ส่งค่าเริ่มต้นไป
      return res.status(200).json(DEFAULT_SETTINGS);
    } catch (e) {
      console.error('KV GET Error:', e);
      return res.status(200).json(DEFAULT_SETTINGS);
    }
  }

  if (req.method === 'POST') {
    try {
      // ตรวจสอบว่า Vercel ส่งกุญแจฐานข้อมูลมาให้หรือยัง
      if (!process.env.KV_REST_API_URL) {
        return res.status(500).json({ message: 'ระบบยังไม่รู้จักฐานข้อมูล กรุณากด Redeploy ใน Vercel 1 ครั้งครับ' });
      }

      const body = req.body || {};
      const next = {
        ...DEFAULT_SETTINGS,
        ...body,
        menuItems: Array.isArray(body.menuItems) ? body.menuItems : DEFAULT_SETTINGS.menuItems,
      };
      
      // บันทึกลงฐานข้อมูลจริง
      await kv.set('storeSettings', next);
      return res.status(200).json({ message: 'บันทึกข้อมูลลงระบบถาวรสำเร็จ!' });
    } catch (e) {
      console.error('KV SET Error:', e);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
