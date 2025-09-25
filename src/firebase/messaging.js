// src/firebase/messaging.js
// หน้าที่ไฟล์นี้: สร้าง/คืนค่า instance ของ Firebase Cloud Messaging (FCM)
// ใช้ตอนเราจะขอโทเคน FCM หรือทำงานที่เกี่ยวกับการแจ้งเตือนแบบ Push ฝั่งเว็บ (เบราว์เซอร์)

import { getMessaging } from 'firebase/messaging';
import { app } from './config';

export const getFirebaseMessaging = () => {
  // ทำงานเฉพาะฝั่งเบราว์เซอร์เท่านั้น (ป้องกัน error ตอนรันบน Server/SSR)
  if (typeof window !== 'undefined') {
    try {
      // ขอ instance ของ Messaging จากแอป Firebase ที่เราสร้างไว้ใน config
      // ถ้าสำเร็จ เราจะเอาไปใช้ร่วมกับ getToken()/onMessage() ต่อได้
      return getMessaging(app);
    } catch (error) {
      // ถ้าเบราว์เซอร์ไม่รองรับ / ยังตั้งค่าไม่ครบ จะเข้ามาที่นี่
      console.error("Firebase Messaging error:", error);
    }
  }
  // กรณี SSR หรือเกิดข้อผิดพลาด ให้คืน null เพื่อให้โค้ดฝั่งผู้เรียกเช็คก่อนใช้งาน
  return null;
};
