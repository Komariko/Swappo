// src/app/admin/users/edit/page.js
import { Suspense } from "react";
import AdminEditItemClient from "./AdminEditItemClient"; 
// ^ ใช้ชื่อไฟล์ที่คุณมีอยู่จริงตอนนี้ (จาก log มี AdminEditItemClient.js ในโฟลเดอร์นี้)

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">กำลังโหลด...</div>}>
      <AdminEditItemClient />
    </Suspense>
  );
}
