# WIP Daily Delivery Control

เว็บแอปสำหรับใช้ Google Sheet `WIP Production` เป็นฐานข้อมูลของแผนส่งงานรายวันและ dashboard สถานะชิ้นงานราย Part Number

## เปิดใช้งาน

เปิดไฟล์ `index.html` ใน browser ได้โดยตรง หรือรัน local server แล้วเข้า URL ที่แสดง:

```powershell
python -m http.server 8000
```

## แหล่งข้อมูล

- Spreadsheet ID: `1xhv4E6AGuHLXPpkzQjTT5FFIZjmP3wmcUAfuJ1eXKuk`
- Sheet: `automotive part`
- รูปแบบข้อมูล: 1 ชิ้นงานใช้ 2 แถว แถวแรกเป็นข้อมูลหลักและชื่อ process แถวถัดไปเป็นจำนวนค้างของแต่ละ process
- ถ้า browser ดึง Google Sheet โดยตรงไม่ได้ เพราะชีตเป็น private ระบบจะใช้ snapshot ใน `snapshot.js`

## Logic หลัก

- Safety target เริ่มต้นที่ 30% ของ Forecast Jul
- Safety Gap = Safety target - FG after delivery
- เป้าต่อวัน = max(ยอดต้องผลิต, Safety Gap) / วันทำงานที่เหลือ
- ถ้าคอลัมน์วันที่ 1-31 มีตัวเลข ระบบจะแสดงเป็นแผนรายวันจากชีต
- สถานะที่เลือกใน dashboard จะถูกเก็บใน browser local storage
