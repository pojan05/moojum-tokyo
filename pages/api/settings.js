// pages/api/settings.js
import { createClient } from '@vercel/kv';

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

// ดึงกุญแจฐานข้อมูล (รองรับทั้ง Vercel KV ตัวเก่า และ Vercel Redis ตัวใหม่)
const apiUrl = process.env.KV_REST_API_URL || process.env.REDIS_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const apiToken = process.env.KV_REST_API_TOKEN || process.env.REDIS_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// สร้างการเชื่อมต่อฐานข้อมูล
const db = (apiUrl && apiToken) ? createClient({ url: apiUrl, token: apiToken }) : null;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      if (db) {
        const data = await db.get('storeSettings');
        if (data && Array.isArray(data.menuItems)) {
          return res.status(200).json(data);
        }
      }
      return res.status(200).json(DEFAULT_SETTINGS);
    } catch (e) {
      console.error('DB GET Error:', e);
      return res.status(200).json(DEFAULT_SETTINGS);
    }
  }

  if (req.method === 'POST') {
    try {
      if (!db) {
        return res.status(500).json({ message: 'ระบบยังไม่รู้จักฐานข้อมูล (ไม่พบ URL/Token แบบใหม่) กรุณาเช็ค Environment Variables ครับ' });
      }

      const body = req.body || {};
      const next = {
        ...DEFAULT_SETTINGS,
        ...body,
        menuItems: Array.isArray(body.menuItems) ? body.menuItems : DEFAULT_SETTINGS.menuItems,
      };
      
      await db.set('storeSettings', next);
      return res.status(200).json({ message: 'บันทึกข้อมูลลงระบบถาวรสำเร็จ!' });
    } catch (e) {
      console.error('DB SET Error:', e);
      return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกฐานข้อมูล' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
