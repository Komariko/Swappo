// firebase/authStateHandler.js
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config';

/**
 * ติดตามสถานะการล็อกอินของ Firebase แบบเรียลไทม์
 * - รับ setUser เพื่ออัปเดต state ใน React
 * - คืน “ฟังก์ชันยกเลิกการติดตาม” (unsubscribe) สำหรับใช้ใน useEffect cleanup
 * - ปลอดภัยกับ SSR: ถ้าอยู่ฝั่ง server จะคืน no-op function
 */
export function authStateHandler(setUser) {
  // ถ้ารันบนฝั่ง Server (ไม่มี window) ให้คืน no-op ไปเลย
  if (typeof window === 'undefined') {
    return () => {};
  }

  // เริ่มฟังการเปลี่ยนแปลงสถานะผู้ใช้
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUser(user ?? null); // ถ้าไม่มีผู้ใช้ ให้เป็น null
  });

  // ส่งกลับไว้ให้ผู้เรียกใช้งานใน cleanup
  return unsubscribe;
}
