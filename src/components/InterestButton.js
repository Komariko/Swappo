'use client'

import { useEffect, useState } from "react";
import { db, auth } from "@/firebase/config";
import { addDoc, collection, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

/**
 * InterestButton
 * ปุ่ม “ฉันสนใจสิ่งนี้” สำหรับผู้ชมโพสต์:
 * - บันทึกการแจ้งเตือนไปหาเจ้าของโพสต์ (collection: notifications)
 * - บันทึกคำขอไว้ใต้โพสต์ (subcollection: items/{itemId}/interests/{uid})
 * หมายเหตุ: เจ้าของโพสต์จะไม่เห็นปุ่มนี้
 */
export default function InterestButton({ item }) {
  // กำลังส่ง/ไม่ส่ง (ใช้ป้องกันคลิกซ้ำ)
  const [busy, setBusy] = useState(false);
  // ข้อความสั้น ๆ จากผู้สนใจ (เช่น รายละเอียดการแลก/นัดรับ)
  const [note, setNote] = useState("");
  // uid ผู้ใช้ที่ล็อกอินอยู่ (null = ยังไม่ล็อกอิน)
  const [uid, setUid] = useState(null);

  /* ติดตามสถานะล็อกอิน → เอา uid มาใช้ระบุผู้ส่ง */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub && unsub();
  }, []);

  // ถ้าเป็นเจ้าของโพสต์เอง → ไม่ต้องแสดงปุ่ม
  const isOwner = uid && item?.user_id === uid;
  if (isOwner) return null;

  /* กด “ส่งความสนใจ”:
     1) สร้างเอกสารแจ้งเตือนให้เจ้าของโพสต์
     2) สร้าง/อัปเดตเอกสารใน subcollection interests ของโพสต์นี้
  */
  async function send() {
    // กันกรณียังไม่ล็อกอิน/โพสต์ไม่มี id/กำลังส่งอยู่
    if (!uid) return alert("กรุณาเข้าสู่ระบบเพื่อส่งความสนใจ");
    if (!item?.id) return alert("ไม่พบข้อมูลรายการโพสต์");
    if (busy) return;

    setBusy(true);
    try {
      // (1) เพิ่มแจ้งเตือนไปที่เจ้าของโพสต์
      await addDoc(collection(db, "notifications"), {
        type: "interest",                           // ใช้แยกประเภทแจ้งเตือน
        toUserId: item.user_id,                     // ส่งถึงเจ้าของโพสต์
        fromUserId: uid,                            // ผู้ส่งความสนใจ
        title: "มีผู้สนใจโพสต์ของคุณ",
        body: note || `${item?.item_give || "สิ่งของ"} • ขอเปลี่ยนสถานะเป็น 'กำลังติดต่อ'`,
        itemId: item.id,                            // อ้างอิงโพสต์
        requestedStatus: "contacting",              // สถานะที่ขอให้เจ้าของยืนยัน
        read: false,                                // ยังไม่ได้อ่าน
        handled: false,                             // ยังไม่ได้กดจัดการ
        createdAt: serverTimestamp(),
      });

      // (2) บันทึกคำขอใต้โพสต์ (ใช้ uid เป็น id เอกสาร เพื่อกันซ้ำคนเดิม)
      await setDoc(
        doc(db, "items", item.id, "interests", uid),
        {
          fromUserId: uid,
          note: note || null,
          status: "pending",                        // รอเจ้าของตอบรับ/จัดการ
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNote("");
      alert("ส่งความสนใจไปถึงเจ้าของโพสต์แล้ว");
    } catch (e) {
      console.error(e);
      alert(e?.message || "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      {/* ป้ายกำกับ: อธิบายสั้น ๆ ว่ากล่องนี้ใช้ทำอะไร */}
      <label className="block text-sm font-semibold text-slate-700">
        ข้อความถึงเจ้าของโพสต์ (ไม่บังคับ)
      </label>

      {/* กล่องพิมพ์ข้อความ (จำกัดความยาวเล็กน้อยกันพิมพ์ยาวเกิน) */}
      <textarea
        className="min-h-24 w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="เช่น สนใจแลกกับ... สะดวกนัดรับที่ไหน/ตอนไหน?"
        maxLength={500}
      />

      {/* ปุ่มส่ง: ปิดการกดระหว่าง busy หรือกรณีไม่มีข้อมูลโพสต์ */}
      <button
        onClick={send}
        disabled={busy || !item?.id}
        aria-busy={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-300 bg-white text-rose-700 font-medium shadow-sm hover:bg-rose-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
        title="ส่งความสนใจไปหาเจ้าของโพสต์"
      >
        {busy ? "กำลังส่ง..." : "ฉันสนใจสิ่งนี้ • ส่งถึงเจ้าของโพสต์"}
      </button>
    </div>
  );
}
