// firebase/loadItems.js
// ฟังก์ชันดึงรายการ "items" ทั้งหมดจาก Firestore มาใช้ในหน้าแอป

import { collection, getDocs } from "firebase/firestore";
import { db } from './config';

export async function loadItems() {
  try {
    // 1) อ้างถึงคอลเลกชัน "items" ใน Firestore ของเรา
    //    (คิดซะว่าเหมือนโฟลเดอร์เก็บเอกสารของทุกโพสต์)
    const querySnapshot = await getDocs(collection(db, "items"));

    // 2) เตรียมอาร์เรย์ไว้เก็บผลลัพธ์เป็นรูปแบบที่ React ใช้ง่าย
    const items = [];

    // 3) ไล่ทุกเอกสารในคอลเลกชัน แล้วแปลงเป็น object:
    //    - id: คือรหัสเอกสาร (เอาไว้ใช้เป็น key เวลา render)
    //    - ...doc.data(): เนื้อข้อมูลทั้งหมดของโพสต์นั้น ๆ
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() });
    });

    // 4) คืนอาร์เรย์รายการโพสต์ให้ผู้เรียกนำไปแสดงผลต่อ
    return items;
  } catch (err) {
    // ถ้ามีปัญหา เช่น เน็ตล่ม / สิทธิ์ไม่พอ จะมาเข้าช่องนี้
    console.error("โหลดรายการล้มเหลว:", err);
    // เพื่อไม่ให้หน้าแอปล่ม คืนอาร์เรย์ว่างแทน
    return [];
  }
}
