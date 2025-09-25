// components/Footer.js
export default function Footer() {
  return (
    // <footer> = ส่วนท้ายของหน้าเว็บ (semantic HTML)
    <footer
      // ใช้คลาสของ Tailwind จัดรูปแบบ:
      // bg-gray-100  = พื้นหลังเทาอ่อน
      // text-center  = จัดข้อความกึ่งกลาง
      // text-sm      = ขนาดตัวอักษรเล็ก
      // text-gray-500= สีตัวอักษรเทากลาง
      // py-6         = เว้นระยะแนวตั้ง (บน/ล่าง) 1.5rem
      // mt-10        = ระยะห่างจากส่วนบน 2.5rem
      // border-t     = เส้นขอบด้านบน
      className="bg-gray-100 text-center text-sm text-gray-500 py-6 mt-10 border-t"
    >
      {/* ข้อความลิขสิทธิ์ที่แสดงในฟุตเตอร์ */}
      © 2025 SWAPPO. All rights reserved.
    </footer>
  );
}
