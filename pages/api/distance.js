export default async function handler(req, res) {
  // รับเฉพาะคำสั่ง POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { origins, destinations } = req.body;
  // คีย์ของคุณที่สร้างเมื่อกี้
  const API_KEY = 'AIzaSyCvdvuf8XPzZnhykBI_Ui-E9biYyaG6yvQ'; 
  
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${API_KEY}`;
    const googleRes = await fetch(url);
    const data = await googleRes.json();
    
    // ถ้า Google คำนวณสำเร็จ จะส่งระยะทางกลับมา
    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const distanceMeters = data.rows[0].elements[0].distance.value;
      const distanceKm = distanceMeters / 1000; // แปลงเมตรเป็นกิโลเมตร
      return res.status(200).json({ distance: distanceKm });
    } else {
      return res.status(400).json({ error: 'ไม่สามารถคำนวณเส้นทางได้' });
    }
  } catch (error) {
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Maps' });
  }
}
