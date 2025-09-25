import { Suspense } from "react";
import ItemClient from "./ItemClient";

/**
 * ItemSkeleton
 * ---------------------------------------------------------
 * คอมโพเนนต์ “โครงหน้าโหลด (skeleton)” สำหรับหน้าไอเท็ม
 * แสดงกล่องสีเทา ๆ แทนรูป/เนื้อหา ระหว่างที่คอมโพเนนต์ลูกกำลังโหลด
 * เพื่อให้ผู้ใช้เห็นโครงร่างหน้าจอทันที ลดความรู้สึกว่าหน้าค้าง
 */
function ItemSkeleton() {
  return (
    <>
      {/* โครง 2 คอลัมน์: ฝั่งซ้ายเป็นรูปใหญ่ ฝั่งขวาเป็นการ์ดข้อมูล */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* กล่องรูปหลัก (สเกลตัน) */}
        <div className="bg-white h-[520px] rounded-2xl border border-slate-200 shadow animate-pulse" />
        {/* กล่องข้อมูลย่อย (สเกลตัน) */}
        <div className="space-y-4">
          <div className="bg-white h-40 rounded-2xl border border-slate-200 shadow animate-pulse" />
          <div className="bg-white h-48 rounded-2xl border border-slate-200 shadow animate-pulse" />
        </div>
      </main>
    </>
  );
}

/**
 * Page (Server Component)
 * ---------------------------------------------------------
 * ไฟล์หน้านี้เป็น “Server Component” (สังเกตว่าไม่มี "use client")
 * - ทำหน้าที่เป็นเปลือก (shell) และวางขอบเขต <Suspense>
 * - ระหว่างที่ลูกหลาน (ItemClient) “ระงับการเรนเดอร์ชั่วคราว” (suspend)
 *   เช่น รอค่าจาก useSearchParams/navigation หรือโหลดแบบไดนามิก
 *   React จะโชว์ <ItemSkeleton /> แทนชั่วคราว
 *
 * หมายเหตุ: ItemClient เป็น “Client Component” ภายใน ทำงานร่วมกับ Suspense ได้
 */
export default function Page() {
  return (
    // Suspense boundary: แสดง ItemSkeleton ขณะลูกหลานกำลังโหลด/ระงับการเรนเดอร์
    <Suspense fallback={<ItemSkeleton />}>
      <ItemClient />
    </Suspense>
  );
}
