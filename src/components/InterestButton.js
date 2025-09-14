'use client'
import { useEffect, useState } from "react";
import { db, auth } from "@/firebase/config";
import { addDoc, collection, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function InterestButton({ item }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub && unsub();
  }, []);

  const isOwner = uid && item?.user_id === uid;
  if (isOwner) return null;

  async function send() {
    if (!uid) return alert("กรุณาเข้าสู่ระบบเพื่อส่งความสนใจ");
    if (busy) return;
    setBusy(true);
    try {
      // 1) บันทึกแจ้งเตือนให้เจ้าของ
      await addDoc(collection(db, "notifications"), {
        type: "interest",                // <— ใช้ filter ได้
        toUserId: item.user_id,
        fromUserId: uid,
        title: "มีคนสนใจโพสต์ของคุณ",
        body: note || `${item?.item_give || "สิ่งของ"} • ขอเปลี่ยนสถานะเป็น 'กำลังติดต่อ'`,
        itemId: item.id,                 // <— อ้างอิง item ตรง ๆ
        requestedStatus: "contacting",
        read: false,
        handled: false,
        createdAt: serverTimestamp(),
      });

      // 2) เก็บสถานะคำขอใต้ item (เผื่อใช้แสดง “รอเจ้าของยืนยัน”)
      await setDoc(
        doc(db, "items", item.id, "interests", uid),
        {
          fromUserId: uid,
          note: note || null,
          status: "pending",
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setNote("");
      alert("ส่งความสนใจไปหาเจ้าของโพสต์แล้ว");
    } catch (e) {
      console.error(e);
      alert(e?.message || "ส่งไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="block text-sm font-semibold text-slate-700">
        ส่งข้อความถึงเจ้าของ (ไม่บังคับ)
      </label>
      <textarea
        className="min-h-24 w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300 transition"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="เช่น สนใจแลกกับ... สะดวกนัดรับที่ไหน/ตอนไหน?"
      />
      <button
        onClick={send}
        disabled={busy}
        aria-busy={busy}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-rose-300 bg-white text-rose-700 font-medium shadow-sm hover:bg-rose-50 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? "กำลังส่ง..." : "ฉันสนใจสิ่งนี้ • ส่งไปเจ้าของ"}
      </button>
    </div>
  );
}
