'use client'

import { useEffect, useMemo, useRef, useState } from "react";
import { db, auth } from "@/firebase/config";
import {
  collection, query, where, orderBy, limit, onSnapshot,
  updateDoc, doc, serverTimestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Bell, Check, CircleX } from "lucide-react";

/* ฟังก์ชันแปลงเวลา → ข้อความ “กี่นาที/ชั่วโมงที่แล้ว” */
function timeAgo(ts){
  const d = ts?.toDate ? ts.toDate() : null;
  if(!d) return "";
  const s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 60) return "เมื่อสักครู่";
  if (s < 3600) return `${Math.floor(s/60)} นาทีที่แล้ว`;
  if (s < 86400) return `${Math.floor(s/3600)} ชม.ที่แล้ว`;
  return `${Math.floor(s/86400)} วันที่แล้ว`;
}

/**
 * NotificationBell
 * ไอคอนกระดิ่ง + กล่องรายการแจ้งเตือน “มีคนสนใจโพสต์”
 * - ดึงแจ้งเตือนเฉพาะของผู้ใช้ที่ล็อกอิน
 * - กด “ยืนยัน” → เปลี่ยนสถานะ item เป็น contacting และปิดแจ้งเตือน
 * - กด “อ่านแล้ว” → ทำเครื่องหมายว่าอ่าน
 */
export default function NotificationBell(){
  /* uid ผู้ใช้ปัจจุบัน (null = ยังไม่ล็อกอิน) */
  const [uid, setUid] = useState(null);

  /* สถานะเปิด/ปิดป็อปโอเวอร์, รายการแจ้งเตือน */
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);

  /* ป้องกันคลิกนอกกรอบแล้วปิดเมนู */
  const menuRef = useRef(null);

  /* ปุ่มกำลังทำงานกับแจ้งเตือน id ไหนอยู่ (กันกดซ้ำ) */
  const [busyId, setBusyId] = useState(null);

  /* 1) ฟังสถานะล็อกอิน → เก็บ uid */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub && unsub();
  }, []);

  /* 2) สมัครฟังแจ้งเตือนของเราแบบเรียลไทม์
        where + orderBy + limit → ถ้าขึ้น error index ให้สร้าง composite index ใน Firestore Console */
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "notifications"),
      where("toUserId", "==", uid),
      where("type", "==", "interest"),
      orderBy("createdAt", "desc"),
      limit(15)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRows(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, [uid]);

  /* 3) คลิกนอกกล่องแล้วปิด */
  useEffect(() => {
    const handle = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  /* จำนวนที่ “ยังไม่ได้อ่านและยังไม่ถูกจัดการ” → ใช้แสดง badge สีแดงบนกระดิ่ง */
  const unread = useMemo(() => rows.filter(r => !r.read && !r.handled).length, [rows]);

  /* ถ้าไม่ล็อกอิน → ไม่ต้องแสดงกระดิ่ง */
  if (!uid) return null;

  /* ทำเป็น “อ่านแล้ว” */
  async function markRead(id) {
    try {
      setBusyId(id);
      await updateDoc(doc(db, "notifications", id), { read: true, readAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      alert(e?.message || "ทำเป็นอ่านแล้วไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  /* ยืนยันเป็น “กำลังติดต่อ” + ปิดแจ้งเตือน */
  async function confirmContacting(n) {
    try {
      if (!n?.itemId) {
        alert("แจ้งเตือนไม่มีรหัสรายการ (itemId)");
        return;
      }
      setBusyId(n.id);

      // 1) อัปเดตสถานะรายการ
      await updateDoc(doc(db, "items", n.itemId), {
        status: "contacting",
        statusUpdatedAt: serverTimestamp(),
      });

      // 2) ปิดแจ้งเตือน (handled + read)
      await updateDoc(doc(db, "notifications", n.id), {
        handled: true,
        read: true,
        handledAt: serverTimestamp(),
      });
    } catch (e) {
      console.error(e);
      alert(e?.message || "ยืนยันไม่สำเร็จ");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* กระดิ่งแจ้งเตือน + ตัวเลขดวงแดง */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-full border bg-white hover:bg-slate-50"
        title="แจ้งเตือน"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5 text-slate-700" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 text-[10px] min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* กล่องรายการแจ้งเตือน */}
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-h-[70vh] overflow-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-50">
          <div className="px-4 py-3 border-b font-semibold">แจ้งเตือน</div>

          <div className="divide-y">
            {rows.length === 0 && (
              <div className="p-4 text-sm text-slate-500">ยังไม่มีแจ้งเตือน</div>
            )}

            {rows.map((n) => (
              <div key={n.id} className="p-3 text-sm flex gap-3 items-start">
                <div className="flex-1">
                  <div className="font-medium text-slate-800">
                    {n.title || "มีผู้สนใจโพสต์ของคุณ"}
                  </div>

                  <div className="text-slate-600 mt-0.5">
                    {n.body || ""}
                  </div>

                  {/* ลิงก์ไปหน้ารายการ (ให้ตรงกับที่ทั้งเว็บใช้: /item?id=...) */}
                  {n.itemId && (
                    <div className="mt-1 text-xs">
                      รายการ:{" "}
                      <a className="text-rose-600 hover:underline" href={`/item?id=${encodeURIComponent(n.itemId)}`}>
                        ดูโพสต์
                      </a>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 mt-1">
                    {timeAgo(n.createdAt)}
                  </div>
                </div>

                {/* ปุ่มจัดการทีละรายการ */}
                <div className="flex flex-col gap-1">
                  {!n.handled && (
                    <button
                      onClick={() => confirmContacting(n)}
                      disabled={busyId === n.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                      title="ยืนยันเป็นกำลังติดต่อ"
                    >
                      <Check className="w-4 h-4" />
                      {busyId === n.id ? "กำลังยืนยัน..." : "ยืนยัน"}
                    </button>
                  )}

                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      disabled={busyId === n.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                      title="ทำเป็นอ่านแล้ว"
                    >
                      <CircleX className="w-4 h-4" /> อ่านแล้ว
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
