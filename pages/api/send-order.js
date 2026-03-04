export default async function handler(req, res) {
  // อนุญาตเฉพาะ POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // ดึงข้อมูลจาก body พร้อมกำหนดค่าเริ่มต้น
    const {
      customerInfo = {},
      cart = {},
      totalPrice = 0,
      location = {},
      slipImageBase64
    } = req.body || {};

    // 1. ดึงเมนูจาก Vercel KV แบบไดนามิก หากไม่สำเร็จจะใช้เมนูตั้งต้น
    let storeData = null;
    try {
      const kvModule = await import('@vercel/kv');
      const kvClient = kvModule.kv || kvModule.default || kvModule;
      storeData = await kvClient.get?.('storeSettings');
    } catch (dbError) {
      console.log('ยังไม่ได้เชื่อมต่อฐานข้อมูล หรือฐานข้อมูลมีปัญหา (กำลังใช้เมนูตั้งต้น)');
    }

    const defaultMenu = [
      { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)' },
      { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)' },
      { id: 'a2', name: 'ชุดผักรวม' },
      { id: 'a3', name: 'ไข่ไก่' },
      { id: 'a4', name: 'วุ้นเส้น' }
    ];
    const menuItems =
      Array.isArray(storeData?.menuItems) && storeData.menuItems.length > 0
        ? storeData.menuItems
        : defaultMenu;

    // 2. สรุปรายการอาหาร
    let orderText = '';
    for (const [id, qty] of Object.entries(cart)) {
      const item = menuItems.find((m) => m.id === id);
      if (item) orderText += `- ${item.name} x ${qty}\n`;
    }

    // 3. สร้างลิงก์แผนที่ หากมี lat/lng
    let mapLink = '-';
    if (
      location &&
      typeof location.lat !== 'undefined' &&
      typeof location.lng !== 'undefined'
    ) {
      mapLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
    }

    // 4. จัดข้อความที่จะส่งไป LINE
    const lineMessage =
      `🚨 มีออเดอร์ใหม่เข้าครับ! 🚨\n\n` +
      `👤 ลูกค้า: ${customerInfo.name || '-'}\n` +
      `📞 โทร: ${customerInfo.phone || '-'}\n` +
      `📍 พิกัด: ${mapLink}\n` +
      `จุดสังเกต: ${customerInfo.addressDetail || '-'}\n\n` +
      `📝 รายการอาหาร:\n${orderText || '-'}\n` +
      `💰 ยอดโอน: ${totalPrice || 0} บาท\n` +
      `(ระบบได้รับสลิปเรียบร้อยแล้ว เช็คสลิปได้ในระบบหลังบ้าน)`;

    // 5. กำหนดคีย์ LINE OA – ควรตั้งผ่าน environment variable ในการใช้งานจริง
    const LINE_TOKEN =
      process.env.LINE_TOKEN ||
      'Loo6XSt531o9ROy7viys0+hr8B9ObGecih6uq57yjnWkkx29yvr7pnrlvn2nM4EtcSYi3FWxoC0+kYS6E2ekXcpO5imL/7E7OvDgR/GRKlOK0rFuQCu8zrt3h2YY/nVXbqvOd5d6NZ/4FfLvCgIlagdB04t89/1O/w1cDnyilFU=';
    const LINE_USER_ID =
      process.env.LINE_USER_ID || 'Ud6d0ed9226ba3154238979aff2f09919';

    // 6. เลือกใช้ fetch ของระบบ หรือ fallback เป็น node-fetch
    let fetchFn = globalThis.fetch;
    if (typeof fetchFn === 'undefined') {
      const nodeFetch = await import('node-fetch');
      fetchFn = nodeFetch.default;
    }

    try {
      const response = await fetchFn('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${LINE_TOKEN}`
        },
        body: JSON.stringify({
          to: LINE_USER_ID,
          messages: [{ type: 'text', text: lineMessage }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LINE API Error:', errorText);
        return res
          .status(500)
          .json({ error: 'ไม่สามารถส่งแจ้งเตือน LINE ได้' });
      }
    } catch (apiError) {
      console.error('Error calling LINE API:', apiError);
      return res.status(500).json({ error: 'ไม่สามารถส่งแจ้งเตือน LINE ได้' });
    }

    // สำเร็จ
    return res.status(200).json({ success: true });
  } catch (error) {
    // error อื่นๆ
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'ระบบเซิร์ฟเวอร์ขัดข้อง' });
  }
}
