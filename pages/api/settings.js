// เบื้องต้นเราจะเก็บข้อมูลไว้ในหน่วยความจำของเซิร์ฟเวอร์ (Memory)
let storeData = {
  promptPay: '0812345678',
  menuItems: [
    { id: 'm1', name: 'เซ็ตหมูจุ่ม (ชุดใหญ่)', price: 299, image: '🍲', type: 'main', desc: 'หมูสไลด์นุ่มๆ พร้อมผักรวมและน้ำจิ้มรสเด็ด', isAvailable: true },
    { id: 'a1', name: 'หมูสไลด์ (ถาดเพิ่ม)', price: 89, image: '🥩', type: 'addon', isAvailable: true },
    { id: 'a2', name: 'ชุดผักรวม', price: 49, image: '🥬', type: 'addon', isAvailable: true },
    { id: 'a3', name: 'ไข่ไก่', price: 10, image: '🥚', type: 'addon', isAvailable: true },
    { id: 'a4', name: 'วุ้นเส้น', price: 15, image: '🍜', type: 'addon', isAvailable: true },
  ]
};

export default function handler(req, res) {
  if (req.method === 'GET') {
    // ส่งข้อมูลกลับไปให้หน้าเว็บ
    res.status(200).json(storeData);
  } else if (req.method === 'POST') {
    // รับข้อมูลใหม่จากหน้า Admin มาอัปเดต
    storeData = req.body;
    res.status(200).json({ message: 'อัปเดตข้อมูลสำเร็จ', data: storeData });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
